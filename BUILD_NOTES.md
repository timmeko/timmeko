# Build Script Changes

## Video Processing Removed from Default Build

The video optimization has been removed from the default `npm run build` command because it was hanging for hours.

## Available Build Commands

- **`npm run build`** - Fast build (images only + Eleventy)
- **`npm run build:quick`** - Fastest build (Eleventy only, no image processing)
- **`npm run build:with-videos`** - Full build including video processing (slow!)
- **`npm run dev`** - Development server with live reload

## Video Processing

If you need to process videos:
- **`npm run optimize-videos`** - Process videos only
- **`npm run optimize-media`** - Process both images and videos

## Recommendation

For regular development and deployment, use `npm run build` which skips the time-consuming video processing.

Only use video processing when you've added new video files that need optimization.
