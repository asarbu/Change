const fs = require('fs');

if (fs.existsSync('./dist')) {
	fs.rmSync('./dist', { recursive: true, force: true }, (error) => { if (error) throw new Error(error); });
}
if (!fs.existsSync('./dist')) {
	fs.mkdirSync('./dist');
}
