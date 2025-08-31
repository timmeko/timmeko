#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

/**
 * Video optimization script for timmeko.com 2025-v2
 * 
 * Converts .mov, .mp4, and other video formats to web-optimized MP4 + WebM
 * Creates responsive video sets for web use
 */

const BASE_DIR = path.join(__dirname, '..');
const RAW_IMG_DIR = path.join(BASE_DIR, 'img', 'raw');
const OPTIMIZED_DIR = path.join(BASE_DIR, 'img', 'optimized');

// Video size presets (matching image pipeline)
const SIZES = {
    hero: { width: 1200, height: 630, bitrate: '2000k' }, // Hero videos for cards
    large: { width: 800, height: 600, bitrate: '1500k' }, // Large videos for content
    medium: { width: 600, height: 450, bitrate: '1000k' }, // Medium videos
    thumb: { width: 400, height: 300, bitrate: '500k' }   // Small videos/previews
};

// Ensure directories exist
async function ensureDirectories() {
    await fs.mkdir(OPTIMIZED_DIR, { recursive: true });
    
    for (const size of Object.keys(SIZES)) {
        const videoDir = path.join(OPTIMIZED_DIR, size);
        await fs.mkdir(videoDir, { recursive: true });
    }
}

// Check if FFmpeg is available
async function checkFFmpeg() {
    return new Promise((resolve) => {
        const ffmpeg = spawn('ffmpeg', ['-version']);
        ffmpeg.on('close', (code) => {
            resolve(code === 0);
        });
        ffmpeg.on('error', () => {
            resolve(false);
        });
    });
}

// Optimize a single video
async function optimizeVideo(videoPath, filename) {
    const basename = path.parse(filename).name;
    
    console.log(`  🎬 Processing: ${filename}`);
    
    try {
        // Process each size
        for (const [sizeName, config] of Object.entries(SIZES)) {
            const outputDir = path.join(OPTIMIZED_DIR, sizeName);
            
            // Generate MP4 (universal compatibility)
            const mp4Path = path.join(outputDir, `${basename}.mp4`);
            const mp4Success = await convertVideo(videoPath, mp4Path, config, 'mp4');
            
            // Generate WebM (smaller file size)
            const webmPath = path.join(outputDir, `${basename}.webm`);
            const webmSuccess = await convertVideo(videoPath, webmPath, config, 'webm');
            
            if (mp4Success && webmSuccess) {
                console.log(`    ↳ ${sizeName}: ${config.width}x${config.height} (MP4 + WebM)`);
            } else if (mp4Success) {
                console.log(`    ↳ ${sizeName}: ${config.width}x${config.height} (MP4 only)`);
            } else {
                console.log(`    ❌ Failed to process ${sizeName}`);
            }
        }
        
        // Generate poster frame (first frame as JPEG)
        const posterPath = path.join(OPTIMIZED_DIR, 'hero', `${basename}-poster.jpg`);
        await generatePoster(videoPath, posterPath);
        console.log(`    ↳ Generated poster frame`);
        
        return true;
        
    } catch (error) {
        console.error(`    ❌ Failed to process ${filename}: ${error.message}`);
        return false;
    }
}

// Convert video using FFmpeg
async function convertVideo(inputPath, outputPath, config, format) {
    return new Promise((resolve) => {
        const args = [
            '-i', inputPath,
            '-vf', `scale=${config.width}:${config.height}:force_original_aspect_ratio=decrease,pad=${config.width}:${config.height}:-1:-1:color=black`,
            '-b:v', config.bitrate,
            '-maxrate', config.bitrate,
            '-bufsize', `${parseInt(config.bitrate) * 2}k`,
            '-movflags', '+faststart',
            '-y' // Overwrite output files
        ];
        
        if (format === 'webm') {
            args.push('-c:v', 'libvpx-vp9', '-c:a', 'libvorbis');
        } else {
            args.push('-c:v', 'libx264', '-preset', 'medium', '-c:a', 'aac');
        }
        
        args.push(outputPath);
        
        const ffmpeg = spawn('ffmpeg', args);
        
        ffmpeg.on('close', (code) => {
            resolve(code === 0);
        });
        
        ffmpeg.on('error', () => {
            resolve(false);
        });
    });
}

// Generate poster frame
async function generatePoster(videoPath, posterPath) {
    return new Promise((resolve) => {
        const args = [
            '-i', videoPath,
            '-vframes', '1',
            '-f', 'image2',
            '-y',
            posterPath
        ];
        
        const ffmpeg = spawn('ffmpeg', args);
        
        ffmpeg.on('close', (code) => {
            resolve(code === 0);
        });
        
        ffmpeg.on('error', () => {
            resolve(false);
        });
    });
}

// Main function
async function main() {
    console.log('🎬 Starting video optimization...\n');
    
    try {
        // Check if FFmpeg is available
        const hasFFmpeg = await checkFFmpeg();
        if (!hasFFmpeg) {
            console.log('❌ FFmpeg is required but not found.');
            console.log('Install with: brew install ffmpeg (macOS) or apt install ffmpeg (Ubuntu)');
            return;
        }
        
        // Ensure output directories exist
        await ensureDirectories();
        
        // Check if raw images directory exists
        try {
            await fs.access(RAW_IMG_DIR);
        } catch (e) {
            console.log('⚠️  No raw images directory found.');
            return;
        }
        
        // Get all videos from raw directory
        const rawFiles = await fs.readdir(RAW_IMG_DIR);
        const videoFiles = rawFiles.filter(file => 
            ['.mov', '.mp4', '.avi', '.mkv', '.webm'].includes(path.extname(file).toLowerCase())
        );
        
        if (videoFiles.length === 0) {
            console.log('📭 No videos found in raw directory.');
            return;
        }
        
        console.log(`Found ${videoFiles.length} videos to optimize\n`);
        
        let processed = 0;
        let failed = 0;
        
        // Process each video
        for (const filename of videoFiles) {
            const videoPath = path.join(RAW_IMG_DIR, filename);
            
            const success = await optimizeVideo(videoPath, filename);
            if (success) {
                processed++;
            } else {
                failed++;
            }
        }
        
        console.log(`\n🎉 Video optimization complete!`);
        console.log(`✅ Processed: ${processed} videos`);
        if (failed > 0) {
            console.log(`❌ Failed: ${failed} videos`);
        }
        
        console.log('\nOptimized videos are available in:');
        console.log('  📁 img/optimized/hero/    - 1200x630 hero videos');
        console.log('  📁 img/optimized/large/   - 800x600 content videos');
        console.log('  📁 img/optimized/medium/  - 600x450 medium videos');
        console.log('  📁 img/optimized/thumb/   - 400x300 small videos');
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Export for testing
module.exports = { main, optimizeVideo, SIZES };

// Run if called directly
if (require.main === module) {
    main();
}
