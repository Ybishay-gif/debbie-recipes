// This file will accumulate scraped post data
// Format: JSON array of {url, author, text} objects
const fs = require('fs');
const path = '/Users/YossiBen_Y/debbie-recipes/scraped-posts.json';

// Initialize empty array if file doesn't exist
if (!fs.existsSync(path)) {
  fs.writeFileSync(path, '[]');
}

console.log('Scrape data file ready at:', path);
