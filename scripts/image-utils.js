const path = require('path');

/**
 * Smart image utilities that handle WaPo's image service URLs properly
 */

/**
 * Extract actual filename from WaPo URLs (including imrs.php service)
 */
function generateImageFilename(imageUrl) {
    if (!imageUrl) return null;
    
    try {
        const url = new URL(imageUrl);
        
        // Handle WaPo image resizer service
        if (url.pathname.includes('imrs.php') && url.searchParams.has('src')) {
            const srcUrl = url.searchParams.get('src');
            const srcPath = new URL(srcUrl).pathname;
            return path.basename(srcPath);
        }
        
        // Handle regular URLs
        const urlPath = url.pathname;
        let filename = path.basename(urlPath);
        
        // Ensure we have an extension
        if (!path.extname(filename)) {
            filename += '.jpg';
        }
        
        return filename;
        
    } catch (e) {
        // Not a URL, try as local path
        let filename = path.basename(imageUrl);
        if (!path.extname(filename)) {
            filename += '.jpg';
        }
        return filename;
    }
}

/**
 * Handle filename collisions by adding numeric suffix
 */
async function getUniqueFilename(baseFilename, targetDir, fs) {
    const ext = path.extname(baseFilename);
    const basename = path.basename(baseFilename, ext);
    
    let counter = 1;
    let filename = baseFilename;
    
    while (true) {
        const fullPath = path.join(targetDir, filename);
        try {
            await fs.access(fullPath);
            // File exists, try next number
            counter++;
            filename = `${basename}-${counter}${ext}`;
        } catch (e) {
            // File doesn't exist, we can use this name
            break;
        }
    }
    
    return filename;
}

module.exports = {
    generateImageFilename,
    getUniqueFilename
};
