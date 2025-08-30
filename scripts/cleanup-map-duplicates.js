#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Files that exist in both maps/ and more/ - delete from maps/
const duplicatesToDelete = [
    'mapping-inequality-in-nyc.md',
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

async function cleanupDuplicates() {
    const mapsDir = path.join(__dirname, '../src/maps');
    const moreDir = path.join(__dirname, '../src/more');
    
    console.log('🧹 Cleaning up duplicate files...\n');
    
    for (const filename of duplicatesToDelete) {
        const mapsPath = path.join(mapsDir, filename);
        const morePath = path.join(moreDir, filename);
        
        try {
            // Check if both files exist
            await fs.access(mapsPath);
            await fs.access(morePath);
            
            // Delete from maps/ directory
            await fs.unlink(mapsPath);
            console.log(`✅ Deleted duplicate: ${filename}`);
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`⚠️  File not found: ${filename}`);
            } else {
                console.error(`❌ Error with ${filename}: ${error.message}`);
            }
        }
    }
    
    console.log('\n✅ Cleanup complete!');
    console.log('Remaining in src/maps/ should be only the 5 featured projects:');
    
    try {
        const remainingFiles = await fs.readdir(mapsDir);
        remainingFiles.forEach(file => console.log(`  - ${file}`));
        console.log(`\nTotal remaining: ${remainingFiles.length} (should be 5)`);
    } catch (error) {
        console.error('Error listing maps directory:', error.message);
    }
}

cleanupDuplicates();
