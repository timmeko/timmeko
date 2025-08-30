#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { generateImageFilename } = require('./image-utils');

/**
 * Fix broken image paths in existing markdown files
 * 
 * This script:
 * 1. Scans all markdown files
 * 2. Finds images that don't exist at their current paths
 * 3. Looks for those images in img/optimized/thumb/, img/raw/, etc.
 * 4. Updates the markdown files with the correct paths
 */

const BASE_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(BASE_DIR, 'src');
const IMG_DIR = path.join(BASE_DIR, 'img');

// Find actual location of an image file
async function findImageLocation(imageName) {
    const searchPaths = [
        path.join(IMG_DIR, 'optimized', 'thumb', imageName),
        path.join(IMG_DIR, 'optimized', 'full', imageName),
        path.join(IMG_DIR, 'raw', imageName),
        path.join(IMG_DIR, imageName)
    ];
    
    for (const searchPath of searchPaths) {
        try {
            await fs.access(searchPath);
            // Found it! Return relative path
            return path.relative(BASE_DIR, searchPath);
        } catch (e) {
            // Not found here, try next
        }
    }
    
    return null; // Not found anywhere
}

// Find image by trying different filename variations
async function findImageByVariations(originalUrl) {
    // Try the shared filename generation
    const expectedFilename = generateImageFilename(originalUrl);
    let location = await findImageLocation(expectedFilename);
    if (location) return { filename: expectedFilename, path: location };
    
    // Try original filename from URL
    try {
        const urlPath = new URL(originalUrl).pathname;
        const originalFilename = path.basename(urlPath);
        location = await findImageLocation(originalFilename);
        if (location) return { filename: originalFilename, path: location };
    } catch (e) {
        // Not a valid URL
    }
    
    // Try hash-based filename (legacy)
    try {
        const crypto = require('crypto');
        const hash = crypto.createHash('md5').update(originalUrl).digest('hex').substring(0, 12);
        const hashFilename = `wapo-${hash}.jpg`;
        location = await findImageLocation(hashFilename);
        if (location) return { filename: hashFilename, path: location };
        
        // Try other extensions
        for (const ext of ['.png', '.gif', '.webp']) {
            const hashFilenameAlt = `wapo-${hash}${ext}`;
            location = await findImageLocation(hashFilenameAlt);
            if (location) return { filename: hashFilenameAlt, path: location };
        }
    } catch (e) {
        // Crypto not available or other error
    }
    
    return null;
}

// Extract frontmatter hero image
function extractHeroImage(content) {
    const heroMatch = content.match(/^hero:\s*["']?([^"'\n]+)["']?$/m);
    return heroMatch ? heroMatch[1].trim() : null;
}

// Update hero image in content
function updateHeroImage(content, oldPath, newPath) {
    const oldHeroRegex = new RegExp(`^hero:\\s*["']?${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']?$`, 'm');
    return content.replace(oldHeroRegex, `hero: "${newPath}"`);
}

// Process a single markdown file
async function processMarkdownFile(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const heroPath = extractHeroImage(content);
    
    if (!heroPath) {
        return { processed: false, reason: 'No hero image' };
    }
    
    // Check if current path exists
    const currentFullPath = path.join(BASE_DIR, heroPath);
    try {
        await fs.access(currentFullPath);
        return { processed: false, reason: 'Image exists at current path' };
    } catch (e) {
        // Image missing, try to find it
    }
    
    // Extract image filename or URL for searching
    let searchTarget = heroPath;
    
    // If it's already a relative path, get just the filename
    if (heroPath.startsWith('img/')) {
        searchTarget = path.basename(heroPath);
        
        // Try to find the actual file
        const location = await findImageLocation(searchTarget);
        if (location) {
            const updatedContent = updateHeroImage(content, heroPath, location);
            await fs.writeFile(filePath, updatedContent, 'utf8');
            return { 
                processed: true, 
                oldPath: heroPath, 
                newPath: location,
                reason: 'Found existing file with different path'
            };
        }
    }
    
    // If it's an external URL, try to find the downloaded version
    if (heroPath.startsWith('http')) {
        const result = await findImageByVariations(heroPath);
        if (result) {
            const updatedContent = updateHeroImage(content, heroPath, result.path);
            await fs.writeFile(filePath, updatedContent, 'utf8');
            return { 
                processed: true, 
                oldPath: heroPath, 
                newPath: result.path,
                reason: 'Found downloaded image'
            };
        }
    }
    
    return { 
        processed: false, 
        reason: 'Image not found anywhere',
        missingPath: heroPath
    };
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
            console.log(`⚠️ Error reading directory ${currentDir}: ${error.message}`);
        }
    }
    
    await scanDir(dir);
    return files;
}

// Main function
async function fixImagePaths() {
    console.log('🔧 Fixing broken image paths in markdown files...\n');
    
    const markdownFiles = await findMarkdownFiles(SRC_DIR);
    let fixed = 0;
    let skipped = 0;
    let missing = 0;
    const missingImages = [];
    
    for (const filePath of markdownFiles) {
        const relativePath = path.relative(SRC_DIR, filePath);
        console.log(`📝 Checking: ${relativePath}`);
        
        try {
            const result = await processMarkdownFile(filePath);
            
            if (result.processed) {
                console.log(`  ✅ Fixed: ${result.oldPath} → ${result.newPath}`);
                fixed++;
            } else if (result.missingPath) {
                console.log(`  ❌ Missing: ${result.missingPath}`);
                missingImages.push({ file: relativePath, image: result.missingPath });
                missing++;
            } else {
                console.log(`  ↳ ${result.reason}`);
                skipped++;
            }
        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
        }
    }
    
    // Summary
    console.log(`\n📊 SUMMARY:`);
    console.log(`✅ Fixed: ${fixed} files`);
    console.log(`↳ Skipped: ${skipped} files (already correct)`);
    console.log(`❌ Missing images: ${missing} files`);
    
    if (missingImages.length > 0) {
        console.log(`\n🚨 MISSING IMAGES:`);
        missingImages.forEach(({ file, image }) => {
            console.log(`  ${file}: ${image}`);
        });
        
        console.log(`\n💡 TO FIX MISSING IMAGES:`);
        console.log(`1. Run: npm run download-images  (downloads from CSV URLs)`);
        console.log(`2. Re-run: npm run fix-paths      (this script again)`);
        console.log(`3. Or manually download/copy images to img/raw/`);
    }
    
    console.log(`\n✅ Image path fixing complete!`);
}

// Export
module.exports = { fixImagePaths };

// Run if called directly
if (require.main === module) {
    fixImagePaths().catch(console.error);
}
