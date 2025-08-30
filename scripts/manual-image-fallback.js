#!/usr/bin/env node

/**
 * Manual image fallback for timmeko.com 2025-v2
 * 
 * If automated downloads fail, this script helps manually add key images
 * for the 5 featured projects by copying from existing sources or providing
 * fallback placeholder images.
 */

const fs = require('fs').promises;
const path = require('path');

const BASE_DIR = path.join(__dirname, '..');
const RAW_IMG_DIR = path.join(BASE_DIR, 'img', 'raw');

// Key images needed for featured projects
const FEATURED_IMAGES = [
    {
        project: 'election-winds-sand-map',
        images: [
            'how-trump-built-his-victory-vote-by-vote-d964df4a-1200.jpg',
            'the-political-winds-in-the-u-s-are-swirling-001efe02-1200.jpg'
        ]
    },
    {
        project: 'covid-double', 
        images: [
            'covid100kA1.jpeg',
            'a-year-of-the-pandemic-sorrow-stamina-defiance-des-4c5a98ce-1200.jpg'
        ]
    },
    {
        project: 'wicked-weather',
        images: [
            'FIRE.jpg'
        ]
    },
    {
        project: 'infrastructure',
        images: [
            'infrastructure-grid-promo.jpg',
            'electric-1480.jpg'
        ]
    },
    {
        project: 'north-korea-targets',
        images: [
            'Screenshot 2025-08-29 at 11.29.26 AM.png'
        ]
    }
];

async function checkMissingImages() {
    console.log('🔍 Checking for missing featured project images...\n');
    
    const missingImages = [];
    
    for (const project of FEATURED_IMAGES) {
        console.log(`Checking ${project.project}:`);
        
        for (const imageName of project.images) {
            const imagePath = path.join(RAW_IMG_DIR, imageName);
            
            try {
                await fs.access(imagePath);
                console.log(`  ✅ ${imageName}`);
            } catch (e) {
                console.log(`  ❌ MISSING: ${imageName}`);
                missingImages.push({
                    project: project.project,
                    image: imageName,
                    path: imagePath
                });
            }
        }
        console.log('');
    }
    
    if (missingImages.length === 0) {
        console.log('🎉 All featured project images are present!');
        return;
    }
    
    console.log(`⚠️  Found ${missingImages.length} missing images for featured projects:`);
    console.log('\n📝 TO FIX MANUALLY:');
    console.log('You can:');
    console.log('1. Download these images manually from the WaPo articles');
    console.log('2. Or create placeholder images');
    console.log('3. Or find alternative images\n');
    
    missingImages.forEach(item => {
        console.log(`${item.project}:`);
        console.log(`  Missing: ${item.image}`);
        console.log(`  Save to: ${item.path}`);
        console.log('');
    });
}

async function createPlaceholders() {
    console.log('🖼️  Creating placeholder images for missing files...\n');
    
    // Simple SVG placeholder generator
    const createPlaceholderSVG = (width, height, text) => `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f8fafc"/>
  <rect x="2" y="2" width="${width-4}" height="${height-4}" fill="none" stroke="#e2e8f0" stroke-width="2" stroke-dasharray="5,5"/>
  <text x="50%" y="50%" text-anchor="middle" dy="0.35em" font-family="Arial, sans-serif" font-size="16" fill="#64748b">
    ${text}
  </text>
</svg>`.trim();
    
    const placeholders = [
        { name: 'placeholder-hero-1200x630.svg', width: 1200, height: 630, text: 'Hero Image Placeholder' },
        { name: 'placeholder-content-800x600.svg', width: 800, height: 600, text: 'Content Image Placeholder' },
        { name: 'placeholder-card-400x300.svg', width: 400, height: 300, text: 'Card Image Placeholder' }
    ];
    
    for (const placeholder of placeholders) {
        const placeholderPath = path.join(RAW_IMG_DIR, placeholder.name);
        const svg = createPlaceholderSVG(placeholder.width, placeholder.height, placeholder.text);
        
        await fs.writeFile(placeholderPath, svg, 'utf-8');
        console.log(`✅ Created: ${placeholder.name}`);
    }
    
    console.log('\n✅ Placeholder images created!');
    console.log('You can now reference these in your markdown files:');
    console.log('- img/raw/placeholder-hero-1200x630.svg');
    console.log('- img/raw/placeholder-content-800x600.svg'); 
    console.log('- img/raw/placeholder-card-400x300.svg');
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--placeholders')) {
        await createPlaceholders();
    } else {
        await checkMissingImages();
        console.log('\nRun with --placeholders to create placeholder images:');
        console.log('node scripts/manual-image-fallback.js --placeholders');
    }
}

if (require.main === module) {
    main().catch(console.error);
}
