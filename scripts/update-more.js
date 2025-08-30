#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');
const { pipeline } = require('stream/promises');
const { createWriteStream } = require('fs');

// Configuration
const CSV_DIR = '/Users/mekot/mcp-files/timmeko-dot-com/PORTFOLIO CSVs';
const SITE_DIR = path.join(__dirname, '..');
const IMG_RAW_DIR = path.join(SITE_DIR, 'img', 'raw');
const MORE_DIR = path.join(SITE_DIR, 'src', 'more');

// Ensure directories exist
async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

// Parse CSV content
function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const row = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || '';
    });
    return row;
  });
}

// Download or copy image
async function downloadImage(imageUrl, filename) {
  const outputPath = path.join(IMG_RAW_DIR, filename);
  
  // Check if file already exists
  try {
    await fs.access(outputPath);
    console.log(`  ↳ Image already exists: ${filename}`);
    return filename;
  } catch {
    // File doesn't exist, proceed with download/copy
  }
  
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    // Download from web
    console.log(`  ↳ Downloading: ${imageUrl}`);
    const client = imageUrl.startsWith('https://') ? https : http;
    
    return new Promise((resolve, reject) => {
      client.get(imageUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${imageUrl}`));
          return;
        }
        
        const writeStream = createWriteStream(outputPath);
        response.pipe(writeStream);
        
        writeStream.on('finish', () => {
          console.log(`  ✓ Downloaded: ${filename}`);
          resolve(filename);
        });
        
        writeStream.on('error', reject);
      }).on('error', reject);
    });
  } else {
    // Copy from local path
    try {
      await fs.copyFile(imageUrl, outputPath);
      console.log(`  ✓ Copied: ${filename}`);
      return filename;
    } catch (error) {
      console.error(`  ✗ Failed to copy ${imageUrl}:`, error.message);
      throw error;
    }
  }
}

// Get image filename from URL or path
function getImageFilename(imagePath, slug) {
  if (!imagePath) return null;
  
  const urlPath = imagePath.split('/').pop();
  const ext = path.extname(urlPath) || '.jpg';
  const basename = path.basename(urlPath, ext) || slug;
  
  return `${slug}-${basename}${ext}`;
}

// Create or update markdown file
async function createMarkdownFile(item, localImagePath) {
  const filename = `${item.slug}.md`;
  const filepath = path.join(MORE_DIR, filename);
  
  const frontMatter = [
    '---',
    `title: "${item.title}"`,
    `slug: ${item.slug}`,
    `date: ${item.date || ''}`,
    `hero: /img/raw/${localImagePath}`,
    `link: ${item.link || ''}`,
    `section: more`,
    `summary: "${item.summary || ''}"`,
    '---'
  ].join('\n');
  
  await fs.writeFile(filepath, frontMatter + '\n');
  console.log(`  ✓ Created: src/more/${filename}`);
}

// Main function
async function updateMoreContent() {
  console.log('🚀 Starting update-more script...\n');
  
  // Ensure directories exist
  await ensureDir(IMG_RAW_DIR);
  await ensureDir(MORE_DIR);
  
  try {
    // Read all CSV files
    const files = await fs.readdir(CSV_DIR);
    const csvFiles = files.filter(f => f.endsWith('.csv'));
    
    if (csvFiles.length === 0) {
      console.log('❌ No CSV files found in:', CSV_DIR);
      return;
    }
    
    console.log(`📁 Found ${csvFiles.length} CSV file(s):`);
    csvFiles.forEach(f => console.log(`  - ${f}`));
    console.log();
    
    let allItems = [];
    
    // Process each CSV file
    for (const csvFile of csvFiles) {
      console.log(`📄 Processing: ${csvFile}`);
      const csvPath = path.join(CSV_DIR, csvFile);
      const content = await fs.readFile(csvPath, 'utf8');
      const rows = parseCSV(content);
      
      // Filter for "more" section items that should be included
      const moreItems = rows.filter(row => 
        row.section === 'more' && 
        parseInt(row.include) === 1 &&
        row.slug
      );
      
      console.log(`  ↳ Found ${moreItems.length} "more" items to include`);
      allItems.push(...moreItems);
    }
    
    if (allItems.length === 0) {
      console.log('\n✨ No "more" items found with include=1');
      return;
    }
    
    console.log(`\n🎯 Processing ${allItems.length} "more" items:\n`);
    
    // Process each item
    for (const item of allItems) {
      console.log(`📝 ${item.title}`);
      
      // Determine image source (try 'image' field first, then 'hero')
      const imageSource = item.image || item.hero;
      
      if (imageSource) {
        try {
          const imageFilename = getImageFilename(imageSource, item.slug);
          const localImagePath = await downloadImage(imageSource, imageFilename);
          await createMarkdownFile(item, localImagePath);
        } catch (error) {
          console.error(`  ✗ Error processing image for ${item.slug}:`, error.message);
          // Create markdown file without image
          await createMarkdownFile(item, '');
        }
      } else {
        console.log('  ↳ No image found, creating without hero image');
        await createMarkdownFile(item, '');
      }
      
      console.log();
    }
    
    console.log('✅ Update complete!\n');
    console.log('📂 Files created/updated in:');
    console.log(`  - ${path.relative(process.cwd(), IMG_RAW_DIR)}/`);
    console.log(`  - ${path.relative(process.cwd(), MORE_DIR)}/`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  updateMoreContent();
}

module.exports = { updateMoreContent };