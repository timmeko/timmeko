# Image Processing Setup - READY TO RUN! 🚀

Your image processing scripts are now saved and ready to run. Here's what I've created:

## 🎯 **Quick Start (Recommended)**

```bash
cd ~/mcp-files/timmeko-dot-com/2025-v2
chmod +x setup-images.sh
./setup-images.sh
```

This single command will:
- Install dependencies
- Download all external images from your CSVs locally
- Create markdown files for all sections 
- Build your site

## 📁 **What Was Created**

### Scripts:
- `scripts/process-images.js` - Downloads external images to `src/assets/images/`
- `scripts/csv-to-md.js` - Converts CSV data to Eleventy markdown files
- `scripts/optimize-images.js` - Basic image optimization (placeholder for now)
- `setup-images.sh` - Complete automated setup script

### Directories:
- `src/assets/images/` - Where downloaded images will be stored
- `data/` - Where processed CSV files will be saved

### Updated:
- `package.json` - Added new npm scripts and dependencies

## 🔧 **Individual Commands**

If you prefer to run steps individually:

```bash
npm install                    # Install dependencies
npm run process-images         # Download external images
npm run csv-to-md             # Create markdown files
npm run build                 # Build the site
```

## 🎯 **What This Solves**

✅ **No more broken Washington Post image links**  
✅ **All portfolio images hosted locally**  
✅ **Organized image naming by section**  
✅ **Automatic CSV to markdown conversion**  
✅ **Proper sorting (newest first) within sections**  
✅ **Only processes rows with `include = 1`**  

## 🗂️ **Image Organization**

Images will be saved with descriptive names:
```
src/assets/images/
├── more-africa-redraw-world-map.jpg
├── editing-bears-ears-monument.jpg  
├── featured-election-winds-sand.jpg
└── insights-political-winds-talk.jpg
```

## 📊 **What Gets Created**

The script will read your CSV files from `/Users/mekot/mcp-files/timmeko-dot-com/PORTFOLIO CSVs/` and create:

- **Featured** → `src/maps/` (only the 5 curated featured items)
- **Editing** → `src/editing/` (cards that link out)  
- **More** → `src/more/` (image-only cards for catch-all grid)
- **Insights** → `src/insights/` (talks + LinkedIn articles)

## 🚨 **Ready to Run!**

Everything is set up. Just run the setup script and your image issues should be resolved!

```bash
cd ~/mcp-files/timmeko-dot-com/2025-v2
chmod +x setup-images.sh
./setup-images.sh
```
