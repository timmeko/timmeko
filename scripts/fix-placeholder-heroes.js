#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Script to find and fix placeholder hero paths in markdown files
const moreDir = path.join(__dirname, '..', 'src', 'more');

function fixPlaceholderHeroes() {
  console.log('Scanning for placeholder hero paths...');
  
  const files = fs.readdirSync(moreDir).filter(file => file.endsWith('.md'));
  let fixedCount = 0;
  
  files.forEach(filename => {
    const filepath = path.join(moreDir, filename);
    const content = fs.readFileSync(filepath, 'utf8');
    
    if (content.includes('hero: "img/raw/imrs.php"')) {
      console.log(`Found placeholder in: ${filename}`);
      
      // Replace the placeholder with a commented out version
      const fixed = content.replace(
        'hero: "img/raw/imrs.php"',
        '# hero: "img/raw/imrs.php" # Disabled - no matching image found'
      );
      
      fs.writeFileSync(filepath, fixed);
      fixedCount++;
      console.log(`  ✓ Fixed ${filename}`);
    }
  });
  
  console.log(`\nFixed ${fixedCount} files with placeholder hero paths.`);
}

if (require.main === module) {
  fixPlaceholderHeroes();
}

module.exports = { fixPlaceholderHeroes };
