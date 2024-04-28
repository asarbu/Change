const fs = require('fs');
const uglify = require('uglify-js');
const rollup = require('rollup');

if (fs.existsSync('./dist')) {
	fs.rmSync('./dist', { recursive: true, force: true }, (error) => { if (error) throw new Error(error); });
}
fs.mkdirSync('./dist');
fs.mkdirSync('./dist/js');
fs.mkdirSync('./dist/css');

fs.copyFile('./static/js/planning.json', './dist/planning.json', (error) => { if (error) throw new Error(error); });
fs.copyFile('./manifest.json', './dist/manifest.json', (error) => { if (error) throw new Error(error); });
fs.copyFile('./static/css/style.css', './dist/css/style.css', (error) => { if (error) throw new Error(error); });
fs.copyFile('./static/html/index.html', './dist/index.html', (error) => { if (error) throw new Error(error); });
fs.copyFile('./static/html/planning.html', './dist/planning.html', (error) => { if (error) throw new Error(error); });
fs.copyFile('./static/icons/favicon.ico', './dist/favicon.ico', (error) => { if (error) throw new Error(error); });
fs.cp('./static/icons', './dist/icons', { recursive: true }, (error) => { if (error) throw new Error(error); });

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
			if (uglified.error) { throw uglified.error;	}

			if (!fs.existsSync('./dist/js')) {
				fs.mkdirSync('./dist/js');
			}

			fs.writeFile(`./dist/js/${chunk.fileName}`, uglified.code, (error) => {
				if (error) { throw error; }
			});
		});
	});
});
