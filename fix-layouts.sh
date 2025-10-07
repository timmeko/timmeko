#!/bin/bash

# Fix all remaining layout: page references to layout: layouts/page
# This will update all .md files in the src directory

echo "Fixing layout references in all markdown files..."

# Find and replace in all .md files
find src -name "*.md" -type f -exec sed -i '' 's/layout: page/layout: layouts\/page/g' {} +

echo "✅ Fixed all layout references!"
echo "Files updated:"
find src -name "*.md" -type f -exec grep -l "layout: layouts/page" {} \;
