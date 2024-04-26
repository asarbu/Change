module.exports = {
	env: {
		browser: true,
		es2021: true,
	},
	extends: 'airbnb-base',
	overrides: [
		{
			files: ['tests/**/*'],
			env: {
				jest: true,
			},
		},
	],
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
	},
	rules: {
		'jsdoc/no-undefined-types': 1,
		'no-tabs': 0,
		indent: [1, 'tab'],
		'linebreak-style': ['error', 'windows'],
		'import/extensions': 0,
		'object-shorthand': 0,
		'newline-per-chained-call': [
			'error',
			{
				ignoreChainWithDepth: 5,
			},
		],
	},
	plugins: [
		'jsdoc',
	],
};
