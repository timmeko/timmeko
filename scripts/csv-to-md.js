#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

/**
 * CSV to Markdown converter for timmeko.com 2025-v2
 * 
 * Reads from single master CSV file: data/portfolio_combined.csv
 * Creates markdown files in appropriate sections (featured, editing, more, insights)
 * Only processes rows where include == 1
 */

const BASE_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(BASE_DIR, 'src');
const CSV_FILE = path.join(BASE_DIR, 'data', 'portfolio_combined.csv');

// Parse CSV content
function parseCSV(content) {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] ? values[index].trim() : '';
        });
        return row;
    });
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result.map(field => field.replace(/^"|"$/g, ''));
}

// Generate slug from title
function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Format date for frontmatter
function formatDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    try {
        let date = new Date(dateStr);
        
        if (isNaN(date.getTime())) {
            // Try MM/DD/YY format
            if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
                const [month, day, year] = dateStr.split('/');
                const fullYear = parseInt(year) > 30 ? `19${year}` : `20${year}`;
                date = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
            }
            // Try DD-Mon-YY format
            else if (dateStr.match(/^\d{1,2}-[A-Za-z]{3}-\d{2}$/)) {
                const [day, month, year] = dateStr.split('-');
                const monthNum = new Date(`${month} 1, 2000`).getMonth() + 1;
                const fullYear = parseInt(year) > 30 ? `19${year}` : `20${year}`;
                date = new Date(`${fullYear}-${monthNum.toString().padStart(2, '0')}-${day.padStart(2, '0')}`);
            }
        }
        
        return isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : date.toISOString().split('T')[0];
    } catch (e) {
        return new Date().toISOString().split('T')[0];
    }
}

// Determine section for content
function determineSection(row) {
    const { section } = row;
    
    // Use explicit section from CSV if provided
    if (section && section.trim()) {
        return section.toLowerCase().trim();
    }
    
    // Default to more for items without explicit section
    return 'more';
}

// Build proper optimized image path from hero filename
function buildHeroPath(heroFilename) {
    if (!heroFilename || heroFilename.trim() === '') {
        return ''; // No hero image
    }
    
    const cleanFilename = heroFilename.trim();
    
    // Skip problematic placeholders
    if (cleanFilename === 'imrs.php' || cleanFilename === 'img/raw/imrs.php' || cleanFilename.includes('imrs.php')) {
        return '';
    }
    
    // Build optimized thumb path (preferred for card layouts)
    return `img/optimized/thumb/${cleanFilename}`;
}

// Main CSV processing function
async function processCSV() {
    console.log('📄 Converting master CSV to markdown...\n');
    
    try {
        const content = await fs.readFile(CSV_FILE, 'utf-8');
        const rows = parseCSV(content);
        
        // Filter included rows
        const includedRows = rows.filter(row => row.include === '1');
        console.log(`Found ${includedRows.length} included rows from ${rows.length} total\n`);
        
        let createdCount = 0;
        let skippedCount = 0;
        
        // Process each row
        for (const row of includedRows) {
            const slug = generateSlug(row.title || row.Headline);
            const section = determineSection(row);
            
            // Skip if this would overwrite an existing featured project
            const featuredSlugs = [
                'election-winds-sand-map',
                'covid-double', 
                'wicked-weather',
                'infrastructure',  
                'north-korea-targets'
            ];
            
            if (section === 'featured' && featuredSlugs.includes(slug)) {
                console.log(`⭐ Skipping protected featured project: ${slug}`);
                skippedCount++;
                continue;
            }
            
            // Create markdown file path
            const markdownPath = path.join(SRC_DIR, section, `${slug}.md`);
            
            // Check if file already exists with substantial content
            try {
                const existingContent = await fs.readFile(markdownPath, 'utf-8');
                if (existingContent.length > 500 && !existingContent.includes('<!-- Content to be added -->')) {
                    console.log(`  ↳ Skipping existing detailed content: ${slug}`);
                    skippedCount++;
                    continue;
                }
            } catch (e) {
                // File doesn't exist, proceed with creation
            }
            
            // Build hero path from CSV hero column
            const heroPath = buildHeroPath(row.hero);
            
            // Create frontmatter
            const title = row.title || row.Headline;
            const tags = section === 'insights' ? [section, 'article'] : [section];
            
            // Create markdown content based on section
            let markdownContent;
            
            if (section === 'insights') {
                // Insights are link-out only
                markdownContent = `---
title: "${title.replace(/"/g, '\\"')}"
date: ${formatDate(row.Date)}
link: "${row.url}"
type: "article"
tags: ${JSON.stringify(tags)}
layout: page
---`;
                
            } else {
                // Full card layout for other sections
                const heroLine = heroPath ? `hero: "${heroPath}"` : `# hero: "" # No image available`;
                
                markdownContent = `---
title: "${title.replace(/"/g, '\\"')}"
date: ${formatDate(row.Date)}
${heroLine}
link: "${row.url}"
tags: ${JSON.stringify(tags)}
layout: page
---

${row.description || '<!-- Content to be added -->'}

**[View project →](${row.url})**  
*Published: ${formatDate(row.Date)} | The Washington Post*
`;
            }
            
            try {
                // Ensure section directory exists
                await fs.mkdir(path.join(SRC_DIR, section), { recursive: true });
                
                // Write markdown file
                await fs.writeFile(markdownPath, markdownContent, 'utf-8');
                
                const imageStatus = heroPath ? '✅' : '⚠️ ';
                const imageNote = heroPath ? '' : ' (no image)';
                console.log(`${imageStatus} Created: ${section}/${slug}.md${imageNote}`);
                createdCount++;
                
            } catch (error) {
                console.error(`❌ Failed to create ${slug}.md: ${error.message}`);
            }
        }
        
        console.log(`\n📊 Summary:`);
        console.log(`  ✅ Created: ${createdCount} files`);
        console.log(`  ⏭️  Skipped: ${skippedCount} files`);
        console.log(`  📁 Total processed: ${includedRows.length} rows`);
        console.log('\n✅ Master CSV processing complete!');
        
    } catch (error) {
        console.error(`❌ Failed to process CSV file: ${error.message}`);
        process.exit(1);
    }
}

// Export functions
module.exports = {
    processCSV,
    parseCSV,
    generateSlug,
    formatDate,
    determineSection,
    buildHeroPath
};

// Run if called directly
if (require.main === module) {
    processCSV().catch(console.error);
}
