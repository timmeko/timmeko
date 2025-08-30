#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

/**
 * Download and process images script for timmeko.com 2025-v2
 * 
 * This script:
 * 1. Scans all markdown files for image references
 * 2. Downloads external images to local img/ directory
 * 3. Updates markdown files to use local paths
 * 4. Prepares images for optimization by optimize-images.js
 */

const BASE_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(BASE_DIR, 'src');
const IMG_DIR = path.join(BASE_DIR, 'img');
const RAW_IMG_DIR = path.join(IMG_DIR, 'raw'); // Store originals here

// Create necessary directories
async function ensureDirectories() {
    await fs.mkdir(IMG_DIR, { recursive: true });
    await fs.mkdir(RAW_IMG_DIR, { recursive: true });
}

// Download a file from URL
function downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https://') ? https : http;
        
        const request = client.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                // Handle redirects
                return downloadFile(response.headers.location, filepath);
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
            
            file.on('error', reject);
        });
        
        request.on('error', reject);
        request.setTimeout(10000, () => {
            request.destroy();
            reject(new Error(`Timeout: ${url}`));
        });
    });
}

// Generate a safe filename from URL
function generateFilename(url, originalPath = '') {
    // Try to get extension from URL or original path
    let extension = '';
    
    if (originalPath) {
        extension = path.extname(originalPath).toLowerCase();
    }
    
    if (!extension) {
        const urlPath = new URL(url).pathname;
        extension = path.extname(urlPath).toLowerCase();
    }
    
    // Default to .jpg if no extension found
    if (!extension || !['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(extension)) {
        extension = '.jpg';
    }
    
    // Create hash from URL for unique filename
    const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 12);
    
    return `downloaded-${hash}${extension}`;
}

// Extract image references from markdown content
function extractImageReferences(content) {
    const images = [];
    
    // Match ![alt](path) and ![alt](path "title") patterns
    const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)(?:\s+"[^"]*")?\)/g;
    let match;
    
    while ((match = markdownImageRegex.exec(content)) !== null) {
        images.push({
            fullMatch: match[0],
            alt: match[1],
            src: match[2].split(' ')[0], // Remove title if present
            isExternal: match[2].startsWith('http')
        });
    }
    
    // Also match frontmatter hero images
    const heroImageRegex = /^hero:\s*["']?([^"'\n]+)["']?$/m;
    const heroMatch = content.match(heroImageRegex);
    
    if (heroMatch && heroMatch[1].startsWith('http')) {
        images.push({
            fullMatch: heroMatch[0],
            alt: 'hero image',
            src: heroMatch[1],
            isExternal: true,
            isHero: true
        });
    }
    
    return images;
}

// Process a single markdown file
async function processMarkdownFile(filePath) {
    console.log(`Processing: ${filePath}`);
    
    const content = await fs.readFile(filePath, 'utf-8');
    const images = extractImageReferences(content);
    
    if (images.length === 0) {
        console.log(`  No images found`);
        return content;
    }
    
    let updatedContent = content;
    
    for (const img of images) {
        if (img.isExternal) {
            console.log(`  Downloading: ${img.src}`);
            
            try {
                const filename = generateFilename(img.src, img.src);
                const localPath = path.join(RAW_IMG_DIR, filename);
                const relativePath = `img/raw/${filename}`;
                
                // Download if not already exists
                try {
                    await fs.access(localPath);
                    console.log(`    Already exists: ${filename}`);
                } catch (e) {
                    await downloadFile(img.src, localPath);
                    console.log(`    Downloaded: ${filename}`);
                }
                
                // Update content with local path
                if (img.isHero) {
                    updatedContent = updatedContent.replace(img.fullMatch, `hero: "${relativePath}"`);
                } else {
                    const newImageMarkdown = `![${img.alt}](${relativePath})`;
                    updatedContent = updatedContent.replace(img.fullMatch, newImageMarkdown);
                }
                
            } catch (error) {
                console.error(`    Failed to download ${img.src}: ${error.message}`);
            }
        }
        else if (img.src.startsWith('img/wp-articles/')) {
            // Convert relative paths to raw directory
            const filename = path.basename(img.src);
            const newPath = `img/raw/${filename}`;
            
            if (img.isHero) {
                updatedContent = updatedContent.replace(img.fullMatch, `hero: "${newPath}"`);
            } else {
                const newImageMarkdown = `![${img.alt}](${newPath})`;
                updatedContent = updatedContent.replace(img.fullMatch, newImageMarkdown);
            }
            
            console.log(`  Updated path: ${img.src} → ${newPath}`);
        }
    }
    
    return updatedContent;
}

// Find all markdown files in src directory
async function findMarkdownFiles(dir) {
    const files = [];
    
    async function scanDir(currentDir) {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            
            if (entry.isDirectory()) {
                await scanDir(fullPath);
            } else if (entry.name.endsWith('.md') || entry.name.endsWith('.njk')) {
                files.push(fullPath);
            }
        }
    }
    
    await scanDir(dir);
    return files;
}

// Main execution
async function main() {
    console.log('🖼️  Starting image download and processing...\n');
    
    try {
        await ensureDirectories();
        
        const markdownFiles = await findMarkdownFiles(SRC_DIR);
        console.log(`Found ${markdownFiles.length} markdown files\n`);
        
        for (const file of markdownFiles) {
            const updatedContent = await processMarkdownFile(file);
            await fs.writeFile(file, updatedContent, 'utf-8');
        }
        
        console.log('\n✅ Image processing complete!');
        console.log('\nNext steps:');
        console.log('1. Run `npm run optimize-images` to process raw images');
        console.log('2. Run `npm run build` to build the site');
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { main };
