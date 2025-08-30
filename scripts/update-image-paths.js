#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Update image paths in markdown files for timmeko.com 2025-v2
 * 
 * Updates all markdown files to use local image paths.
 * Assumes images have already been downloaded to img/raw/
 * 
 * This is fast and can be run repeatedly during development.
 */

const BASE_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(BASE_DIR, 'src');
const RAW_IMG_DIR = path.join(BASE_DIR, 'img', 'raw');

// Generate filename (same logic as download script)
function generateFilename(url, originalName = '') {
    let extension = '';
    
    if (originalName) {
        extension = path.extname(originalName).toLowerCase();
    }
    
    if (!extension) {
        try {
            const urlPath = new URL(url).pathname;
            extension = path.extname(urlPath).toLowerCase();
        } catch (e) {
            extension = path.extname(url).toLowerCase();
        }
    }
    
    if (!extension || !['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(extension)) {
        extension = '.jpg';
    }
    
    let basename = '';
    if (originalName) {
        basename = path.basename(originalName, extension).replace(/[^a-zA-Z0-9-_]/g, '-');
    } else {
        const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 12);
        basename = `wapo-${hash}`;
    }
    
    return `${basename}${extension}`;
}

// Extract image references from markdown
function extractImageReferences(content) {
    const images = [];
    
    // Match ![alt](path) patterns
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
    const heroImageRegex = /^hero:\\s*["']?([^"'\\n]+)["']?$/m;
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

// Update paths in markdown files
async function updateImagePaths() {
    console.log('🔗 Updating image paths in markdown files...\n');
    
    const markdownFiles = await findMarkdownFiles(SRC_DIR);
    let filesUpdated = 0;
    let pathsUpdated = 0;
    
    for (const filePath of markdownFiles) {
        const relativePath = path.relative(BASE_DIR, filePath);
        console.log(`📝 Processing: ${relativePath}`);
        
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
                    // Map external URL to local filename
                    const filename = generateFilename(img.src);
                    newPath = `img/raw/${filename}`;
                    
                } else if (img.src.startsWith('/Users/mekot/mcp-files/timmeko-dot-com/flickr/')) {
                    // Map flickr path to local filename
                    const filename = path.basename(img.src);
                    newPath = `img/raw/${filename}`;
                    
                } else if (img.src.startsWith('img/wp-articles/')) {
                    // Convert old wp-articles paths
                    const filename = path.basename(img.src);
                    newPath = `img/raw/${filename}`;
                    
                } else if (img.src.startsWith('img/raw/')) {
                    // Already correct path
                    console.log(`    ↳ Already local: ${path.basename(img.src)}`);
                    continue;
                }
                
                // Update content if we have a new path
                if (newPath && newPath !== img.src) {
                    // Check if target file exists
                    const targetFile = path.join(BASE_DIR, newPath);
                    try {
                        await fs.access(targetFile);
                        
                        if (img.isHero) {
                            updatedContent = updatedContent.replace(img.fullMatch, `hero: "${newPath}"`);
                        } else {
                            const newImageMarkdown = `![${img.alt}](${newPath})`;
                            updatedContent = updatedContent.replace(img.fullMatch, newImageMarkdown);
                        }
                        
                        console.log(`    ✅ ${path.basename(img.src)} → ${path.basename(newPath)}`);
                        hasChanges = true;
                        pathsUpdated++;
                        
                    } catch (e) {
                        console.log(`    ⚠️  Target missing: ${newPath} (${path.basename(img.src)})`);
                    }
                }
            }
            
            // Write updated content
            if (hasChanges) {
                await fs.writeFile(filePath, updatedContent, 'utf-8');
                filesUpdated++;
            }
            
        } catch (error) {
            console.log(`    ❌ Error: ${error.message}`);
        }
    }
    
    console.log(`\n📊 UPDATE SUMMARY:`);
    console.log(`📝 Files processed: ${markdownFiles.length}`);
    console.log(`📝 Files updated: ${filesUpdated}`);
    console.log(`🔗 Paths updated: ${pathsUpdated}`);
    console.log(`\n✅ Path updates complete!`);
}

// Find all markdown files
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

async function main() {
    try {
        await updateImagePaths();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { updateImagePaths };
