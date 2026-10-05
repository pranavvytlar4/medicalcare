const fs = require('fs');
const path = require('path');

const faviconSnippet = `
    <!-- Favicon & Brand Icons -->
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">`;

function processDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (!content.includes('rel="icon"')) {
        if (content.includes('</title>')) {
          content = content.replace('</title>', '</title>' + faviconSnippet);
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log('Added favicon to:', path.relative(path.join(__dirname, '..'), fullPath));
        }
      }
    }
  }
}

processDir(path.join(__dirname, '..', 'public'));
console.log('Done!');
