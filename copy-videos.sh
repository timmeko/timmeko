#!/bin/bash

# Copy video files from img/raw to src/assets/videos with correct slug-based names

echo "Copying videos to src/assets/videos..."

# Map old filenames to new slug-based names
cp "img/raw/wickedWeather.mp4" "src/assets/videos/wicked-weather.mp4"
cp "img/raw/elections.mp4" "src/assets/videos/election-winds-sand-map.mp4"
cp "img/raw/covidYear.mp4" "src/assets/videos/covid-double.mp4"
cp "img/raw/NK-targets.mp4" "src/assets/videos/north-korea-targets.mp4"
cp "img/raw/infrastructure-stacked.mp4" "src/assets/videos/infrastructure.mp4"

echo "Videos copied successfully!"
echo "Files in src/assets/videos:"
ls -la "src/assets/videos/"
