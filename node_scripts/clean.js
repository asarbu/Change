const fs = require('fs');

fs.unlink('./static/js/change.js', () => {});
fs.unlink('./dist/planning.json', () => {});
fs.unlink('./dist/manifest.json', () => {});
fs.unlink('./dist/style.css', () => {});
fs.unlink('./dist/planning.json', () => {});
fs.unlink('./dist/change.min.js', () => {});
