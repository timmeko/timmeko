# Image Processing Test

## Build Process

The image processing system is now complete with these steps:

### 1. Process Images (`scripts/process-images.js`)
- Reads both CSV files from `~/mcp-files/timmeko-dot-com/PORTFOLIO CSVs/`
- Downloads external WaPo images to `img/raw/`
- Copies flickr images from `/Users/mekot/mcp-files/timmeko-dot-com/flickr/` to `img/raw/`
- Updates all markdown files with correct local paths
- Only processes CSV rows where `include == 1`

### 2. Optimize Images (`scripts/optimize-images.js`) 
- Converts raw images to AVIF + JPEG formats
- Creates multiple sizes: hero (1200x630), large (800x600), medium (600x450), thumb (400x300)
- Maintains aspect ratios with smart cropping

### 3. Build Integration
- `npm run dev` - Processes images then starts dev server
- `npm run build` - Full production build with image optimization
- `npm run full-rebuild` - Clean slate rebuild

## Directory Structure After Processing

```
img/
  raw/              # Original images (downloaded + copied)
  optimized/
    hero/           # 1200x630 hero images (AVIF + JPEG)
    large/          # 800x600 content images  
    medium/         # 600x450 medium images
    thumb/          # 400x300 thumbnails
```

## Featured Projects Status ✅

The `src/maps/` directory now contains exactly 5 featured projects:
- covid-double.md
- election-winds-sand-map.md  
- infrastructure.md
- north-korea-targets.md
- wicked-weather.md

All other mapping content is in `src/more/` to avoid duplication.
