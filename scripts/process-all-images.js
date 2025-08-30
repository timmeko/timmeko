#!/usr/bin/env node

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

/**
 * Comprehensive Image Processing for timmeko.com 2025-v2
 * 
 * This script handles ALL image sources:
 * 1. CSV files (WapoClips_updated.csv, flickr_portfolio.csv) 
 * 2. Existing markdown files (featured, insights, editing)
 * 3. Downloads external images, copies local images
 * 4. Updates all references to use local paths
 */

// Configuration
const BASE_DIR = '/Users/mekot/mcp-files/timmeko-dot-com/2025-v2';
const CSV_SOURCE_DIR = '/Users/mekot/mcp-files/timmeko-dot-com/PORTFOLIO CSVs';
const SRC_DIR = path.join(BASE_DIR, 'src');
const IMG_DIR = path.join(BASE_DIR, 'img');
const RAW_IMG_DIR = path.join(IMG_DIR, 'raw');
const PROCESSED_IMG_DIR = path.join(IMG_DIR, 'processed');

// Create necessary directories
async function ensureDirectories() {
    await fs.mkdir(IMG_DIR, { recursive: true });
    await fs.mkdir(RAW_IMG_DIR, { recursive: true });
    await fs.mkdir(PROCESSED_IMG_DIR, { recursive: true });
    console.log('📁 Created image directories');
}

// Download external image
function downloadImage(url, localPath) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https://') ? https : http;
        
        console.log(`   ⬇️  Downloading: ${path.basename(localPath)}`);
        
        const request = client.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                return downloadImage(response.headers.location, localPath);
            }
            
            if (response.statusCode !== 200) {
                console.log(`   ❌ HTTP ${response.statusCode}: ${url}`);
                resolve(false);
                return;
            }
            
            const file = fsSync.createWriteStream(localPath);
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                console.log(`   ✅ Downloaded: ${path.basename(localPath)}`);
                resolve(true);
            });
            
            file.on('error', (err) => {
                console.log(`   ❌ Download failed: ${err.message}`);
                resolve(false);
            });
        });
        
        request.on('error', (err) => {
            console.log(`   ❌ Request failed: ${err.message}`);
            resolve(false);
        });
        
        request.setTimeout(15000, () => {
            request.destroy();
            console.log(`   ❌ Timeout: ${url}`);
            resolve(false);
        });
    });
}

// Copy local image file
async function copyLocalImage(sourcePath, destPath) {
    try {
        // Check if source exists
        await fs.access(sourcePath);
        await fs.copyFile(sourcePath, destPath);
        console.log(`   📋 Copied: ${path.basename(destPath)}`);
        return true;
    } catch (error) {
        console.log(`   ❌ Copy failed: ${sourcePath} - ${error.message}`);
        return false;
    }
}

// Generate safe filename from URL or path
function generateSafeFilename(imagePath, fallbackName = 'image') {
    let filename;
    
    if (imagePath.startsWith('http')) {
        try {
            const url = new URL(imagePath);
            const pathname = url.pathname;
            const basename = path.basename(pathname);
            
            if (basename && basename.includes('.')) {
                filename = basename;
            } else {
                // Create hash-based filename
                const hash = crypto.createHash('md5').update(imagePath).digest('hex').substring(0, 8);
                filename = `external-${hash}.jpg`;
            }
        } catch (err) {
            const hash = crypto.createHash('md5').update(imagePath).digest('hex').substring(0, 8);
            filename = `external-${hash}.jpg`;
        }
    } else {
        // Local path
        filename = path.basename(imagePath);
        if (!filename.includes('.')) {
            filename += '.jpg';
        }
    }
    
    // Clean filename
    filename = filename
        .replace(/[^a-zA-Z0-9.-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
        
    return filename;
}

// Parse CSV with proper quote handling
function parseCSV(content) {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    
    return lines.slice(1).map(line => {
        const values = [];
        let currentValue = '';
        let insideQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
                values.push(currentValue.replace(/^"|"$/g, '').trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue.replace(/^"|"$/g, '').trim());
        
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        
        return row;
    });
}

// Process images from CSV data
async function processCSVImages() {
    console.log('\n📊 Processing CSV Images...');
    
    const csvFiles = [
        path.join(CSV_SOURCE_DIR, 'WapoClips_updated.csv'),
        path.join(CSV_SOURCE_DIR, 'flickr_portfolio.csv')
    ];
    
    const imageUpdates = new Map();
    
    for (const csvFile of csvFiles) {
        try {
            const content = await fs.readFile(csvFile, 'utf-8');
            const data = parseCSV(content);
            
            console.log(`\n📄 Processing ${path.basename(csvFile)} (${data.length} rows)`);
            
            for (const row of data) {
                // Only process rows with include == 1
                if (row.include !== '1') continue;
                
                const imageField = row.hero || row.image;
                if (!imageField) continue;
                
                const safeFilename = generateSafeFilename(imageField, row.title || row.Headline);
                const localPath = path.join(RAW_IMG_DIR, safeFilename);
                const relativePath = `img/raw/${safeFilename}`;
                
                // Check if we already processed this image
                if (imageUpdates.has(imageField)) {
                    continue;
                }
                
                let success = false;
                
                if (imageField.startsWith('http')) {
                    success = await downloadImage(imageField, localPath);
                } else {
                    // Handle local file paths
                    let fullPath = imageField;
                    if (!path.isAbsolute(imageField)) {
                        // Try various possible locations
                        const possiblePaths = [
                            path.join('/Users/mekot/mcp-files/timmeko-dot-com', imageField),
                            path.join('/Users/mekot/mcp-files/timmeko-dot-com/flickr', path.basename(imageField)),
                            path.join('/Users/mekot/mcp-files/timmeko-dot-com/wp', imageField)
                        ];
                        
                        for (const tryPath of possiblePaths) {
                            try {
                                await fs.access(tryPath);
                                fullPath = tryPath;
                                break;
                            } catch (e) {
                                // Continue trying
                            }
                        }
                    }
                    
                    success = await copyLocalImage(fullPath, localPath);
                }
                
                if (success) {
                    imageUpdates.set(imageField, relativePath);
                }
            }
            
        } catch (error) {
            console.log(`❌ Error processing ${csvFile}: ${error.message}`);
        }
    }
    
    console.log(`\n📊 CSV Images Summary: ${imageUpdates.size} images processed`);
    return imageUpdates;
}

// Extract image references from markdown content
function extractImageReferences(content) {
    const images = [];
    
    // Match ![alt](path) patterns
    const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)(?:\s+"[^"]*")?\)/g;
    let match;
    
    while ((match = markdownImageRegex.exec(content)) !== null) {
        images.push({
            fullMatch: match[0],
            alt: match[1],
            src: match[2].split(' ')[0].trim(),
            isExternal: match[2].startsWith('http')
        });
    }
    
    // Match frontmatter hero images
    const heroImageRegex = /^hero:\s*["']?([^"'\n]+)["']?$/m;
    const heroMatch = content.match(heroImageRegex);
    
    if (heroMatch) {
        images.push({
            fullMatch: heroMatch[0],
            alt: 'hero image',
            src: heroMatch[1].trim(),
            isExternal: heroMatch[1].startsWith('http'),
            isHero: true
        });
    }
    
    return images;
}

// Process images from existing markdown files
async function processMarkdownImages() {
    console.log('\n📝 Processing Markdown Images...');
    
    const sectionsToProcess = ['maps', 'insights', 'editing'];
    const imageUpdates = new Map();
    
    for (const section of sectionsToProcess) {
        const sectionDir = path.join(SRC_DIR, section);
        
        try {
            const files = await fs.readdir(sectionDir);
            const markdownFiles = files.filter(f => f.endsWith('.md'));
            
            console.log(`\n📂 Section: ${section} (${markdownFiles.length} files)`);
            
            for (const mdFile of markdownFiles) {
                const filePath = path.join(sectionDir, mdFile);
                const content = await fs.readFile(filePath, 'utf-8');
                const images = extractImageReferences(content);
                
                if (images.length === 0) continue;
                
                console.log(`  📄 ${mdFile} - ${images.length} images`);
                let updatedContent = content;
                
                for (const img of images) {
                    if (imageUpdates.has(img.src)) {
                        // Already processed this image
                        const localPath = imageUpdates.get(img.src);
                        
                        if (img.isHero) {
                            updatedContent = updatedContent.replace(img.fullMatch, `hero: "${localPath}"`);
                        } else {
                            updatedContent = updatedContent.replace(img.fullMatch, `![${img.alt}](${localPath})`);
                        }
                        continue;
                    }
                    
                    const safeFilename = generateSafeFilename(img.src);
                    const localPath = path.join(RAW_IMG_DIR, safeFilename);
                    const relativePath = `img/raw/${safeFilename}`;
                    
                    let success = false;
                    
                    if (img.isExternal) {
                        success = await downloadImage(img.src, localPath);
                    } else {
                        // Handle local paths - try various locations
                        let fullPath = img.src;
                        
                        if (!path.isAbsolute(img.src)) {
                            const possiblePaths = [
                                path.join(BASE_DIR, img.src),
                                path.join('/Users/mekot/mcp-files/timmeko-dot-com', img.src),
                                path.join('/Users/mekot/mcp-files/timmeko-dot-com/wp', img.src),
                                path.join('/Users/mekot/mcp-files/timmeko-dot-com/flickr', path.basename(img.src))
                            ];
                            
                            for (const tryPath of possiblePaths) {
                                try {
                                    await fs.access(tryPath);
                                    fullPath = tryPath;
                                    break;
                                } catch (e) {
                                    // Continue trying
                                }
                            }
                        }
                        
                        success = await copyLocalImage(fullPath, localPath);
                    }
                    
                    if (success) {
                        imageUpdates.set(img.src, relativePath);
                        
                        // Update content with local path
                        if (img.isHero) {
                            updatedContent = updatedContent.replace(img.fullMatch, `hero: "${relativePath}"`);
                        } else {
                            updatedContent = updatedContent.replace(img.fullMatch, `![${img.alt}](${relativePath})`);
                        }
                    }
                }
                
                // Write updated markdown file
                await fs.writeFile(filePath, updatedContent, 'utf-8');
            }
            
        } catch (error) {
            console.log(`❌ Error processing section ${section}: ${error.message}`);
        }
    }
    
    console.log(`\n📝 Markdown Images Summary: ${imageUpdates.size} images processed`);
    return imageUpdates;
}

// Copy local image with error handling
async function copyLocalImage(sourcePath, destPath) {
    try {
        await fs.access(sourcePath);
        await fs.copyFile(sourcePath, destPath);
        console.log(`   📋 Copied: ${path.basename(destPath)}`);
        return true;
    } catch (error) {
        console.log(`   ❌ Copy failed: ${sourcePath}`);
        return false;
    }
}

// Create image inventory report
async function createImageInventory(csvUpdates, markdownUpdates) {
    const allUpdates = new Map([...csvUpdates, ...markdownUpdates]);
    
    const inventory = {
        total: allUpdates.size,
        external: 0,
        local: 0,
        sections: {
            csv: csvUpdates.size,
            markdown: markdownUpdates.size
        }
    };
    
    for (const [original, local] of allUpdates) {
        if (original.startsWith('http')) {
            inventory.external++;
        } else {
            inventory.local++;
        }
    }
    
    const inventoryPath = path.join(BASE_DIR, 'image-inventory.json');
    await fs.writeFile(inventoryPath, JSON.stringify(inventory, null, 2));
    
    return inventory;
}

// Main processing function
async function main() {
    console.log('🖼️  COMPREHENSIVE IMAGE PROCESSING');
    console.log('===================================');
    console.log(`Base directory: ${BASE_DIR}`);
    console.log(`CSV source: ${CSV_SOURCE_DIR}`);
    console.log(`Image destination: ${IMG_DIR}`);
    
    try {
        // Setup
        await ensureDirectories();
        
        // Process images from CSV files
        const csvUpdates = await processCSVImages();
        
        // Process images from existing markdown files
        const markdownUpdates = await processMarkdownImages();
        
        // Create inventory
        const inventory = await createImageInventory(csvUpdates, markdownUpdates);
        
        console.log('\n📊 FINAL SUMMARY');
        console.log('================');
        console.log(`Total images processed: ${inventory.total}`);
        console.log(`External downloads: ${inventory.external}`);
        console.log(`Local copies: ${inventory.local}`);
        console.log(`From CSVs: ${inventory.sections.csv}`);
        console.log(`From markdown: ${inventory.sections.markdown}`);
        
        console.log('\n✅ Image processing complete!');
        console.log('\n🚀 Next steps:');
        console.log('1. Run: npm run csv-to-md');
        console.log('2. Run: npm run optimize-images (if needed)');  
        console.log('3. Run: npm run build:quick');
        
    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

// Export functions for use by other scripts
module.exports = {
    main,
    downloadImage,
    copyLocalImage,
    generateSafeFilename,
    extractImageReferences,
    processCSVImages,
    processMarkdownImages
};

// Run if called directly
if (require.main === module) {
    main();
}
