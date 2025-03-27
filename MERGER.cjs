 // npm install ignore




const fs = require('fs');
const path = require('path');
const ignore = require('ignore'); // You'll need to install:

// List of directories to search
const directories = ['./'];

// Output file path
const outputFilePath = 'all.txt';

// List of blacklisted files and directories
const blacklist = ['node_modules', 'dist', 'build', 'public', 'all.txt', 'MERGER.cjs',
                  'package-lock.json', 'package.json', '.git', '.gitignore',
                  'README.md', '.run', '.idea', 'LICENSE'];

// Load .gitignore patterns if it exists
let ig = ignore();
if (fs.existsSync('.gitignore')) {
  const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
  ig = ignore().add(gitignoreContent);
}

function isBlacklisted(filePath) {
  // Get relative path for gitignore testing
  const relativePath = path.relative('.', filePath);

  // Check .gitignore rules - only if path is not empty
  if (relativePath && ig.ignores(relativePath)) {
    return true;
  }

  // For the root directory case (empty relativePath)
  if (!relativePath) {
    return false; // Don't blacklist the root directory
  }

  // Get the basename (filename or directory name)
  const basename = path.basename(filePath);

  // Check if the basename is in the blacklist
  if (blacklist.includes(basename)) {
    return true;
  }

  // Check if any part of the path contains a blacklisted directory
  return blacklist.some(item => {
    const pattern = path.sep + item + path.sep;
    const endPattern = path.sep + item;
    return filePath.includes(pattern) || filePath.endsWith(endPattern);
  });
}

// Function to read files from a directory and append their contents to the output file
function appendFilesFromDirectory(directory) {
  // Check if directory itself is blacklisted
  if (isBlacklisted(directory)) {
    console.log(`Skipping blacklisted directory: ${directory}`);
    return;
  }

  const files = fs.readdirSync(directory);

  files.forEach(file => {
    const filePath = path.join(directory, file);

    if (isBlacklisted(filePath)) {
      console.log(`Skipping blacklisted file or directory: ${filePath}`);
      return;
    }

    const fileStats = fs.statSync(filePath);
    if (fileStats.isFile()) {
      const fileContents = fs.readFileSync(filePath, 'utf-8');
      fs.appendFileSync(outputFilePath, `\n\n--- ${filePath} ---\n\n`);
      fs.appendFileSync(outputFilePath, fileContents);
    } else if (fileStats.isDirectory()) {
      appendFilesFromDirectory(filePath); // Recursively process subdirectories
    }
  });
}

// Clear the output file before appending new content
fs.writeFileSync(outputFilePath, '');

// Process each directory
directories.forEach(directory => {
  appendFilesFromDirectory(directory);
});

console.log('Files have been successfully copied to the output file.');
