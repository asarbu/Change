const fs = require('fs');
const uglify = require('uglify-js');
const rollup = require('rollup');

if (!fs.existsSync('./dist')) {
	fs.mkdirSync('./dist');
}

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

if (fs.existsSync('./dist/app.js')) {
	fs.unlink('./dist/app.js', (error) => { if (error) throw new Error(error); });
}

const inputOptions = {
	input: './static/js/app.js',
};

const outputOptions = {
	format: 'es',
	file: './app.js',
};

rollup.rollup(inputOptions).then((bundle) => {
	bundle.generate(outputOptions).then(({ output }) => {
		output.forEach((chunk) => {
			const uglified = uglify.minify(chunk.code, { compress: true, mangle: true });
			if (uglified.error) {
				throw uglified.error;
			}
			if (!fs.existsSync('./dist/js')) {
				fs.mkdirSync('./dist/js');
			}
			fs.writeFile(`./dist/js/${chunk.fileName}`, uglified.code, (error) => {
				if (error) {
					throw error;
				}
			});
		});
	});
});
