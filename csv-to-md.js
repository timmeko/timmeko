#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

// Configuration
const CSV_DIR = path.join(__dirname, '../PORTFOLIO CSVs');
const SRC_DIR = path.join(__dirname, 'src');

// Featured slugs (exactly 6) - these get tagged as flagship
const FEATURED_SLUGS = [
  'election-winds-sand-map',
  'wicked-weather', 
  'infrastructure',
  'north-korea-targets',
  'covid-double',
  'global-migration-patterns'
];

// Helper function to create slug from title
function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-')          // Replace multiple hyphens with single
    .trim();
}

// Helper function to route items to appropriate section
function routeToSection(item) {
  const title = item.Headline.toLowerCase();
  const description = (item.description || '').toLowerCase();
  
  // Check if it's a featured item
  const slug = createSlug(item.Headline);
  if (FEATURED_SLUGS.includes(slug)) {
    return 'maps';
  }
  
  // Simple routing logic based on content
  if (title.includes('editing') || title.includes('edit')) {
    return 'editing';
  }
  
  if (title.includes('talk') || title.includes('presentation') || 
      title.includes('conference') || title.includes('article')) {
    return 'insights';
  }
  
  // Map-related keywords -> maps section
  if (title.includes('map') || title.includes('tracking') || 
      title.includes('satellite') || title.includes('geography') ||
      description.includes('map') || description.includes('geographic')) {
    return 'maps';
  }
  
  // Everything else goes to 'more'
  return 'more';
}

// Helper function to parse date
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // Try various date formats
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/,  // MM/DD/YY or MM/DD/YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{2,4})$/,    // MM-DD-YY or MM-DD-YYYY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,      // YYYY-MM-DD
    /^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/ // DD-MMM-YY format
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let year, month, day;
      
      if (format === formats[3]) { // DD-MMM-YY format
        const months = {
          'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
          'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
        };
        day = parseInt(match[1]);
        month = months[match[2].toLowerCase()] || 1;
        year = parseInt(match[3]);
      } else if (format === formats[2]) { // YYYY-MM-DD
        year = parseInt(match[1]);
        month = parseInt(match[2]);
        day = parseInt(match[3]);
      } else { // MM/DD/YY or MM-DD-YY formats
        month = parseInt(match[1]);
        day = parseInt(match[2]);
        year = parseInt(match[3]);
      }
      
      // Handle 2-digit years
      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }
      
      return new Date(year, month - 1, day);
    }
  }
  
  return null;
}

// Helper function to create front matter
function createFrontMatter(item, section) {
  const slug = createSlug(item.Headline);
  const date = parseDate(item.Date);
  const isFeature = FEATURED_SLUGS.includes(slug);
  
  let frontMatter = {
    title: `"${item.Headline}"`,
    slug: `"${slug}"`,
  };
  
  if (date) {
    frontMatter.date = date.toISOString().split('T')[0];
  }
  
  // Section-specific fields
  if (section === 'maps') {
    frontMatter.tags = isFeature ? `["maps", "flagship"]` : `["maps"]`;
    frontMatter.hero = `"${item.image || ''}"`;
    frontMatter.links = `[]`;
  } else if (section === 'editing') {
    frontMatter.tags = `["editing"]`;
    frontMatter.hero = `"${item.image || ''}"`;
    frontMatter.link = `"${item.url || ''}"`;
  } else if (section === 'insights') {
    frontMatter.tags = `["insights"]`;
    frontMatter.type = `"article"`; // Default to article, could be enhanced
    frontMatter.external = `"${item.url || ''}"`;
    frontMatter.summary = `"${(item.description || '').replace(/"/g, '\\"')}"`;
  } else { // more
    frontMatter.tags = `["more"]`;
    frontMatter.hero = `"${item.image || ''}"`;
    if (item.url) {
      frontMatter.link = `"${item.url}"`;
    }
  }
  
  return frontMatter;
}

// Helper function to write markdown file
function writeMarkdownFile(item, section) {
  const slug = createSlug(item.Headline);
  const frontMatter = createFrontMatter(item, section);
  const filePath = path.join(SRC_DIR, section, `${slug}.md`);
  
  // Check if file already exists
  if (fs.existsSync(filePath)) {
    console.log(`Skipping existing file: ${filePath}`);
    return;
  }
  
  // Create front matter string
  let frontMatterStr = '---\n';
  for (const [key, value] of Object.entries(frontMatter)) {
    frontMatterStr += `${key}: ${value}\n`;
  }
  frontMatterStr += '---\n';
  
  // Add body content
  let body = '';
  if (section === 'maps' && FEATURED_SLUGS.includes(slug)) {
    body = '\n<!-- TODO after interview (role, technique, impact). -->';
  } else if (section === 'insights' || section === 'editing') {
    // External links don't need body content
    body = '';
  } else {
    body = '\n<!-- Content to be added -->';
  }
  
  const content = frontMatterStr + body;
  
  // Ensure directory exists
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  
  // Write file
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Created: ${filePath}`);
}

// Main processing function
async function processCSVs(fetchImages = false) {
  console.log('Starting CSV ingestion...');
  
  if (fetchImages) {
    console.log('Note: --fetch flag provided but image download is not implemented yet');
  }
  
  // Get all CSV files in the directory
  const csvFiles = fs.readdirSync(CSV_DIR).filter(file => file.endsWith('.csv'));
  
  for (const csvFile of csvFiles) {
    console.log(`\nProcessing ${csvFile}...`);
    const csvPath = path.join(CSV_DIR, csvFile);
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    
    // Parse CSV
    const parsed = Papa.parse(csvContent, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      delimitersToGuess: [',', '\t', '|', ';']
    });
    
    if (parsed.errors.length > 0) {
      console.error(`Errors parsing ${csvFile}:`, parsed.errors);
      continue;
    }
    
    console.log(`Found ${parsed.data.length} rows in ${csvFile}`);
    
    // Process each row
    let processedCount = 0;
    for (const item of parsed.data) {
      // Check if item should be included
      if (item.include !== 1 && item.include !== '1') {
        continue;
      }
      
      // Skip if no title
      if (!item.Headline) {
        console.log('Skipping item with no headline');
        continue;
      }
      
      // Route to appropriate section
      const section = routeToSection(item);
      
      try {
        writeMarkdownFile(item, section);
        processedCount++;
      } catch (error) {
        console.error(`Error processing "${item.Headline}":`, error.message);
      }
    }
    
    console.log(`Processed ${processedCount} items from ${csvFile}`);
  }
  
  console.log('\nCSV ingestion complete!');
}

// Check for command line arguments
const args = process.argv.slice(2);
const fetchImages = args.includes('--fetch');

// Run the processing
processCSVs(fetchImages).catch(console.error);