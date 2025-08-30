#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Files to move from maps to more
const filesToMove = [
    'mapping-americas-wicked-weather-and-deadly-disasters.md',
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

async function moveFiles() {
    const mapsDir = path.join(__dirname, '../src/maps');
    const moreDir = path.join(__dirname, '../src/more');
    
    for (const filename of filesToMove) {
        const sourcePath = path.join(mapsDir, filename);
        const destPath = path.join(moreDir, filename);
        
        try {
            // Check if source file exists
            await fs.access(sourcePath);
            
            // Move the file
            await fs.rename(sourcePath, destPath);
            console.log(`Moved: ${filename}`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`Skipped (not found): ${filename}`);
            } else {
                console.error(`Error moving ${filename}: ${error.message}`);
            }
        }
    }
    
    console.log('\nMove complete!');
    console.log('Featured maps remaining in src/maps/:');
    
    try {
        const remainingFiles = await fs.readdir(mapsDir);
        remainingFiles.forEach(file => console.log(`  - ${file}`));
    } catch (error) {
        console.error('Error listing maps directory:', error.message);
    }
}

moveFiles();
