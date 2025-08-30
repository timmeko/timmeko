#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { generateImageFilename, getUniqueFilename } = require('./image-utils');

/**
 * Rename existing hash-named images to their proper descriptive names
 * This fixes the disconnect between what markdown expects vs what exists
 */

const BASE_DIR = path.join(__dirname, '..');
const IMG_RAW_DIR = path.join(BASE_DIR, 'img', 'raw');
const IMG_OPTIMIZED_DIR = path.join(BASE_DIR, 'img', 'optimized');
const CSV_DIR = '/Users/mekot/mcp-files/timmeko-dot-com/PORTFOLIO CSVs';

// Parse CSV
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

// Generate what the hash filename would be (old logic)
function getHashFilename(url) {
    const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 12);
    return `wapo-${hash}.jpg`;
}

// Rename file in all locations (raw + optimized)
async function renameImageEverywhere(oldName, newName) {
    const locations = [
        { dir: IMG_RAW_DIR, name: 'raw' },
        { dir: path.join(IMG_OPTIMIZED_DIR, 'thumb'), name: 'thumb' },
        { dir: path.join(IMG_OPTIMIZED_DIR, 'full'), name: 'full' }
    ];
    
    let renamedCount = 0;
    
    for (const location of locations) {
        const oldPath = path.join(location.dir, oldName);
        const newPath = path.join(location.dir, newName);
        
        try {
            await fs.access(oldPath);
            // File exists, rename it
            await fs.rename(oldPath, newPath);
            console.log(`    ✅ Renamed in ${location.name}/: ${oldName} → ${newName}`);
            renamedCount++;
        } catch (e) {
            // File doesn't exist in this location, that's fine
        }
    }
    
    return renamedCount > 0;
}

// Main function
async function renameHashedImages() {
    console.log('🏷️  Renaming hash-based images to descriptive names...\n');
    
    // Read CSV files to build URL-to-filename mapping
    const csvFiles = await fs.readdir(CSV_DIR);
    const urlToProperName = new Map();
    
    for (const csvFile of csvFiles) {
        if (!csvFile.endsWith('.csv')) continue;
        
        console.log(`📄 Reading: ${csvFile}`);
        const csvPath = path.join(CSV_DIR, csvFile);
        const content = await fs.readFile(csvPath, 'utf8');
        const rows = parseCSV(content);
        
        for (const row of rows) {
            if (row.include === '1' && row.image) {
                const originalName = generateImageFilename(row.image);
                urlToProperName.set(row.image, originalName);
            }
        }
    }
    
    console.log(`\n🎯 Found ${urlToProperName.size} images to potentially rename\n`);
    
    let renamedFiles = 0;
    let skippedFiles = 0;
    
    // Process each URL mapping
    for (const [url, properName] of urlToProperName) {
        const hashName = getHashFilename(url);
        
        console.log(`🔍 ${properName}`);
        console.log(`    Looking for: ${hashName}`);
        
        // Check if hash file exists anywhere
        const hashExists = await fs.access(path.join(IMG_RAW_DIR, hashName)).then(() => true).catch(() => false) ||
                          await fs.access(path.join(IMG_OPTIMIZED_DIR, 'thumb', hashName)).then(() => true).catch(() => false);
        
        if (!hashExists) {
            console.log(`    ↳ Hash file not found, skipping`);
            skippedFiles++;
            continue;
        }
        
        // Check if proper name already exists
        const properExists = await fs.access(path.join(IMG_RAW_DIR, properName)).then(() => true).catch(() => false);
        
        let finalName = properName;
        if (properExists) {
            // Handle collision
            finalName = await getUniqueFilename(properName, IMG_RAW_DIR, fs);
            console.log(`    ⚠️ Collision detected, using: ${finalName}`);
        }
        
        // Rename everywhere
        const renamed = await renameImageEverywhere(hashName, finalName);
        if (renamed) {
            renamedFiles++;
        } else {
            skippedFiles++;
        }
        
        console.log('');
    }
    
    console.log(`📊 SUMMARY:`);
    console.log(`✅ Renamed: ${renamedFiles} images`);
    console.log(`↳ Skipped: ${skippedFiles} images`);
    console.log(`\n✅ Image renaming complete!`);
    console.log(`\n💡 Next steps:`);
    console.log(`1. Run: npm run fix-paths    (update markdown files)`);
    console.log(`2. Run: npm run dev          (see changes live)`);
}

// Export
module.exports = { renameHashedImages };

// Run if called directly
if (require.main === module) {
    renameHashedImages().catch(console.error);
}
