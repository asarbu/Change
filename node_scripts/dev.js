const fs = require('fs');
const path = require('path');

if (fs.existsSync('./dist')) {
	fs.rmSync('./dist', { recursive: true, force: true }, (error) => { if (error) throw new Error(error); });
}
fs.mkdirSync('./dist');

// Use symlinks to avoid needing to reload changed files during development
const distJsPath = path.resolve('./dist/js');
const staticJsPath = path.resolve('./static/js');
fs.symlink(staticJsPath, distJsPath, 'junction', (error) => { if (error) throw new Error(error); });

const distCssPath = path.resolve('./dist/css');
const staticCssPath = path.resolve('./static/css');
fs.symlink(staticCssPath, distCssPath, 'junction', (error) => { if (error) throw new Error(error); });

const distIconsPath = path.resolve('./dist/icons');
const staticIconsPath = path.resolve('./static/icons');
fs.symlink(staticIconsPath, distIconsPath, 'junction', (error) => { if (error) throw new Error(error); });

fs.copyFile('./static/js/planning.json', './dist/planning.json', () => {});
fs.copyFile('./manifest.json', './dist/manifest.json', () => {});
fs.copyFile('./static/html/index.html', './dist/index.html', (error) => { if (error) throw new Error(error); });
fs.copyFile('./static/html/planning.html', './dist/planning.html', (error) => { if (error) throw new Error(error); });
fs.copyFile('./static/icons/favicon.ico', './dist/favicon.ico', (error) => { if (error) throw new Error(error); });
