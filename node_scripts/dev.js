const fs = require('fs');

fs.cpSync('static/js', 'dist/js', { recursive: true });

fs.copyFile('./static/js/planning.json', './dist/planning.json', () => {});
fs.copyFile('./manifest.json', './dist/manifest.json', () => {});
fs.copyFile('./static/css/style.css', './dist/style.css', () => {});