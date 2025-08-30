#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { generateImageFilename } = require('./image-utils');

/**
 * Fix the hero column in portfolio_combined.csv by extracting proper filenames
 * from the image column URLs (handling imrs.php correctly)
 */

const CSV_PATH = '/Users/mekot/mcp-files/timmeko-dot-com/2025-v2/data/portfolio_combined.csv';

// Parse CSV content
function parseCSV(content) {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const rows = lines.slice(1).map(line => {
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
    
    return { headers, rows };
}

// Convert row back to CSV line
function rowToCSVLine(row, headers) {
    const values = headers.map(header => {
        let value = row[header] || '';
        // Quote values that contain commas or quotes
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    });
    return values.join(',');
}

// Main function
async function fixHeroColumn() {
    console.log('🔧 Fixing hero column in portfolio_combined.csv...\n');
    
    // Read the CSV file
    const content = await fs.readFile(CSV_PATH, 'utf8');
    const { headers, rows } = parseCSV(content);
    
    console.log(`📊 Found ${rows.length} rows to process\n`);
    
    let updated = 0;
    let skipped = 0;
    
    // Process each row
    for (const row of rows) {
        const imageUrl = row.image;
        
        if (!imageUrl || imageUrl === 'image') {
            console.log(`⏭️  Skipping row with no image: ${row.Headline || 'Unknown'}`);
            skipped++;
            continue;
        }
        
        // Generate proper filename from image URL
        const properFilename = generateImageFilename(imageUrl);
        const currentHero = row.hero;
        
        console.log(`📝 ${row.Headline}`);
        console.log(`   Image URL: ${imageUrl}`);
        console.log(`   Generated filename: ${properFilename}`);
        console.log(`   Current hero: ${currentHero || '(empty)'}`);
        
        // Update the hero column
        row.hero = properFilename;
        updated++;
        console.log(`   ✅ Updated hero to: ${properFilename}\n`);
    }
    
    // Write the corrected CSV back
    const updatedCSV = [
        headers.join(','),
        ...rows.map(row => rowToCSVLine(row, headers))
    ].join('\n');
    
    await fs.writeFile(CSV_PATH, updatedCSV, 'utf8');
    
    console.log(`📊 SUMMARY:`);
    console.log(`✅ Updated: ${updated} rows`);
    console.log(`⏭️  Skipped: ${skipped} rows`);
    console.log(`\n✅ Hero column fixed!`);
    console.log(`\n💡 Next steps:`);
    console.log(`1. Your CSV now has correct hero filenames`);
    console.log(`2. Run: npm run csv-to-md`);
    console.log(`3. Run: npm run download-images`);
    console.log(`4. Run: npm run dev`);
}

// Export
module.exports = { fixHeroColumn };

// Run if called directly
if (require.main === module) {
    fixHeroColumn().catch(console.error);
}
