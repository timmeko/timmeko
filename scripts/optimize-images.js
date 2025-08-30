#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

/**
 * Image optimization script for timmeko.com 2025-v2
 * 
 * Converts raw images to optimized AVIF + JPEG formats
 * Creates responsive image sets for web use
 */

const BASE_DIR = path.join(__dirname, '..');
const RAW_IMG_DIR = path.join(BASE_DIR, 'img', 'raw');
const OPTIMIZED_DIR = path.join(BASE_DIR, 'img', 'optimized');

// Image size presets
const SIZES = {
    hero: { width: 1200, height: 630 }, // Hero images for cards
    large: { width: 800, height: 600 }, // Large images for content
    medium: { width: 600, height: 450 }, // Medium images
    thumb: { width: 400, height: 300 }   // Thumbnails
};

// Ensure directories exist
async function ensureDirectories() {
    await fs.mkdir(OPTIMIZED_DIR, { recursive: true });
    
    for (const size of Object.keys(SIZES)) {
        await fs.mkdir(path.join(OPTIMIZED_DIR, size), { recursive: true });
    }
}

// Optimize a single image
async function optimizeImage(imagePath, filename) {
    const basename = path.parse(filename).name;
    
    console.log(`  📸 Processing: ${filename}`);
    
    try {
        // Get image metadata
        const metadata = await sharp(imagePath).metadata();
        console.log(`    ↳ Original: ${metadata.width}x${metadata.height} (${metadata.format})`);
        
        // Process each size
        for (const [sizeName, dimensions] of Object.entries(SIZES)) {
            const outputDir = path.join(OPTIMIZED_DIR, sizeName);
            
            // Calculate dimensions maintaining aspect ratio
            let { width, height } = dimensions;
            const aspectRatio = metadata.width / metadata.height;
            
            if (aspectRatio > width / height) {
                // Image is wider, fit to width
                height = Math.round(width / aspectRatio);
            } else {
                // Image is taller, fit to height  
                width = Math.round(height * aspectRatio);
            }
            
            // Generate AVIF (modern, smaller)
            const avifPath = path.join(outputDir, `${basename}.avif`);
            await sharp(imagePath)
                .resize(width, height, { 
                    fit: 'cover',
                    position: 'center'
                })
                .avif({ 
                    quality: 85,
                    effort: 6
                })
                .toFile(avifPath);
            
            // Generate JPEG (fallback)
            const jpegPath = path.join(outputDir, `${basename}.jpg`);
            await sharp(imagePath)
                .resize(width, height, { 
                    fit: 'cover',
                    position: 'center'
                })
                .jpeg({ 
                    quality: 85,
                    mozjpeg: true
                })
                .toFile(jpegPath);
            
            console.log(`    ↳ ${sizeName}: ${width}x${height} (AVIF + JPEG)`);
        }
        
        return true;
        
    } catch (error) {
        console.error(`    ❌ Failed to process ${filename}: ${error.message}`);
        return false;
    }
}

// Main function
async function main() {
    console.log('🎨 Starting image optimization...\n');
    
    try {
        // Ensure output directories exist
        await ensureDirectories();
        
        // Check if raw images directory exists
        try {
            await fs.access(RAW_IMG_DIR);
        } catch (e) {
            console.log('⚠️  No raw images directory found. Run `npm run process-images` first.');
            return;
        }
        
        // Get all images from raw directory
        const rawImages = await fs.readdir(RAW_IMG_DIR);
        const imageFiles = rawImages.filter(file => 
            ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(path.extname(file).toLowerCase())
        );
        
        if (imageFiles.length === 0) {
            console.log('📭 No images found in raw directory.');
            return;
        }
        
        console.log(`Found ${imageFiles.length} images to optimize\n`);
        
        let processed = 0;
        let failed = 0;
        
        // Process each image
        for (const filename of imageFiles) {
            const imagePath = path.join(RAW_IMG_DIR, filename);
            
            const success = await optimizeImage(imagePath, filename);
            if (success) {
                processed++;
            } else {
                failed++;
            }
        }
        
        console.log(`\n🎉 Optimization complete!`);
        console.log(`✅ Processed: ${processed} images`);
        if (failed > 0) {
            console.log(`❌ Failed: ${failed} images`);
        }
        
        console.log('\nOptimized images are available in:');
        console.log('  📁 img/optimized/hero/    - 1200x630 hero images');
        console.log('  📁 img/optimized/large/   - 800x600 content images');
        console.log('  📁 img/optimized/medium/  - 600x450 medium images');
        console.log('  📁 img/optimized/thumb/   - 400x300 thumbnails');
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Export for testing
module.exports = { main, optimizeImage, SIZES };

// Run if called directly
if (require.main === module) {
    main();
}
