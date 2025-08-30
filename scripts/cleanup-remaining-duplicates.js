#!/usr/bin/env node

// Script to clean up remaining duplicates from maps/ directory
// These files already exist in more/ so we remove them from maps/

const fs = require('fs').promises;
const path = require('path');

const duplicates = [
    'mapping-the-dmz.md',
    'mapping-the-perfect-us-winter-olympic-city.md',
    'mapping-this-summers-extreme-divide-in-rain-and-drought.md',
    'maps-show-where-coronavirus-started-and-why-officials-are-so-worried.md',
    'north-carolina-has-a-new-congressional-map-for-2020.md',
    'satellite-imagery-shows-the-scale-of-the-traffic-congestion-at-the-ports-of-los-angeles.md',
    'satellite-images-capture-dcs-cherry-blossoms-at-peak-bloom.md',
    'satellite-images-show-st-vincent-blanketed-with-volcanic-ash-as-eruptions-continue.md',
    'satellite-images-show-the-destruction-of-dorian-in-the-bahamas.md',
    'satellite-images-show-the-devastating-floods-in-the-midwest.md',
    'six-maps-that-show-the-anatomy-of-americas-vast-infrastructure.md',
    'the-camp-fires-damage-goes-beyond-what-satellites-can-show.md',
    'this-map-explains-the-weather-we-had-in-2016.md',
    'this-map-shows-every-inch-of-snow-that-fell-on-the-lower-48-this-year.md',
    'transylvania-university.md',
    'visualizing-the-omicron-wave-striking-and-rolling-across-the-country.md',
    'where-to-view-cherry-blossoms-in-the-dc-area-mapped.md'
];

async function moveDuplicates() {
    const mapsDir = '/Users/mekot/mcp-files/timmeko-dot-com/2025-v2/src/maps';
    const tempDir = '/Users/mekot/mcp-files/timmeko-dot-com/2025-v2/temp-duplicates';
    
    console.log('Moving duplicates to temp directory...\n');
    
    let moved = 0;
    
    for (const filename of duplicates) {
        const sourcePath = path.join(mapsDir, filename);
        const destPath = path.join(tempDir, filename);
        
        try {
            await fs.rename(sourcePath, destPath);
            console.log(`✅ Moved: ${filename}`);
            moved++;
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`⚠️  Not found: ${filename}`);
            } else {
                console.error(`❌ Error: ${filename} - ${error.message}`);
            }
        }
    }
    
    console.log(`\n✅ Moved ${moved} duplicate files to temp directory`);
    
    // List what remains in maps
    try {
        const remainingFiles = await fs.readdir(mapsDir);
        console.log(`\n📁 Remaining in src/maps/:`);
        remainingFiles.forEach(file => console.log(`   - ${file}`));
        console.log(`\nTotal: ${remainingFiles.length} (should be exactly 5 featured projects)`);
    } catch (error) {
        console.error('Error listing remaining files:', error.message);
    }
}

// Export for manual execution
module.exports = { moveDuplicates };

// Run if executed directly  
if (require.main === module) {
    moveDuplicates().catch(console.error);
}
