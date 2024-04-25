const fs = require('fs');
const path = require('path');

if (!fs.existsSync('./dist')) {
	fs.mkdirSync('./dist');
}

const jsPath = path.resolve('./dist/js');
if (fs.existsSync(jsPath)) {
	fs.unlink(jsPath, (error) => { if (error) throw new Error(error); });
}
const staticJsPath = path.resolve('./static/js');
fs.symlink(staticJsPath, jsPath, 'junction', (error) => { if (error) throw new Error(error); });

if (fs.existsSync('./dist/planning.json')) {
	fs.unlink('./dist/planning.json', (error) => { if (error) throw new Error(error); });
}
fs.copyFile('./static/js/planning.json', './dist/planning.json', () => {});

if (fs.existsSync('./dist/manifest.json')) {
	fs.unlink('./dist/manifest.json', (error) => { if (error) throw new Error(error); });
}
fs.copyFile('./manifest.json', './dist/manifest.json', () => {});

if (fs.existsSync('./dist/style.css')) {
	fs.unlink('./dist/style.css', (error) => { if (error) throw new Error(error); });
}
fs.copyFile('./static/css/style.css', './dist/style.css', () => {});

if (fs.existsSync('./dist/index.html')) {
	fs.unlink('./dist/index.html', (error) => { if (error) throw new Error(error); });
}
fs.copyFile('./static/html/index.html', './dist/index.html', () => {});
