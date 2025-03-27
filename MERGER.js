const fs = require('fs');
const path = require('path');

// List of directories to search
const directories = [
  'new/ayush/'
];

// Output file path
const outputFilePath = 'all.txt';

// List of blacklisted files and directories
const blacklist = ['node_modules', 'dist', 'build', 'public', 'all.txt', 'MERGER.js', 'package-lock.json', 'package.json'];

// Function to check if a file or directory is blacklisted
function isBlacklisted(filePath) {
  // Get the basename (filename or directory name)
  const basename = path.basename(filePath);

  // Check if the basename is in the blacklist
  if (blacklist.includes(basename)) {
    return true;
  }

  // Check if any part of the path contains a blacklisted directory
  return blacklist.some(item => filePath.includes(`${path.sep}${item}${path.sep}`));
}

// Function to read files from a directory and append their contents to the output file
function appendFilesFromDirectory(directory) {
  const files = fs.readdirSync(directory);

  files.forEach(file => {
    const filePath = path.join(directory, file);
    const fileStats = fs.statSync(filePath);

    if (isBlacklisted(filePath)) {
      console.log(`Skipping blacklisted file or directory: ${filePath}`);
      return;
    }

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
