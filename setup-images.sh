#!/bin/bash

# Complete setup script for Tim Meko 2025 v2 site
# This script downloads all external images locally and sets up the site

set -e  # Exit on any error

echo "🚀 Tim Meko 2025 v2 - Complete Setup Script"
echo "==========================================="
echo ""

# Configuration
PROJECT_DIR="/Users/mekot/mcp-files/timmeko-dot-com/2025-v2"
CSV_DIR="/Users/mekot/mcp-files/timmeko-dot-com/PORTFOLIO CSVs"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Project directory not found: $PROJECT_DIR"
    echo "Please create the 2025-v2 project directory first."
    exit 1
fi

# Check if CSV directory exists
if [ ! -d "$CSV_DIR" ]; then
    print_error "CSV directory not found: $CSV_DIR"
    echo "Please ensure the PORTFOLIO CSVs directory exists with your CSV files."
    exit 1
fi

# Navigate to project directory
cd "$PROJECT_DIR"
print_status "Working in: $PROJECT_DIR"

# Step 1: Install Node.js dependencies
echo ""
echo "📦 Installing dependencies..."
npm install
print_status "Dependencies installed"

# Step 2: Process images from CSVs
echo ""
echo "🖼️  Processing and downloading images..."
node scripts/process-images.js
print_status "Images processed and downloaded"

# Step 3: Convert CSV to Markdown
echo ""
echo "📝 Converting CSV data to Markdown files..."
node scripts/csv-to-md.js
print_status "CSV to Markdown conversion complete"

# Step 4: Optimize images
echo ""
echo "🔧 Optimizing images..."
node scripts/optimize-images.js
print_status "Images optimized"

# Step 5: Build the site
echo ""
echo "🏗️  Building the site..."
npx eleventy
print_status "Site built successfully"

# Step 6: Show summary
echo ""
echo "📊 Setup Summary"
echo "==============="

# Count images
IMG_COUNT=$(find src/assets/images -name "*.jpg" -o -name "*.png" -o -name "*.webp" 2>/dev/null | wc -l || echo "0")
echo "Images downloaded: $IMG_COUNT"

# Count markdown files by section
MAPS_COUNT=$(find src/maps -name "*.md" 2>/dev/null | wc -l || echo "0")
EDITING_COUNT=$(find src/editing -name "*.md" 2>/dev/null | wc -l || echo "0") 
MORE_COUNT=$(find src/more -name "*.md" 2>/dev/null | wc -l || echo "0")
INSIGHTS_COUNT=$(find src/insights -name "*.md" 2>/dev/null | wc -l || echo "0")

echo "Markdown files created:"
echo "  - Maps (featured): $MAPS_COUNT"
echo "  - Editing: $EDITING_COUNT"
echo "  - More work: $MORE_COUNT"
echo "  - Insights: $INSIGHTS_COUNT"

# Check for build output
if [ -d "_site" ]; then
    SITE_SIZE=$(du -sh _site 2>/dev/null | cut -f1 || echo "unknown")
    print_status "Site built successfully! Size: $SITE_SIZE"
    echo ""
    echo "🌐 Your site is ready!"
    echo "To run development server: npm run dev"
    echo "To rebuild: npm run build"
    echo "Site output: $PROJECT_DIR/_site"
else
    print_error "Site build may have failed - no _site directory found"
fi

echo ""
print_status "Setup complete! 🎉"
