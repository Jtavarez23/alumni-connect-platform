#!/usr/bin/env node

/**
 * Image Optimization Script
 * Optimizes and compresses images for production builds
 * Reduces bundle size and improves loading performance
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if sharp is available for image optimization
const hasSharp = () => {
  try {
    require.resolve('sharp');
    return true;
  } catch {
    return false;
  }
};

// Install sharp if not available
const ensureSharp = () => {
  if (!hasSharp()) {
    console.log('Installing sharp for image optimization...');
    try {
      execSync('npm install sharp --no-save', { stdio: 'inherit' });
    } catch (error) {
      console.warn('Could not install sharp, using basic optimization');
      return false;
    }
  }
  return true;
};

// Optimize images using sharp (if available)
const optimizeImage = async (filePath) => {
  const sharpAvailable = ensureSharp();
  
  if (sharpAvailable) {
    const sharp = require('sharp');
    const outputPath = filePath;
    
    try {
      const stats = fs.statSync(filePath);
      const originalSize = stats.size;
      
      await sharp(filePath)
        .jpeg({ 
          quality: 80, 
          progressive: true,
          optimizeScans: true
        })
        .png({ 
          compressionLevel: 9,
          progressive: true,
          adaptiveFiltering: true
        })
        .webp({ 
          quality: 75,
          effort: 6
        })
        .toFile(outputPath);
      
      const newStats = fs.statSync(outputPath);
      const newSize = newStats.size;
      const savings = originalSize - newSize;
      const percent = ((savings / originalSize) * 100).toFixed(1);
      
      console.log(`Optimized ${path.basename(filePath)}: ${(originalSize / 1024).toFixed(1)}KB → ${(newSize / 1024).toFixed(1)}KB (${percent}% savings)`);
      
      return { originalSize, newSize, savings };
    } catch (error) {
      console.warn(`Could not optimize ${filePath}:`, error.message);
      return null;
    }
  } else {
    console.log(`Skipping optimization for ${path.basename(filePath)} (sharp not available)`);
    return null;
  }
};

// Find all image files in assets directory
const findImageFiles = (dir) => {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff'];
  const files = [];
  
  const walk = (currentDir) => {
    const items = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item.name);
      
      if (item.isDirectory()) {
        // Skip node_modules and hidden directories
        if (!item.name.startsWith('.') && item.name !== 'node_modules') {
          walk(fullPath);
        }
      } else if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase();
        if (imageExtensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  };
  
  walk(dir);
  return files;
};

// Main optimization function
const optimizeImages = async () => {
  console.log('Starting image optimization...');
  
  const assetsDir = path.join(__dirname, '..', 'assets');
  if (!fs.existsSync(assetsDir)) {
    console.log('No assets directory found, skipping optimization');
    return;
  }
  
  const imageFiles = findImageFiles(assetsDir);
  
  if (imageFiles.length === 0) {
    console.log('No image files found to optimize');
    return;
  }
  
  console.log(`Found ${imageFiles.length} image files to optimize`);
  
  let totalOriginalSize = 0;
  let totalNewSize = 0;
  let optimizedCount = 0;
  
  for (const filePath of imageFiles) {
    const result = await optimizeImage(filePath);
    if (result) {
      totalOriginalSize += result.originalSize;
      totalNewSize += result.newSize;
      optimizedCount++;
    }
  }
  
  if (optimizedCount > 0) {
    const totalSavings = totalOriginalSize - totalNewSize;
    const totalPercent = ((totalSavings / totalOriginalSize) * 100).toFixed(1);
    
    console.log(`\nOptimization complete!`);
    console.log(`Optimized ${optimizedCount} images`);
    console.log(`Total size: ${(totalOriginalSize / 1024 / 1024).toFixed(2)}MB → ${(totalNewSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Total savings: ${(totalSavings / 1024 / 1024).toFixed(2)}MB (${totalPercent}%)`);
  } else {
    console.log('No images were optimized');
  }
};

// Run optimization if called directly
if (require.main === module) {
  optimizeImages().catch(console.error);
}

module.exports = { optimizeImages };