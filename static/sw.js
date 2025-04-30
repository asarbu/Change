const staticCacheName = 'change-app-static-v1';
const dynamicCacheName = 'change-app-dynamic-v1';
const assets = [
	'static/css/materialize.css',
	'static/js/app.js',
	'static/js/gDrive.js',
	'static/js/gui.js',
	'static/js/icons.js',
	'static/js/idb.js',
	'static/js/init.js',
	'static/js/materialize.js',
	'static/js/planningCache.js',
	'static/js/planningController.js',
	'static/js/planningGdrive.js',
	'static/js/planningTab.js',
	'static/js/settings.js',
	'static/js/spendingCache.js',
	'static/js/spendingController.js',
	'static/js/spendingGdrive.js',
	'static/js/spendingTab.js',
	'static/manifest.json',

	'static/icons/icon-144x144.png',
	'static/icons/menu.svg',
];

window.addEventListener('install', (installEvent) => {
	installEvent.waitUntil(caches.open(staticCacheName).then((cache) => {
		try {
			cache.addAll(assets);
		} catch (err) {
			const errors = [];
			assets.forEach((i) => {
				try {
					cache.add(i);
				} catch (e) {
					errors.push(`Error at fetching file: ${i}. ${e.message}`);
				}
			});
			throw new Error(`Error at fetching files: ${errors.join(', ')}`);
		}
	}));
});

window.addEventListener('activate',	(activateEvent) => activateEvent
	.waitUntil(
		caches.keys().then(
			(keys) => Promise.all(
				keys.filter((key) => key !== staticCacheName)
					.map((key) => caches.delete(key)),
			),
		),
	));

window.addEventListener('fetch', (fetchEvent) => fetchEvent.respondWith(
	caches
		.match(fetchEvent.request)
		.then((res) => res
			|| fetch(fetchEvent.request)
			// TODO use only real cache after V1.0
			|| fetch(fetchEvent.request).then(
				(fetchRes) => caches.open(dynamicCacheName).then((cache) => {
					cache.put(fetchEvent.request.url, fetchRes.clone());
					return fetchRes;
				}),
			)),
));
