module.exports = {
	env: {
		browser: true,
		es2021: true,
	},
	extends: 'airbnb-base',
	overrides: [
		{
			env: {
				node: true,
			},
			files: [
				'.eslintrc.{js,cjs}',
			],
			parserOptions: {
				sourceType: 'script',
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
		"newline-per-chained-call": [
			"error",
			{
				"ignoreChainWithDepth": 5
			}
		]
	},
	plugins: [
		'jsdoc',
	],
};
