#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Fix broken image paths by finding what images actually exist
 * Don't rename files - just update markdown to point to correct locations
 */

const BASE_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(BASE_DIR, 'src');
const IMG_DIR = path.join(BASE_DIR, 'img');
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

// Generate hash filename (what actually exists)
function getHashFilename(url) {
    const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 12);
    return `wapo-${hash}.jpg`;
}

// Find where an image actually exists
async function findActualImagePath(imageUrl) {
    if (!imageUrl) return null;
    
    // Try different filename variations
    const possibleNames = [];
    
    // 1. Hash-based name (what likely exists)
    if (imageUrl.startsWith('http')) {
        possibleNames.push(getHashFilename(imageUrl));
    }
    
    // 2. Original filename from URL
    try {
        const urlPath = new URL(imageUrl).pathname;
        const originalName = path.basename(urlPath);
        if (originalName && originalName !== 'imrs.jpg') {
            possibleNames.push(originalName);
        }
    } catch (e) {
        // Not a URL
    }
    
    // 3. If it's a local path, just the basename
    if (imageUrl.startsWith('/Users/')) {
        possibleNames.push(path.basename(imageUrl));
    }
    
    // Search in order of preference: optimized thumb, optimized full, raw
    const searchDirs = [
        { path: path.join(IMG_DIR, 'optimized', 'thumb'), prefix: 'img/optimized/thumb' },
        { path: path.join(IMG_DIR, 'optimized', 'full'), prefix: 'img/optimized/full' },
        { path: path.join(IMG_DIR, 'raw'), prefix: 'img/raw' }
    ];
    
    for (const filename of possibleNames) {
        for (const dir of searchDirs) {
            try {
                const fullPath = path.join(dir.path, filename);
                await fs.access(fullPath);
                return `${dir.prefix}/${filename}`;
            } catch (e) {
                // Not found here
            }
        }
    }
    
    return null;
}

// Create URL-to-actual-path mapping from CSVs
async function buildImageMapping() {
    console.log('📊 Building image mapping from CSV files...\n');
    
    const csvFiles = await fs.readdir(CSV_DIR);
    const mapping = new Map();
    
    for (const csvFile of csvFiles) {
        if (!csvFile.endsWith('.csv')) continue;
        
        console.log(`📄 Reading: ${csvFile}`);
        const csvPath = path.join(CSV_DIR, csvFile);
        const content = await fs.readFile(csvPath, 'utf8');
        const rows = parseCSV(content);
        
        for (const row of rows) {
            if (row.include === '1' && row.image) {
                const actualPath = await findActualImagePath(row.image);
                if (actualPath) {
                    mapping.set(row.image, actualPath);
                    console.log(`  ✅ ${path.basename(actualPath)} → ${actualPath}`);
                } else {
                    console.log(`  ❌ Not found: ${row.image}`);
                }
            }
        }
    }
    
    console.log(`\n🎯 Built mapping for ${mapping.size} images\n`);
    return mapping;
}

// Extract hero image from markdown
function extractHeroImage(content) {
    const heroMatch = content.match(/^hero:\s*["']?([^"'\n]+)["']?$/m);
    return heroMatch ? heroMatch[1].trim() : null;
}

// Update hero image in content
function updateHeroImage(content, oldPath, newPath) {
    const oldHeroRegex = new RegExp(`^hero:\\s*["']?${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']?$`, 'm');
    return content.replace(oldHeroRegex, `hero: "${newPath}"`);
}

// Find all markdown files
async function findMarkdownFiles(dir) {
    const files = [];
    
    async function scanDir(currentDir) {
        try {
            const entries = await fs.readdir(currentDir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                
                if (entry.isDirectory() && !entry.name.startsWith('.')) {
                    await scanDir(fullPath);
                } else if (entry.name.endsWith('.md')) {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            // Skip directories we can't read
        }
    }
    
    await scanDir(dir);
    return files;
}

// Main function
async function fixImagePaths() {
    console.log('🔧 Fixing image paths to point to actual existing files...\n');
    
    // Build mapping from CSV URLs to actual file locations
    const imageMapping = await buildImageMapping();
    
    // Process all markdown files
    const markdownFiles = await findMarkdownFiles(SRC_DIR);
    let fixed = 0;
    let skipped = 0;
    
    for (const filePath of markdownFiles) {
        const relativePath = path.relative(SRC_DIR, filePath);
        const content = await fs.readFile(filePath, 'utf8');
        const heroPath = extractHeroImage(content);
        
        if (!heroPath) {
            continue; // No hero image
        }
        
        console.log(`📝 ${relativePath}`);
        console.log(`    Current: ${heroPath}`);
        
        // Check if current path exists
        try {
            const currentFullPath = path.join(BASE_DIR, heroPath);
            await fs.access(currentFullPath);
            console.log(`    ✅ Image exists, no change needed`);
            skipped++;
            continue;
        } catch (e) {
            // Image missing, try to find it
        }
        
        // Look for this image in our mapping (by URL)
        let newPath = null;
        for (const [url, actualPath] of imageMapping) {
            // Try to match by comparing expected filename with what we have
            const expectedName = path.basename(heroPath);
            const actualName = path.basename(actualPath);
            
            if (actualName === expectedName || url.includes(expectedName.replace(/\.[^.]+$/, ''))) {
                newPath = actualPath;
                break;
            }
        }
        
        // If not found in mapping, try direct search
        if (!newPath) {
            const expectedFilename = path.basename(heroPath);
            newPath = await findActualImagePath(expectedFilename);
        }
        
        if (newPath) {
            const updatedContent = updateHeroImage(content, heroPath, newPath);
            await fs.writeFile(filePath, updatedContent, 'utf8');
            console.log(`    ✅ Fixed: ${heroPath} → ${newPath}`);
            fixed++;
        } else {
            console.log(`    ❌ Image not found anywhere`);
        }
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`✅ Fixed: ${fixed} files`);
    console.log(`↳ Already correct: ${skipped} files`);
    console.log(`\n✅ Image path fixing complete!`);
}

// Export
module.exports = { fixImagePaths };

// Run if called directly
if (require.main === module) {
    fixImagePaths().catch(console.error);
}
