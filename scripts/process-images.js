#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');
const { generateImageFilename } = require('./image-utils');

/**
 * Comprehensive image processing for timmeko.com 2025-v2
 * 
 * This script:
 * 1. Reads CSV files from PORTFOLIO CSVs directory
 * 2. Processes only rows where include == 1
 * 3. Downloads external images (WaPo URLs) to local directory
 * 4. Copies local images from flickr directory to site's img directory
 * 5. Updates all markdown files with correct local paths
 * 6. Creates a consistent img/ directory structure
 */

const BASE_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(BASE_DIR, 'src');
const IMG_DIR = path.join(BASE_DIR, 'img');
const RAW_IMG_DIR = path.join(IMG_DIR, 'raw'); 
const CSV_DIR = '/Users/mekot/mcp-files/timmeko-dot-com/PORTFOLIO CSVs';
const FLICKR_DIR = '/Users/mekot/mcp-files/timmeko-dot-com/flickr';

// Ensure directories exist
async function ensureDirectories() {
    await fs.mkdir(IMG_DIR, { recursive: true });
    await fs.mkdir(RAW_IMG_DIR, { recursive: true });
}

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

// Simple CSV line parser (handles quoted fields with commas)
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
    
    result.push(current); // Add the last field
    return result.map(field => field.replace(/^"|"$/g, '')); // Remove surrounding quotes
}

// Download file from URL with better headers and error handling
function downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https://') ? https : http;
        
        // Parse URL to get proper options
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        };
        
        const request = client.request(options, (response) => {
            // Handle redirects
            if (response.statusCode === 301 || response.statusCode === 302) {
                return downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
            }
            
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${url}`));
                return;
            }
            
            const file = require('fs').createWriteStream(filepath);
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve();
            });
            
            file.on('error', (err) => {
                file.close();
                reject(err);
            });
        });
        
        request.on('error', reject);
        request.setTimeout(20000, () => {
            request.destroy();
            reject(new Error(`Timeout: ${url}`));
        });
        
        request.end();
    });
}

// Add delay between downloads to avoid rate limiting
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Use corrected filename generation that handles imrs.php URLs
function generateFilename(url, originalName = '') {
    return generateImageFilename(url);
}

// Copy file from source to destination
async function copyFile(sourcePath, destPath) {
    try {
        await fs.copyFile(sourcePath, destPath);
        return true;
    } catch (error) {
        console.error(`Failed to copy ${sourcePath}: ${error.message}`);
        return false;
    }
}

// Process CSV images with error resilience
async function processCSVImages() {
    console.log('📊 Processing CSV images...\n');
    
    const csvFiles = await fs.readdir(CSV_DIR);
    const imageMap = new Map(); // Track processed images to avoid duplicates
    let downloadErrors = 0;
    
    for (const csvFile of csvFiles) {
        if (!csvFile.endsWith('.csv')) continue;
        
        console.log(`Processing: ${csvFile}`);
        const csvPath = path.join(CSV_DIR, csvFile);
        const content = await fs.readFile(csvPath, 'utf-8');
        const rows = parseCSV(content);
        
        for (const row of rows) {
            // Only process if include == 1
            if (row.include !== '1') continue;
            
            const imageUrl = row.image;
            if (!imageUrl) continue;
            
            // Skip if already processed
            if (imageMap.has(imageUrl)) {
                console.log(`  ↳ Already processed: ${path.basename(imageUrl)}`);
                continue;
            }
            
            let localPath, relativePath;
            
            if (imageUrl.startsWith('http')) {
                // External image - download it with error handling
                const filename = generateFilename(imageUrl);
                localPath = path.join(RAW_IMG_DIR, filename);
                relativePath = `img/raw/${filename}`;
                
                try {
                    // Check if already exists
                    await fs.access(localPath);
                    console.log(`  ↳ Exists: ${filename}`);
                } catch (e) {
                    console.log(`  ↳ Downloading: ${imageUrl}`);
                    try {
                        await delay(1000); // 1 second delay between downloads
                        await downloadFile(imageUrl, localPath);
                        console.log(`    ✅ Downloaded: ${filename}`);
                    } catch (downloadError) {
                        console.log(`    ⚠️ Failed to download: ${downloadError.message}`);
                        downloadErrors++;
                        // Continue processing other images
                        continue;
                    }
                }
                
            } else if (imageUrl.startsWith('/Users/mekot/mcp-files/timmeko-dot-com/flickr/')) {
                // Local flickr image - copy it
                const filename = path.basename(imageUrl);
                localPath = path.join(RAW_IMG_DIR, filename);
                relativePath = `img/raw/${filename}`;
                
                try {
                    await fs.access(localPath);
                    console.log(`  ↳ Already copied: ${filename}`);
                } catch (e) {
                    console.log(`  ↳ Copying: ${filename}`);
                    const success = await copyFile(imageUrl, localPath);
                    if (success) {
                        console.log(`    ✅ Copied: ${filename}`);
                    }
                }
                
            } else {
                console.log(`  ⚠️  Unrecognized image path: ${imageUrl}`);
                continue;
            }
            
            imageMap.set(imageUrl, relativePath);
        }
    }
    
    console.log(`\n✅ Processed ${imageMap.size} unique images from CSVs`);
    if (downloadErrors > 0) {
        console.log(`⚠️ ${downloadErrors} images failed to download (server errors, etc.)`);
    }
    console.log('');
    return imageMap;
}

// Extract image references from markdown
function extractImageReferences(content) {
    const images = [];
    
    // Match ![alt](path) and ![alt](path "title") patterns
    const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+?)(?:\s+"[^"]*")?\)/g;
    let match;
    
    while ((match = markdownImageRegex.exec(content)) !== null) {
        const src = match[2].trim();
        images.push({
            fullMatch: match[0],
            alt: match[1],
            src: src,
            isExternal: src.startsWith('http')
        });
    }
    
    // Match frontmatter hero images
    const heroImageRegex = /^hero:\s*["']?([^"'\n]+)["']?$/m;
    const heroMatch = content.match(heroImageRegex);
    
    if (heroMatch) {
        const src = heroMatch[1].trim();
        images.push({
            fullMatch: heroMatch[0],
            alt: 'hero image',
            src: src,
            isExternal: src.startsWith('http'),
            isHero: true
        });
    }
    
    return images;
}

// Process markdown files with error resilience
async function processMarkdownFiles(csvImageMap) {
    console.log('📝 Processing markdown files...\n');
    
    const markdownFiles = await findMarkdownFiles(SRC_DIR);
    let fileErrors = 0;
    
    for (const filePath of markdownFiles) {
        console.log(`Processing: ${path.relative(BASE_DIR, filePath)}`);
        
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const images = extractImageReferences(content);
            
            if (images.length === 0) {
                console.log(`  ↳ No images found`);
                continue;
            }
            
            let updatedContent = content;
            let hasChanges = false;
            
            for (const img of images) {
                let newPath = null;
                
                if (img.isExternal) {
                    // Download external image with error handling
                    const filename = generateFilename(img.src);
                    const localPath = path.join(RAW_IMG_DIR, filename);
                    const relativePath = `img/raw/${filename}`;
                    
                    try {
                        // Check if exists, if not download
                        await fs.access(localPath);
                        console.log(`    ↳ Exists: ${filename}`);
                    } catch (e) {
                        console.log(`    ↳ Downloading: ${img.src}`);
                        try {
                            await delay(1500); // 1.5 second delay between downloads
                            await downloadFile(img.src, localPath);
                            console.log(`      ✅ Downloaded: ${filename}`);
                        } catch (downloadError) {
                            console.log(`      ⚠️ Failed to download: ${downloadError.message}`);
                            // Continue with other images, don't update this path
                            continue;
                        }
                    }
                    
                    newPath = relativePath;
                    
                } else if (img.src.startsWith('/Users/mekot/mcp-files/timmeko-dot-com/flickr/')) {
                    // Copy from flickr directory
                    const filename = path.basename(img.src);
                    const localPath = path.join(RAW_IMG_DIR, filename);
                    const relativePath = `img/raw/${filename}`;
                    
                    try {
                        await fs.access(localPath);
                        console.log(`    ↳ Already copied: ${filename}`);
                    } catch (e) {
                        console.log(`    ↳ Copying: ${filename}`);
                        const success = await copyFile(img.src, localPath);
                        if (success) {
                            console.log(`      ✅ Copied: ${filename}`);
                        }
                    }
                    
                    newPath = relativePath;
                    
                } else if (img.src.startsWith('img/wp-articles/')) {
                    // Convert old wp-articles paths to raw directory
                    const filename = path.basename(img.src);
                    newPath = `img/raw/${filename}`;
                    
                    console.log(`    ↳ Updated path: ${img.src} → ${newPath}`);
                }
                
                // Update content if we have a new path
                if (newPath && newPath !== img.src) {
                    if (img.isHero) {
                        updatedContent = updatedContent.replace(img.fullMatch, `hero: "${newPath}"`);
                    } else {
                        const newImageMarkdown = `![${img.alt}](${newPath})`;
                        updatedContent = updatedContent.replace(img.fullMatch, newImageMarkdown);
                    }
                    hasChanges = true;
                }
            }
            
            // Write updated content if there were changes
            if (hasChanges) {
                await fs.writeFile(filePath, updatedContent, 'utf-8');
                console.log(`    ✅ Updated file`);
            }
            
        } catch (fileError) {
            console.log(`    ❌ Error processing file: ${fileError.message}`);
            fileErrors++;
        }
    }
    
    if (fileErrors > 0) {
        console.log(`\n⚠️ ${fileErrors} files had processing errors but build continues`);
    }
}

// Find all markdown files recursively
async function findMarkdownFiles(dir) {
    const files = [];
    
    async function scanDir(currentDir) {
        try {
            const entries = await fs.readdir(currentDir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                
                if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                    await scanDir(fullPath);
                } else if (entry.name.endsWith('.md') || entry.name.endsWith('.njk')) {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            console.log(`  ⚠️ Error reading directory ${currentDir}: ${error.message}`);
        }
    }
    
    await scanDir(dir);
    return files;
}

// Format date for frontmatter
function formatDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // Handle various date formats
    try {
        // Try parsing as-is first
        let date = new Date(dateStr);
        
        // If invalid, try other formats
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

// Main execution with graceful error handling
async function main() {
    console.log('🖼️  Starting comprehensive image processing...\n');
    
    let success = true;
    
    try {
        // Ensure directories exist
        await ensureDirectories();
        
        // Process CSV images first
        const csvImageMap = await processCSVImages();
        
        // Process all markdown files
        await processMarkdownFiles(csvImageMap);
        
        console.log('\n🎉 Image processing complete!');
        console.log('✅ Images processed successfully (some downloads may have failed due to server errors)');
        console.log('\nNext steps:');
        console.log('1. Eleventy dev server will now start');
        console.log('2. Visit http://localhost:8080 to review the site');
        console.log('3. Run `npm run optimize-images` later to create AVIF+JPEG versions');
        
    } catch (error) {
        console.error('❌ Critical error:', error.message);
        console.log('⚠️  Continuing with build anyway...');
        success = false;
    }
    
    // Don't exit with error - let Eleventy continue
    process.exit(0);
}

// Export for testing
module.exports = { 
    main, 
    processCSVImages, 
    processMarkdownFiles,
    parseCSV,
    generateFilename,
    formatDate
};

// Run if called directly
if (require.main === module) {
    main();
}
