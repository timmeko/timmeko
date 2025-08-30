#!/bin/bash

# Quick script to move remaining duplicates from maps to temp directory
# These files already exist in the more directory

cd /Users/mekot/mcp-files/timmeko-dot-com/2025-v2

echo "Moving remaining duplicates..."

mv "src/maps/north-carolina-has-a-new-congressional-map-for-2020.md" "temp-duplicates/"
mv "src/maps/satellite-images-capture-dcs-cherry-blossoms-at-peak-bloom.md" "temp-duplicates/"
mv "src/maps/satellite-images-show-st-vincent-blanketed-with-volcanic-ash-as-eruptions-continue.md" "temp-duplicates/"
mv "src/maps/satellite-images-show-the-destruction-of-dorian-in-the-bahamas.md" "temp-duplicates/"
mv "src/maps/satellite-images-show-the-devastating-floods-in-the-midwest.md" "temp-duplicates/"
mv "src/maps/six-maps-that-show-the-anatomy-of-americas-vast-infrastructure.md" "temp-duplicates/"
mv "src/maps/the-camp-fires-damage-goes-beyond-what-satellites-can-show.md" "temp-duplicates/"
mv "src/maps/this-map-explains-the-weather-we-had-in-2016.md" "temp-duplicates/"
mv "src/maps/this-map-shows-every-inch-of-snow-that-fell-on-the-lower-48-this-year.md" "temp-duplicates/"
mv "src/maps/transylvania-university.md" "temp-duplicates/"
mv "src/maps/visualizing-the-omicron-wave-striking-and-rolling-across-the-country.md" "temp-duplicates/"
mv "src/maps/where-to-view-cherry-blossoms-in-the-dc-area-mapped.md" "temp-duplicates/"

echo "Cleanup complete!"
echo "Remaining files in src/maps/:"
ls -la src/maps/
