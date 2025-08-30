#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');
const { generateImageFilename } = require('./image-utils');

/**
 * One-time image download script for timmeko.com 2025-v2
 * 
 * Downloads images from:
 * 1. CSV files (WaPo external images) 
 * 2. Copies local flickr images
 * 
 * Run once during setup, then images are cached locally.
 */

const BASE_DIR = path.join(__dirname, '..');
const IMG_DIR = path.join(BASE_DIR, 'img');
const RAW_IMG_DIR = path.join(IMG_DIR, 'raw'); 
const CSV_DIR = '/Users/mekot/mcp-files/timmeko-dot-com/PORTFOLIO CSVs';

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

// Download with browser headers
function downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https://') ? https : http;
        
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
        request.setTimeout(25000, () => {
            request.destroy();
            reject(new Error(`Timeout: ${url}`));
        });
        
        request.end();
    });
}

// Use corrected filename generation that handles imrs.php URLs
function generateFilename(url, originalName = '') {
    return generateImageFilename(url);
}

// Copy file
async function copyFile(sourcePath, destPath) {
    try {
        await fs.copyFile(sourcePath, destPath);
        return true;
    } catch (error) {
        console.error(`Failed to copy ${sourcePath}: ${error.message}`);
        return false;
    }
}

// Add delay
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Main download function
async function downloadAllImages() {
    console.log('📥 Downloading images from CSVs (one-time setup)...\n');
    
    const csvFiles = await fs.readdir(CSV_DIR);
    const downloaded = new Set();
    const existing = new Set();
    const failed = new Set();
    
    for (const csvFile of csvFiles) {
        if (!csvFile.endsWith('.csv')) continue;
        
        console.log(`📄 Processing: ${csvFile}`);
        const csvPath = path.join(CSV_DIR, csvFile);
        const content = await fs.readFile(csvPath, 'utf-8');
        const rows = parseCSV(content);
        
        for (const row of rows) {
            if (row.include !== '1') continue;
            
            const imageUrl = row.image;
            if (!imageUrl) continue;
            
            // Skip duplicates
            if (downloaded.has(imageUrl) || existing.has(imageUrl)) {
                continue;
            }
            
            if (imageUrl.startsWith('http')) {
                // External image - download it
                const filename = generateFilename(imageUrl);
                const localPath = path.join(RAW_IMG_DIR, filename);
                
                try {
                    await fs.access(localPath);
                    console.log(`  ✅ Exists: ${filename}`);
                    existing.add(imageUrl);
                } catch (e) {
                    console.log(`  📥 Downloading: ${filename}...`);
                    try {
                        await delay(1200); // Rate limit
                        await downloadFile(imageUrl, localPath);
                        console.log(`    ✅ Downloaded successfully`);
                        downloaded.add(imageUrl);
                    } catch (downloadError) {
                        console.log(`    ❌ Failed: ${downloadError.message}`);
                        failed.add(imageUrl);
                    }
                }
                
            } else if (imageUrl.startsWith('/Users/mekot/mcp-files/timmeko-dot-com/flickr/')) {
                // Local flickr image
                const filename = path.basename(imageUrl);
                const localPath = path.join(RAW_IMG_DIR, filename);
                
                try {
                    await fs.access(localPath);
                    console.log(`  ✅ Already copied: ${filename}`);
                    existing.add(imageUrl);
                } catch (e) {
                    console.log(`  📁 Copying: ${filename}...`);
                    const success = await copyFile(imageUrl, localPath);
                    if (success) {
                        console.log(`    ✅ Copied successfully`);
                        downloaded.add(imageUrl);
                    } else {
                        failed.add(imageUrl);
                    }
                }
            }
        }
        
        console.log(''); // Add spacing
    }
    
    // Summary
    console.log('📊 DOWNLOAD SUMMARY:');
    console.log(`✅ Existing images: ${existing.size}`);
    console.log(`📥 Downloaded: ${downloaded.size}`);
    console.log(`❌ Failed: ${failed.size}`);
    
    if (failed.size > 0) {
        console.log('\n⚠️ Failed downloads (server errors, etc.):');
        failed.forEach(url => {
            console.log(`  - ${url.substring(0, 80)}...`);
        });
        console.log('\nYou can:');
        console.log('1. Try running `npm run download-images` again later');
        console.log('2. Download these manually and save to img/raw/');
        console.log('3. Use placeholder images for now');
    }
    
    console.log(`\n🎉 Image download complete! Images stored in: img/raw/`);
    console.log('Next: Run `npm run update-paths` to update markdown files');
}

async function main() {
    try {
        await ensureDirectories();
        await downloadAllImages();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { downloadAllImages };
