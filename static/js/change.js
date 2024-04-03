class Idb {
	static #READ_ONLY = 'readonly';

	static #READ_WRITE = 'readwrite';

	/** @type {IDBDatabase} */
	#db = undefined;

	/** @type {upgradeCallback} */
	#upgradeCallback = undefined;

	/**
	 * Avoid opening multiple IDBDatabases to be able to easily close the on update.
	 * @type {Array<Idb>}
	 * */
	static #connectedIdbs = [];

	/**
	 * Constructs, opens and initializes an instance of Idb objects
	 * @param {string} dbName Name of the database to open
	 * @param {upgradeDbCallback} upgradeCallback function to call when updating db
	 * @returns {Idb}
	 */
	static async of(dbName, upgradeCallback) {
		const connectedIdb = Idb.#connectedIdbs.find((idb) => idb.#db.name === dbName);
		if (connectedIdb) return connectedIdb;

		const db = await Idb.#open(dbName, undefined, upgradeCallback);
		const newIdb = new Idb(db, upgradeCallback);
		Idb.#connectedIdbs.push(newIdb);
		return newIdb;
	}

	/**
	 * Recoomendation is to not construct Idb objects directly.
	 * Use Idb.of() to initialize more efficient instances
	 * @constructor
	 * @param {IDBDatabase} db Database instance
	 * @param {upgradeDbCallback} upgradeCallback function to call when creating new object stores
	 */
	constructor(db, upgradeCallback) {
		this.#db = db;
		this.#upgradeCallback = upgradeCallback;
	}

	/**
	 * @typedef {function(db:db, number, number, Array<string>)} upgradeCallback
	 * @callback upgradeDbCallback
	 * @param {db} db Database to be upgraded.
	 * @param {number} oldVersion Version from which to upgrade
	 * @param {number} newVersion Version to which to upgrade.
	 * @param {Array<string>} storeNames Store names to create on upgrade.
	 * @returns {void}
	 */

	/**
	 * Opens an IndexedDb Database
	 * @param {string} dbName Database name
	 * @param {upgradeDbCallback} upgradeCallback called in case the database needs upgrage
	 * @returns {Promise<IDBDatabase>}
	 */
	static #open(dbName, version, upgradeCallback) {
		return new Promise((resolve, reject) => {
			if (!window.indexedDB) {
				return;
			}
			const request = indexedDB.open(dbName, version);

			request.onsuccess = (event) => {
				const db = event.target.result;
				resolve(db);
			};

			request.onerror = (event) => {
				reject(new Error(`Database error: ${event.target.error}`));
			};

			request.onupgradeneeded = (event) => {
				const db = event.target.result;
				if (upgradeCallback) {
					const defaultStore = new Date().getFullYear();
					upgradeCallback(db, event.oldVersion, event.newVersion, [defaultStore]);
				}
			};
		});
	}

	/**
	 * @param {string} storeName Database object store name
	 * @returns {Promise<Array<Object>>}
	 */
	openCursor(storeName) {
		return new Promise((resolve) => {
			const st = this.getStoreTransaction(storeName, Idb.#READ_ONLY);
			const store = st[0];
			const txn = st[1];

			const values = [];
			store.openCursor().onsuccess = (event) => {
				const cursor = event.target.result;
				if (cursor) {
					values.push(cursor.value);
					cursor.continue();
				}
			};
			txn.oncomplete = () => {
				resolve(values);
			};
		});
	}

	/**
	 * Insert in an object store a value. The key is optional, so leave it last
	 * @param {string} storeName Object store to create the object in
	 * @param {Object} value Value to store
	 * @param {(string|number)} [key] Optional. Key at which to store the object.
	 * @returns {Promise<Array<Object>>} A pair of [key, value] objects.
	 */
	insert(storeName, value, key) {
		return new Promise((resolve, reject) => {
			const store = this.getStoreTransaction(storeName, Idb.#READ_WRITE)[0];

			let query;
			if (key) {
				query = store.put(value, key);
			} else {
				query = store.put(value);
			}

			query.onsuccess = (event) => {
				resolve([event.target.result, value]);
			};

			query.onerror = (event) => {
				reject(event.target.errorCode);
			};
		});
	}

	/**
	 * Reads an object from the database given its' key
	 * @param {string} storeName Object store from where to read the object
	 * @param {(string|number)} key The identifier of the object
	 * @returns {Promise<Object>}
	 */
	get(storeName, key) {
		return new Promise((resolve, reject) => {
			const store = this.getStoreTransaction(storeName, Idb.#READ_ONLY)[0];
			const query = store.get(key);

			query.onsuccess = (event) => {
				if (!event.target.result) {
					reject(new Error(`The value with key ${key} not found`));
				} else {
					const value = event.target.result;
					resolve(value);
				}
			};
		});
	}

	/**
	 *
	 * @param {string} storeName Object store to look up
	 * @param {string} indexName Index Name from IndexedDb
	 * @param {IDBKeyRange} iDbKey Criteria to filter results
	 * @returns {Promise<Array<Object>>}
	 */
	getAllByIndex(storeName, indexName, iDbKey) {
		return new Promise((resolve) => {
			const st = this.getStoreTransaction(storeName, Idb.#READ_ONLY);
			const store = st[0];
			const txn = st[1];

			// console.log("Getting all by index", storeName, index, key)
			const values = [];
			store.index(indexName).openCursor(iDbKey).onsuccess = (event) => {
				const cursor = event.target.result;
				if (cursor) {
					cursor.value.id = cursor.primaryKey;
					values.push(cursor.value);
					cursor.continue();
				}
			};

			txn.oncomplete = () => {
				resolve(values);
			};
		});
	}

	/**
	 * Returns all the values from an object store
	 * @param {string} storeName Store from which to get the data
	 * @returns {Array<Object>}
	 */
	getAll(storeName) {
		return new Promise((resolve) => {
			const st = this.getStoreTransaction(storeName, Idb.#READ_ONLY);
			const store = st[0];
			const txn = st[1];

			// console.log("Getting all by index", storeName, index, key)
			let values = [];
			const request = store.getAll();
			request.onsuccess = () => {
				values = request.result;
			};

			txn.oncomplete = () => {
				resolve(values);
			};
		});
	}

	/**
	 * Count number of objects in store
	 * @param {string} storeName Object store to look up
	 * @returns {Promise<number>}
	 */
	count(storeName) {
		return new Promise((resolve) => {
			const store = this.getStoreTransaction(storeName, Idb.#READ_ONLY)[0];

			const query = store.count();
			query.onsuccess = () => {
				resolve(query.result);
			};
		});
	}

	/**
	 * TODO Check what result contains
	 * Deletes all of the objects in the store
	 * @param {string} storeName Object store to look up
	 * @returns {Promise<number>} Result or error code
	 */
	clear(storeName) {
		return new Promise((resolve, reject) => {
			const store = this.getStoreTransaction(storeName, Idb.#READ_WRITE)[0];

			const query = store.clear();
			query.onsuccess = (event) => {
				resolve(event.target.result);
			};
			query.onerror = (event) => {
				reject(event.target.errorCode);
			};
		});
	}

	/**
	 * Delete object from store by id.
	 * @param {string} storeName Object store to look up
	 * @param {(string|number)} key The identifier of the object
	 * @returns {Promise<undefined>}
	 */
	delete(storeName, key) {
		return new Promise((resolve, reject) => {
			const store = this.getStoreTransaction(storeName, Idb.#READ_WRITE)[0];
			const query = store.delete(key);

			query.onsuccess = (event) => {
				resolve(event.target.result);
			};

			// handle the error case
			query.onerror = (event) => {
				reject(event);
			};
		});
	}

	/**
	 * Puts all of the properties of the object in the store.
	 * Function is using the property name as store key and property value as store value
	 * @param {string} storeName Object store to look up
	 * @param {Array<String, any>} data enumerator returned by Object.entries(...)
	 * @returns {Promise<number>} Result
	 */
	async putAll(storeName, data) {
		return new Promise((resolve) => {
			const [store, transaction] = this.getStoreTransaction(storeName, Idb.#READ_WRITE);

			for (let i = 0; i < data.length; i += 1) {
				const value = data[i];
				const key = data[i].id;
				if (key) {
					store.put(value, key);
				} else {
					store.put(value);
				}
			}

			transaction.oncomplete = (event) => {
				resolve([event.target.result]);
			};
		});
	}

	/**
	 * Update all of the values in the object store.
	 * @param {string} storeName Object store to look up
	 * @param {Array<Object>} data Items to update in store.
	 * @returns
	 */
	async updateAll(storeName, data) {
		// console.log("IDB put all:", storeName, data);
		return new Promise((resolve) => {
			const [store, transaction] = this.getStoreTransaction(storeName, Idb.#READ_WRITE);
			for (let i = 0; i < data.length; i += 1) {
				const item = data[i];
				store.put(item.value, item.key);
			}

			transaction.oncomplete = (event) => {
				resolve([event.target.result]);
			};
		});
	}

	/**
	 * Check if object store exists in the current database instance
	 * @param {string} storeName Object store to look up
	 * @returns {Boolean}
	 */
	hasObjectStore(storeName) {
		if (this.#db.objectStoreNames.contains(storeName)) {
			return true;
		}
		return false;
	}

	/**
	 * Get an array with the names of all object stores
	 * @returns {Array<string>}
	 */
	getObjectStores() {
		/** @type {Array<string>} */
		const objectStoreNames = [];
		/** @type {DOMStringList} */

		const domStringList = this.#db.objectStoreNames;
		for (let index = 0; index < domStringList.length; index += 1) {
			objectStoreNames.push(domStringList.item(index));
		}
		return objectStoreNames;
	}

	/**
	 * !! This increments the database version !!
	 * @param {Array<string>} storeNames
	 * @returns {Promise<IDBDatabase>}
	 */
	createObjectStores(storeNames) {
		return new Promise((resolve, reject) => {
			const { name, version } = this.#db;
			this.#db.close();
			const request = indexedDB.open(name, version + 1);

			request.onsuccess = (event) => {
				const db = event.target.result;
				this.#db = db;
				resolve(db);
			};

			request.onerror = (event) => {
				reject(new Error(`Database error: ${event.target.error}`));
			};

			request.onupgradeneeded = (event) => {
				const db = event.target.result;
				if (this.#upgradeCallback) {
					this.#upgradeCallback(db, event.oldVersion, event.newVersion, storeNames);
				}
			};

			request.onblocked = (event) => {
				throw Error(`Request was blocked: ${event.newVersion}`);
			};
		});
	}

	/**
	 *
	 * @param {string} storeName Object store to look up
	 * @param {string} mode #READ_ONLY or #READ_WRITE
	 * @returns {Array<Object>}
	 */
	getStoreTransaction(storeName, mode) {
		if (!this.#db.objectStoreNames.contains(storeName)) {
			return undefined;
		}

		const txn = this.#db.transaction(storeName, mode);
		const store = txn.objectStore(storeName);

		return [store, txn];
	}
}

// Too much overhead to split the planning model into individual files
// eslint-disable-next-line max-classes-per-file

/**
 * @class
 */
class Statement {
	static INCOME = 'Income';

	static EXPENSE = 'Expense';

	static SAVING = 'Saving';

	/**
	 *
	 * @param {string} id Unique identifier of the statement
	 * @param {string} name User friendly name of statement
	 * @param {String} type Statically defined statement type
	 */
	constructor(id, name, type) {
		/**
		 * @type{number}
		 */
		this.id = id;
		/**
		 * @type{string}
		 */
		this.name = name;
		/**
		 * @type{string}
		 */
		this.type = type;
		/**
		 * @type{Array<PlanningCategory>}
		 */
		this.categories = [];
	}
}

class Category {
	/**
	 *
	 * @param {string} id
	 * @param {string} name
	 */
	constructor(id, name) {
		/**
		 * @type{string}
		 */
		this.id = id;
		/**
		 * @type{string}
		 */
		this.name = name;
		/**
		 * @type{Array<Goal>}
		 */
		this.goals = [];
	}
}

class PlanningCache {
	static DATABASE_NAME = 'Planning';

	static PLANNING_TEMPLATE_URI = 'static/js/planning.json';

	/** @type {Idb} */
	idb = undefined;

	/**
	 * Returns all planning caches in the database, initialized
	 * @constructs PlanningCache
	 * @returns {Promise<Array<PlanningCache>>}
	 */
	static async getAll() {
		const idb = await Idb.of(
			PlanningCache.DATABASE_NAME,
			PlanningCache.upgradePlanningDatabase,
		);

		const objectStores = idb.getObjectStores();
		const planningsArray = new Array(objectStores.length);
		const initPlanningPromises = [];
		for (let i = 0; i < objectStores.length; i += 1) {
			const storeName = objectStores[i];
			const planningCache = new PlanningCache(storeName, idb);
			planningsArray[i] = (planningCache);
			initPlanningPromises.push(planningCache.init());
		}
		await Promise.all(initPlanningPromises);
		return planningsArray;
	}

	/**
	 * Callback function to update a planning database
	 * @param {IDBDatabase} db Database to upgrade
	 * @param {number} oldVersion Version from which to update
	 * @param {number} newVersion Version to which to update
	 * @returns {undefined}
	 */
	static upgradePlanningDatabase(db, oldVersion, newVersion) {
		if (!newVersion) {
			return;
		}

		const store = db.createObjectStore(newVersion, { autoIncrement: true });
		store.createIndex('byType', 'type', { unique: false });
	}

	/**
	 * @param {string} year Object store name associated with this object
	 * @param {Idb} idb Idb instance
	 */
	constructor(year, idb) {
		if (!idb) {
			this.idb = Idb.of(
				PlanningCache.DATABASE_NAME,
				PlanningCache.upgradePlanningDatabase,
			);
		} else {
			this.idb = idb;
		}

		this.year = +year;
	}

	/**
	 * Initialize current instance of PlanningCache
	 */
	async init() {
		const storeCount = await this.idb.count(this.year);
		if (storeCount === 0) {
			await fetch(PlanningCache.PLANNING_TEMPLATE_URI)
				.then((response) => response.json())
				.then((planningFile) => this.idb.putAll(this.year, planningFile));
		}
	}

	/**
	 * Read all planning statements from the cache
	 * @returns {Promise<Array<Statement>>}
	 */
	async readAll() {
		return this.idb.openCursor(this.year);
	}

	/**
	 * Updates all of the statements from the current object store
	 * @async
	 * @param {Array<Statement>} statements Statenents to be updated in dabatase
	 */
	async updateAll(statements) {
		await this.idb.clear(this.year);
		await this.idb.putAll(this.year, statements);
	}

	/**
	 * Fetch only the categories of type "Expense"
	 * @async
	 * @returns {Array<Category>}
	 */
	async readExpenseCategories() {
		const keyRange = IDBKeyRange.only('Expense');
		const expenseStatements = await this.idb.getAllByIndex(this.year, 'byType', keyRange);
		const expenses = [];
		for (let i = 0; i < expenseStatements.length; i += 1) {
			expenses.push(...expenseStatements[i].categories);
		}
		return expenses;
	}

	/**
	 * Fetch only the planning categories from the current object store
	 * @async
	 * @returns {Array<Category>}
	 */
	async readCategories() {
		return this.idb.openCursor(this.year);
	}

	/**
	 * Fetch only the planning statement corresponding to the key
	 * @async
	 * @param {string} key Key to lookup in the datastore
	 * @returns {Statement}
	 */
	async read(key) {
		return this.idb.get(this.year, key);
	}

	/**
	 * Update a single Planning statement in the database
	 * @async
	 * @param {string} key Key to lookup in the datastore
	 * @param {Statement} value Value to update
	 * @returns {Statement} Updated value
	 */
	async update(key, value) {
		await this.idb.insert(this.year, value, key);
	}

	/**
	 * Delete a single Planning statenent in the database
	 * @async
	 * @param {string} key Key to lookup in the datastore
	 * @returns {Statement} Deleted value
	 */
	async delete(key) {
		await this.idb.delete(this.year, key);
	}
}

class GraphicEffects {
	constructor() {
		/* Slice slider */
		this.rootContainer = undefined;
		this.mouseDown = false;
		this.scrolling = undefined;
		this.currentIndex = 1;
		this.startX = 0;
		this.startY = 0;

		this.startSliderEventListener = this.startSlider.bind(this);
		this.moveSliderEventListener = this.moveSlider.bind(this);
		this.endSliderEventListener = this.endSlider.bind(this);
		this.refreshEventListener = this.refresh.bind(this);

		/* Navigation panel */
		this.navOpen = false;
	}

	init(forContainer) {
		/* Slice slider */
		this.rootContainer = forContainer;
		// TDO use percentages instead of width
		// this.containerWidth = this.rootContainer.clientWidth;
		this.sliderWrapper = this.rootContainer.querySelector('.section');
		this.lastIndex = this.sliderWrapper.children.length + 1;
		// TDO reuse in memory DOM elements in order to accelerate reflows (use few DOM nodes)
		// This also ensures we have proper scroll position. We enable slide for > 3 slices
		// appened cloneNodes to the parent element.
		// const $clonedFirstChild = this.sliderWrapper.firstElementChild.cloneNode(true);
		// const $clonedLastChild = this.sliderWrapper.lastElementChild.cloneNode(true);
		// this.sliderWrapper.insertBefore($clonedLastChild, this.sliderWrapper.firstElementChild);
		// this.sliderWrapper.appendChild($clonedFirstChild);
		/* this.sliderWrapper.style.transition = 'transform 0s linear';
		this.sliderWrapper.style.transform = `translateX(${-this.containerWidth * 1}px)`; */

		this.slices = this.rootContainer.querySelectorAll('.slice');
		this.slices.forEach((el, i) => {
			el.setAttribute('data-slice-index', i);
		});

		this.currentIndex = 0;

		// * when mousedown or touchstart
		this.sliderWrapper.addEventListener('mousedown', this.startSliderEventListener);
		this.sliderWrapper.addEventListener('touchmove', this.startSliderEventListener, { passive: true });

		// * when mouseup or touchend
		// TODO This registers the event listener multiple times
		window.addEventListener('mouseup', this.endSliderEventListener);
		window.addEventListener('touchend', this.endSliderEventListener);
		window.addEventListener('resize', this.refreshEventListener, true);
		// this.setSlide(this.currentIndex);

		/* nav panel */
		this.$main = document.getElementById('main');
		this.$sidenav_left = document.getElementById('sidenav');
		this.$sidenav_right = this.$sidenav_left.cloneNode(true);
		this.$sidenav_left.classList.add('sidenav-left');
		this.$sidenav_right.classList.add('sidenav-right');
		this.$sidenav_left.parentNode.appendChild(this.$sidenav_right);

		document.querySelectorAll('.nav-trigger').forEach((el) => el.addEventListener('click', this.openNav.bind(this)));
	}

	slideTo(index) {
		if (!this.containerWidth) {
			this.containerWidth = this.rootContainer.clientWidth;
		}

		this.currentIndex = +index;
		this.currentIndex = Math.min(this.currentIndex, this.lastIndex);
		requestAnimationFrame(() => {
			this.sliderWrapper.style.transition = 'transform 0.2s linear';
			this.sliderWrapper.style.transform = `translateX(${-this.containerWidth * index}px)`;
		});
	}

	selectedIndex() {
		return this.currentIndex;
	}

	onClickSetSlice(e) {
		const sliceIndex = e.target.getAttribute('data-slice-index');
		this.slideTo(sliceIndex);
	}

	startSlider(e) {
		this.mouseDown = true;
		if (!this.containerWidth) {
			this.containerWidth = this.rootContainer.clientWidth;
		}

		// check desktop or mobile
		this.startX = e.clientX ? e.clientX : e.touches[0].screenX;
		this.startY = e.clientY ? e.clientY : e.touches[0].screenY;

		this.sliderWrapper.removeEventListener('touchmove', this.startSliderEventListener);
		this.sliderWrapper.style.transition = 'transform 0s linear';
		this.rootContainer.addEventListener(
			e.clientX ? 'mousemove' : 'touchmove',
			this.moveSliderEventListener,
			{ passive: true },
		);
	}

	moveSlider(e) {
		if (!this.mouseDown) return;

		const currentX = e.clientX || e.touches[0].screenX;
		const currentY = e.clientY || e.touches[0].screenY;

		requestAnimationFrame(() => {
			if (!this.scrolling) {
				// Check scroll direction
				if (Math.abs(currentY - this.startY) > 10) { // Vertical
					// Needed to avoid glitches in horizontal scrolling
					this.scrolling = 'vertical';
					// Reset horizontal scroll to zero, by resetting the slide index
					this.slideTo(this.currentIndex);
					return;
				} if (Math.abs(currentX - this.startX) > 10) { // Horizontal
					this.scrolling = 'horizontal';
				}
			}

			// Allow horizontal scroll even if no scroll is present.
			// Vertical is allowed by default.
			if (this.scrolling === undefined || this.scrolling === 'horizontal') {
				const xTranslation = currentX - this.startX - this.containerWidth * (this.currentIndex);
				this.sliderWrapper.style.transform = `translateX(${xTranslation}px)`;
			}
		});
	}

	endSlider(e) {
		/*if (!this.mouseDown || !e) return;

		this.mouseDown = false;
		if (this.scrolling === 'horizontal') {
			let x = e.clientX;
			// x evaluates to 0 if you drag left to the end of the body)
			if (!x && e.changedTouches) {
				x = e.changedTouches[0].screenX;
			}

			const dist = x - this.startX || 0;

			if (dist > 50 && this.currentIndex > 0) this.currentIndex -= 1;
			else if (dist < -50 && this.currentIndex < this.lastIndex - 2) this.currentIndex += 1;
			this.slideTo(this.currentIndex);
		}
		this.sliderWrapper.addEventListener('touchmove', this.startSliderEventListener, { passive: true });
		this.scrolling = undefined;*/
	}

	refresh() {
		this.containerWidth = this.rootContainer.clientWidth;
		this.slideTo(this.currentIndex);
	}

	/* Nav panel */
	openNav(ev) {
		const { side } = ev.currentTarget.dataset;
		if (side === 'left') {
			if (this.navOpen === 'left') {
				this.closeNav();
				return;
			}

			this.$sidenav_right.classList.remove('sidenav-open');
			this.$sidenav_left.classList.add('sidenav-open');
			this.$main.classList.remove('main-shift-right');
			this.$main.classList.add('main-shift-left');

			this.navOpen = 'left';
		} else if (side === 'right') {
			if (this.navOpen === 'right') {
				this.closeNav();
				return;
			}

			this.$sidenav_left.classList.remove('sidenav-open');
			this.$sidenav_right.classList.add('sidenav-open');
			this.$main.classList.remove('main-shift-left');
			this.$main.classList.add('main-shift-right');

			this.navOpen = 'right';
		}

		this.$main.addEventListener('transitionend', function transitioned() {
			this.$main.removeEventListener('transitionend', transitioned);
			this.refresh();
		}.bind(this));
	}

	closeNav() {
		this.$sidenav_left.classList.remove('sidenav-open');
		this.$sidenav_right.classList.remove('sidenav-open');
		this.$main.classList.remove('main-shift-left');
		this.$main.classList.remove('main-shift-right');

		this.navOpen = undefined;
		this.$main.addEventListener('transitionend', function transitioned() {
			this.$main.removeEventListener('transitionend', transitioned);
			this.refresh();
		}.bind(this));
	}
}

/* function createRow(table, data, options) {
	var index = -1;
	if (options.index) {
		index = options.index;
	}
	const row = table.tBodies[0].insertRow(index);
	var dataCell;

	for (const dataCtn of Object.values(data)) {
		dataCell = row.insertCell(-1);
		dataCell.textContent = dataCtn;
		if (!options.readonly) {
			dataCell.setAttribute('editable', true);
		}
		if (options.useBold == true) {
			dataCell.style.fontWeight = 'bold';
		}
	}

	if (options.color) {
		dataCell.style.color = options.color;
	}

	if (options.deletable) {
		const buttonsCell = row.insertCell(-1);
		const btn = create('button');
		btn.classList.add('waves-effect', 'waves-light', 'red', 'btn-small');
		buttonsCell.appendChild(btn);
		const img = create('img');
		img.classList.add('white-fill');
		img.innerText = 'Delete';
		img.alt = 'Delete';
		img.src = icons.delete;
		btn.appendChild(img)

		buttonsCell.setAttribute('hideable', 'true');
		if (options.hidden) {
			buttonsCell.style.display = 'none';
		}
	}
	// console.log("Created row", row)
	return row;
}

var percentColors = [
	{ pct: 0.0, color: { r: 0x00, g: 0xdf, b: 0 } },
	{ pct: 0.5, color: { r: 0xdf, g: 0xdf, b: 0 } },
	{ pct: 1.0, color: { r: 0xdf, g: 0x00, b: 0 } }];

function getColorForPercentage(pct) {

	if (pct > 1) {
		pct = 1
	}

	for (var i = 1; i < percentColors.length - 1; i++) {
		if (pct < percentColors[i].pct) {
			break;
		}
	}
	var lower = percentColors[i - 1];
	var upper = percentColors[i];
	var range = upper.pct - lower.pct;
	var rangePct = (pct - lower.pct) / range;
	var pctLower = 1 - rangePct;
	var pctUpper = rangePct;
	var color = {
		r: Math.floor(lower.color.r * pctLower + upper.color.r * pctUpper),
		g: Math.floor(lower.color.g * pctLower + upper.color.g * pctUpper),
		b: Math.floor(lower.color.b * pctLower + upper.color.b * pctUpper)
	};
	return 'rgb(' + [color.r, color.g, color.b].join(',') + ')';
	// or output as hex if preferred
}; */

/**
 * Creates and decorates a new DOM Element
 * @param {string} ofType Type of element to be created
 * @param {Array} properties.classes Classes to be added to the DOM classlist
 * @param {HTMLElement} withParent Parent to bind the newly created element to
 * @returns {HTMLElement}
 */
function create(ofType, havingProperties, withParent) {
	const elmt = document.createElement(ofType);

	if (havingProperties) {
		Object.entries(havingProperties).forEach(([key, value]) => {
			if (key === 'classes') {
				elmt.classList.add(...value);
			} else {
				elmt[key] = value;
			}
		});
	}

	if (withParent) {
		withParent.appendChild(elmt);
	}

	return elmt;
}

/**
 * Creates an HTML element and appends it to a parent.
 * @param {string} ofType HTML element type to create
 * @param {HTMLElement} withParent Parent where to append the element
 * @returns {HTMLElement}
 */
function createChild(ofType, withParent) {
	const elmt = document.createElement(ofType);
	withParent.appendChild(elmt);
	return elmt;
}

/**
 * @param {string} text Text to display in button. TODO remove if notused
 * @param {Array<string>} classList Array of classes to decorate button. TODO remove if not used
 * @param {string} src String that represents the icon inside the button
 * @param {HTMLElement} parent Parent to append this button to.
 * @param {Function} onClick Callback function to bind to 'click' event
 * @returns {HTMLButtonElement}
 */
function createImageButton(text, classList, src, parent, onClick) {
	// TODO Add event listener for on click in params
	const btn = create('button');
	btn.classList.add(...classList);
	const img = create('img');
	img.classList.add('white-fill');
	img.textContent = text;
	img.alt = text;
	img.src = src;
	btn.appendChild(img);
	if (parent) {
		parent.appendChild(btn);
	}
	if (onClick) {
		btn.addEventListener('click', onClick);
	}
	return btn;
}

class icons {
	/* Downloaded from https://pictogrammers.com/
		Converted to data image svg + xml using https://heyallan.github.io/svg-to-data-uri/
	*/
	static save = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z' /%3E%3C/svg%3E";

	static edit = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z' /%3E%3C/svg%3E";

	static delete = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z' /%3E%3C/svg%3E";

	static delete_file = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M22.54 21.12L20.41 19L22.54 16.88L21.12 15.46L19 17.59L16.88 15.46L15.46 16.88L17.59 19L15.46 21.12L16.88 22.54L19 20.41L21.12 22.54M6 2C4.89 2 4 2.9 4 4V20C4 21.11 4.89 22 6 22H13.81C13.45 21.38 13.2 20.7 13.08 20H6V4H13V9H18V13.08C18.33 13.03 18.67 13 19 13C19.34 13 19.67 13.03 20 13.08V8L14 2M8 12V14H16V12M8 16V18H13V16Z' /%3E%3C/svg%3E";

	static hand_coin = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M16 2C13.24 2 11 4.24 11 7S13.24 12 16 12 21 9.76 21 7 18.76 2 16 2M16 10C14.34 10 13 8.66 13 7S14.34 4 16 4 19 5.34 19 7 17.66 10 16 10M19 16H17C17 14.8 16.25 13.72 15.13 13.3L8.97 11H1V22H7V20.56L14 22.5L22 20V19C22 17.34 20.66 16 19 16M5 20H3V13H5V20M13.97 20.41L7 18.5V13H8.61L14.43 15.17C14.77 15.3 15 15.63 15 16C15 16 13 15.95 12.7 15.85L10.32 15.06L9.69 16.96L12.07 17.75C12.58 17.92 13.11 18 13.65 18H19C19.39 18 19.74 18.24 19.9 18.57L13.97 20.41Z' /%3E%3C/svg%3E";

	static menu = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z' /%3E%3C/svg%3E";

	static add_row = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M22,10A2,2 0 0,1 20,12H4A2,2 0 0,1 2,10V3H4V5H8V3H10V5H14V3H16V5H20V3H22V10M4,10H8V7H4V10M10,10H14V7H10V10M20,10V7H16V10H20M11,14H13V17H16V19H13V22H11V19H8V17H11V14Z' /%3E%3C/svg%3E";

	static add_table = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12.35 20H10V17H12.09C12.21 16.28 12.46 15.61 12.81 15H10V12H14V13.54C14.58 13 15.25 12.61 16 12.35V12H20V12.35C20.75 12.61 21.42 13 22 13.54V5C22 3.9 21.1 3 20 3H4C2.9 3 2 3.9 2 5V20C2 21.1 2.9 22 4 22H13.54C13 21.42 12.61 20.75 12.35 20M16 7H20V10H16V7M10 7H14V10H10V7M8 20H4V17H8V20M8 15H4V12H8V15M8 10H4V7H8V10M17 14H19V17H22V19H19V22H17V19H14V17H17V14' /%3E%3C/svg%3E";

	static add_file = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M23 18H20V15H18V18H15V20H18V23H20V20H23M6 2C4.89 2 4 2.9 4 4V20C4 21.11 4.89 22 6 22H13.81C13.45 21.38 13.2 20.7 13.08 20H6V4H13V9H18V13.08C18.33 13.03 18.67 13 19 13C19.34 13 19.67 13.03 20 13.08V8L14 2M8 12V14H16V12M8 16V18H13V16Z' /%3E%3C/svg%3E";

	static add = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z' /%3E%3C/svg%3E";

	static summary = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M22,21H2V3H4V19H6V10H10V19H12V6H16V19H18V14H22V21Z' /%3E%3C/svg%3E";
}

/* eslint-disable class-methods-use-this */

class PlanningScreen {
	onClickUpdate = undefined;

	/**
	 * Constructor
	 * @param {string} id Unique identifier of the screen
	 * @param {Array<Statement>} statements Statements to draw on the screen
	 */
	constructor(id, statements) {
		/** @type { Array<Statement> } */
		this.statements = statements;
		/** @type {string} */
		this.id = id;
		/** @type {boolean} */
		this.editMode = false;
	}

	/**
	 * Initialize the current screen
	 */
	init() {
		this.gfx = new GraphicEffects();
		this.container = this.sketchAsFragment();
		this.navbar = this.sketchNavBar();
	}

	// #region DOM creation

	/**
	 * Creates all necessary objects needed to draw current screen
	 * @returns {DocumentFragment}
	 */
	sketchAsFragment() {
		const container = create('div', { id: this.id, classes: ['container'] });
		const section = create('div', { classes: ['section'] });

		// TODO Merge this with navbar creation, since we are iterating through same array.
		for (let i = 0; i < this.statements.length; i += 1) {
			const statement = this.statements[i];
			const htmlStatement = this.sketchStatement(statement);
			htmlStatement.userData = statement;

			section.appendChild(htmlStatement);
		}

		container.appendChild(section);

		return container;
	}

	/**
	 * Creates a DOM statement
	 * @param {Statement} statement Statement representing this slice
	 * @returns {HTMLDivElement} Constructed and decorated DOM element
	 */
	sketchStatement(statement) {
		const slice = create('div', { classes: ['slice'] });
		const h1 = create('h1', { textContent: statement.name });
		h1.setAttribute('editable', 'true');
		h1.addEventListener('keyup', this.onKeyUpStatementName.bind(this), false);
		if (this.editMode) {
			h1.setAttribute('contenteditable', 'true');
		}
		const span = create('span', { textContent: '▼', classes: ['white-50'] });

		const statementTypeDropdown = create('div', { classes: ['dropdown-content', 'top-round', 'bot-round'] });
		statementTypeDropdown.style.display = 'none';
		const h2 = create('h2', { classes: [], textContent: `${this.statements[0].type} ` });
		h2.addEventListener('click', this.onClickDropup.bind(this, statementTypeDropdown));
		h2.setAttribute('hideable', 'true');
		if (!this.editMode) h2.style.display = 'none';
		const expenseAnchor = create('div', { textContent: Statement.EXPENSE });
		expenseAnchor.addEventListener('click', this.onClickChangeStatementType.bind(this));
		statementTypeDropdown.appendChild(expenseAnchor);

		const incomeAnchor = create('div', { textContent: Statement.INCOME });
		incomeAnchor.addEventListener('click', this.onClickChangeStatementType.bind(this));
		statementTypeDropdown.appendChild(incomeAnchor);

		const savingAnchor = create('div', { textContent: Statement.SAVING });
		savingAnchor.addEventListener('click', this.onClickChangeStatementType.bind(this));
		statementTypeDropdown.appendChild(savingAnchor);

		h2.appendChild(span);
		h2.appendChild(statementTypeDropdown);

		const addCategoryButton = createImageButton('Add Category', [], icons.add_table, undefined, this.onClickAddCategory.bind(this));
		addCategoryButton.setAttribute('hideable', 'true');
		if (!this.editMode) addCategoryButton.style.display = 'none';
		slice.appendChild(h1);
		slice.appendChild(h2);

		const tables = this.sketchCategory(statement.categories);
		slice.appendChild(tables);
		slice.appendChild(addCategoryButton);

		return slice;
	}

	/**
	 * Creates a Document Fragment containing all of the tables constructed from the categories.
	 * @param {Array<Category>} planningCategories Categories to draw inside parent statement
	 * @returns {DocumentFragment} Document fragment with all of the created tables
	 */
	sketchCategory(planningCategories) {
		const tableFragment = document.createDocumentFragment();
		for (let i = 0; i < planningCategories.length; i += 1) {
			const planningCategory = planningCategories[i];
			const table = create('table', { id: planningCategory.id, classes: ['top-round', 'bot-round'] });
			tableFragment.appendChild(table);
			const thead = createChild('thead', table);
			createChild('tbody', table);

			table.userData = planningCategory;

			const headingRow = createChild('tr', thead);
			const nameCol = create('th', { textContent: planningCategory.name }, headingRow);
			nameCol.setAttribute('editable', 'true');
			if (this.editMode) {
				nameCol.setAttribute('contenteditable', 'true');
			}
			nameCol.addEventListener('keyup', this.onKeyUpCategoryName.bind(this), false);

			// TODO replace this with Add row
			create('th', { textContent: 'Daily' }, headingRow);
			create('th', { textContent: 'Monthly' }, headingRow);
			create('th', { textContent: 'Yearly' }, headingRow);
			const buttons = createChild('th', headingRow);
			createImageButton('Delete Row', [], icons.delete, buttons, this.onClickDeleteCategory.bind(this));

			buttons.setAttribute('hideable', 'true');
			if (!this.editMode) buttons.style.display = 'none';

			for (let j = 0; j < planningCategory.goals.length; j += 1) {
				const planningGoal = planningCategory.goals[j];

				const deleteButton = createImageButton('Delete goal', [], icons.delete, undefined, this.onClickDeleteGoal.bind(this));
				this.sketchRow(
					table,
					planningGoal,
					{
						index: -1,
						hideLastCell: true,
						lastCellContent: deleteButton,
					},
				);
			}
			this.recomputeTotal(table, true);
		}

		return tableFragment;
	}

	/**
	 * Creates a new row in the table, fills the data and decorates it.
	 * @param {HTMLTableElement} table Table where to append row
	 * @param {Goal} item Goal data to fill in the row
	 * @param {Object} options Format options for the row
	 * @param {Number} options.index Position to add the row to. Defaults to -1 (last)
	 * @param {Boolean} options.hideLastCell Hide last cell of the row
	 * @param {Boolean} options.readonly Make the row uneditable
	 * @param {HTMLButtonElement} options.lastCellContent Optional element to add to last cell
	 * @returns {HTMLTableRowElement} Row that was created and decorated. Contains Goal in userData
	 */
	sketchRow(table, item, options) {
		let index = -1;
		if (Object.prototype.hasOwnProperty.call(options, 'index')) {
			index = options.index;
		}
		const row = table.tBodies[0].insertRow(index);
		row.id = item.id;
		row.userData = item;

		this.sketchDataCell(row, item.name, options);
		this.sketchDataCell(row, item.daily, options);
		this.sketchDataCell(row, item.monthly, options);
		this.sketchDataCell(row, item.yearly, options);

		const buttonsCell = row.insertCell(-1);

		if (options?.lastCellContent) {
			buttonsCell.appendChild(options.lastCellContent);
		}

		buttonsCell.setAttribute('hideable', 'true');
		if (options?.hideLastCell && !this.editMode) {
			buttonsCell.style.display = 'none';
		}
		return row;
	}

	/**
	 * Creates and decorates a new data cell to be appended in a table row
	 * @param {HTMLTableRowElement} row Row to populate with data cells
	 * @param {string} text Text to display
	 * @param {Object} options Miscelatious options for this data cell
	 * @param {boolean} options.readonly Makes the cell uneditable
	 * @param {boolean} options.color Paints the text a certain color (#000000)
	 * @returns {HTMLTableCellElement}
	 */
	sketchDataCell(row, text, options) {
		// console.log("Create data cell", text, options.readonly)
		const dataCell = row.insertCell(-1);
		dataCell.textContent = text;
		if (!options?.readonly) {
			dataCell.setAttribute('editable', 'true');
			if (this.editMode) {
				dataCell.setAttribute('contenteditable', 'true');
			}
			dataCell.addEventListener('keyup', this.onKeyUpGoal.bind(this), false);
		}

		if (options?.color) {
			dataCell.style.color = options.color;
		}
		return dataCell;
	}

	/**
	 * Activate the current screen and all its effects.
	 */
	activate() {
		const mainElement = document.getElementById('main');
		mainElement.appendChild(this.container);
		mainElement.appendChild(this.navbar);
		this.gfx.init(this.container);
	}

	/**
	 * Creates and populates the navbar with relevant information for this screen
	 * @returns {HTMLElement}
	 */
	sketchNavBar() {
		const navbar = create('nav');
		const navHeader = create('div', { classes: ['nav-header'] }, navbar);
		const addStatementButton = createImageButton('Add', ['nav-item'], icons.add_file, navHeader, this.onClickAddStatement.bind(this));
		this.editButton = createImageButton('Edit', ['nav-item'], icons.edit, navHeader, this.onClickEdit.bind(this));
		this.saveButton = createImageButton('Save', ['nav-item'], icons.save, undefined, this.onClickSave.bind(this));
		const deleteStatement = createImageButton('Add', ['nav-item'], icons.delete_file, navHeader, this.onClickDeleteStatement.bind(this));
		addStatementButton.style.display = 'none';
		addStatementButton.setAttribute('hideable', true);
		deleteStatement.style.display = 'none';
		deleteStatement.setAttribute('hideable', true);

		const navFooter = create('div', { classes: ['nav-footer'] }, navbar);
		const leftMenuButton = createImageButton('Menu', ['nav-item', 'nav-trigger'], icons.menu, navFooter);
		leftMenuButton.setAttribute('data-side', 'left');
		/* const yearDropup = create('button', {
			textContent: `${this.id} `,
			classes: ['dropup', 'nav-item'] },
			navFooter
		); */

		const span = create('span', { textContent: '▲', classes: ['white-50'] });
		const statementDropupButton = create('button', { classes: ['nav-item'], textContent: `${this.statements[0].name} ` }, navFooter);

		const statementDropupContent = create('div', { classes: ['dropup-content', 'top-round'] });
		statementDropupContent.style.display = 'none';
		statementDropupButton.addEventListener('click', this.onClickDropup.bind(this, statementDropupContent));

		for (let i = 0; i < this.statements.length; i += 1) {
			const statement = this.statements[i];
			const anchor = create('div', { textContent: statement.name });
			anchor.setAttribute('data-slice-index', i);
			anchor.addEventListener('click', this.onClickShowStatement.bind(this, statementDropupButton));
			statementDropupContent.appendChild(anchor);
		}

		statementDropupButton.appendChild(span);
		navbar.appendChild(statementDropupContent);
		const rightMenuButton = createImageButton('Menu', ['nav-item', 'nav-trigger'], icons.menu, navFooter);
		rightMenuButton.setAttribute('data-side', 'right');
		return navbar;
	}
	// #endregion

	// #region DOM manipulation
	/** Refresh screen */
	refresh(statements) {
		this.statements = statements;
		const newContainer = this.sketchAsFragment();
		const mainElement = document.getElementById('main');
		mainElement.replaceChild(newContainer, this.container);
		this.container = newContainer;
	}

	// Recompute from DOM instead of memory/db/network to have real time updates in UI
	/**
	 * Computes the column wise total value of the table and inserts it into the last row.
	 * @param {HTMLTableElement} table Table for which to compute total row
	 * @param {boolean} forceCreate Force the creation of total row, if not present
	 */
	recomputeTotal(table, forceCreate = false) {
		// TODO Use planning statements to recompute, instead of parsing.
		// TODO remove force create and use the table id to identify if creation is needed.
		let lastRow;
		const total = {
			id: `${table.id}Total`,
			name: 'Total',
			daily: 0,
			monthly: 0,
			yearly: 0,
		};
		if (forceCreate) {
			const addGoalButton = createImageButton('Delete goal', ['nav-item'], icons.add_row, undefined, this.onClickAddGoal.bind(this));
			const options = {
				readonly: true,
				hideLastCell: true,
				lastCellContent: addGoalButton,
			};
			lastRow = this.sketchRow(table, total, options);
		} else {
			lastRow = table.tBodies[0].rows[table.tBodies[0].rows.length - 1];
		}

		let totalDaily = 0;
		let totalMonthly = 0;
		let totalYearly = 0;

		for (let rowIndex = 0; rowIndex < table.tBodies[0].rows.length - 1; rowIndex += 1) {
			const row = table.tBodies[0].rows[rowIndex];
			totalDaily += parseInt(row.cells[1].textContent, 10);
			totalMonthly += parseInt(row.cells[2].textContent, 10);
			totalYearly += parseInt(row.cells[3].textContent, 10);
		}

		lastRow.cells[1].textContent = totalDaily;
		lastRow.cells[2].textContent = totalMonthly;
		lastRow.cells[3].textContent = totalYearly;
	}
	// #endregion

	// #region event handlers
	// #region statement event handlers
	onClickDeleteStatement() {
		this.statements.splice(this.gfx.selectedIndex(), 1);
		this.refresh(this.statements);
	}

	onClickAddStatement() {
		const id = new Date().getTime(); // millisecond precision
		const newStatement = new Statement(id, 'New statement', Statement.EXPENSE);
		this.statements.unshift(newStatement);
		this.refresh(this.statements);
	}

	onClickShowStatement(dropup, e) {
		this.gfx.onClickSetSlice(e);
		const sliceName = e.currentTarget.textContent;
		const dropupText = dropup.firstChild;
		dropupText.nodeValue = `${sliceName} `;
		dropup.click();
	}

	onClickChangeStatementType(e) {
		const newStatementType = e.currentTarget.textContent;
		const statement = this.statements[this.gfx.selectedIndex()];
		statement.type = newStatementType;
		this.refresh(this.statements);
	}

	onClickEdit() {
		const tableDefs = document.querySelectorAll('[editable="true"]');
		for (let i = 0; i < tableDefs.length; i += 1) {
			tableDefs[i].contentEditable = 'true';
		}

		const elements = document.querySelectorAll('[hideable="true"]');
		for (let i = 0; i < elements.length; i += 1) {
			elements[i].style.display = '';
		}

		this.editMode = true;
		this.editButton.parentNode.replaceChild(this.saveButton, this.editButton);
	}

	onClickSave() {
		const editableElmts = document.querySelectorAll('[editable="true"]');
		for (let i = 0; i < editableElmts.length; i += 1) {
			editableElmts[i].contentEditable = 'false';
		}

		const hideableElmts = document.querySelectorAll('[hideable="true"]');
		for (let i = 0; i < hideableElmts.length; i += 1) {
			hideableElmts[i].style.display = 'none';
		}

		if (this.onClickUpdate) {
			this.onClickUpdate(this.id, this.statements);
		}

		this.editMode = false;
		this.saveButton.parentNode.replaceChild(this.editButton, this.saveButton);
	}

	onClickDropup(dropup, event) {
		const button = event.currentTarget;
		button.classList.toggle('active');
		const dropupStyle = dropup.style;
		if (dropupStyle.display === 'none') {
			dropupStyle.display = 'block';
		} else {
			// No need to set arrow up because it'll be handled by setSliceButtonText
			dropupStyle.display = 'none';
		}
	}

	onKeyUpStatementName(event) {
		const statementName = event.currentTarget.textContent;
		const statement = event.currentTarget.parentNode.userData;
		statement.name = statementName;
	}
	// #endregion

	// #region category event handlers
	onClickAddCategory() {
		const id = new Date().getTime(); // millisecond precision
		const category = new Category(id, 'New Category');
		/** @type{Statement} */
		const statement = this.statements[this.gfx.selectedIndex()];
		statement.categories.push(category);
		// TODO update only the current statement, not all of them
		this.refresh(this.statements);
	}

	onClickDeleteCategory(event) {
		const table = event.currentTarget.parentNode.parentNode.parentNode.parentNode;
		const category = table.userData;
		const statement = table.parentNode.userData;

		statement.categories.splice(statement.categories.indexOf(category), 1);
		table.parentNode.removeChild(table);
	}

	// eslint-disable-next-line class-methods-use-this
	onKeyUpCategoryName(event) {
		const categoryName = event.currentTarget.textContent;
		const table = event.currentTarget.parentNode.parentNode.parentNode;
		const statement = table.userData;

		statement.name = categoryName;
	}
	// #endregion

	// #region goal event handlers
	onClickAddGoal(event) {
		const btn = event.currentTarget;
		const id = new Date().getTime(); // millisecond precision
		const goal = {
			id: id,
			name: 'New Goal',
			daily: 0,
			monthly: 0,
			yearly: 0,
		};

		const table = btn.parentNode.parentNode.parentNode.parentNode;
		const tbody = table.tBodies[0];
		// Subtract one for the bottom "Total" row.
		const index = tbody.rows.length - 1;

		const button = createImageButton('Delete', [], icons.delete, undefined, this.onClickDeleteGoal.bind(this));
		const options = {
			index: index,
			lastCellContent: button,
		};
		this.sketchRow(table, goal, options);

		table.userData.goals.push(goal);
	}

	onKeyUpGoal(event) {
		const cell = event.currentTarget;
		const row = cell.parentNode;
		const table = row.parentNode.parentNode;

		const { cellIndex } = event.currentTarget;
		const goal = row.userData;

		switch (cellIndex) {
		case 0:
			goal.itemName = cell.textContent;
			break;
		case 1:
			goal.daily = parseInt(cell.textContent, 10);
			goal.monthly = goal.daily * 30;
			goal.yearly = goal.daily * 365;
			cell.parentNode.cells[2].textContent = goal.monthly;
			cell.parentNode.cells[3].textContent = goal.yearly;
			break;
		case 2:
			goal.monthly = parseInt(cell.textContent, 10);
			goal.daily = Math.ceil(goal.monthly / 30);
			goal.yearly = goal.monthly * 12;
			cell.parentNode.cells[1].textContent = goal.daily;
			cell.parentNode.cells[3].textContent = goal.yearly;
			break;
		case 3:
			goal.yearly = parseInt(cell.textContent, 10);
			goal.daily = Math.ceil(goal.yearly / 365);
			goal.monthly = Math.ceil(goal.yearly / 12);
			cell.parentNode.cells[1].textContent = goal.daily;
			cell.parentNode.cells[2].textContent = goal.monthly;
			break;
		}

		this.recomputeTotal(table);
	}

	onClickDeleteGoal(event) {
		const row = event.currentTarget.parentNode.parentNode;
		const tBody = row.parentNode;
		const goal = row.userData;
		const category = row.parentNode.parentNode.userData;

		category.goals.splice(category.goals.indexOf(goal), 1);

		tBody.removeChild(row);
		this.recomputeTotal(tBody.parentNode);
	}
	// #endregion
	// #endregion
}

class PlanningController {
	/**
	 * Used for fast retreival of local caches.
	 * @type {Array<PlanningCache>}
	 * @private
	 */
	#caches = undefined;

	async init(forYear) {
		const year = forYear || new Date().getFullYear();
		this.#caches = await PlanningCache.getAll();

		let defaultYearCache;
		for (let i = 0; i < this.#caches.length; i += 1) {
			if (this.#caches[i].year === `${year}`) {
				defaultYearCache = this.#caches[i];
			}
		}

		const currentYearScreen = await this.initPlanningScreen(defaultYearCache);
		currentYearScreen.init();
		currentYearScreen.activate();

		/* if(gdriveSync) {
			this.initGDrive();
		} */
	}

	/**
	 *
	 * @param {PlanningCache} cache
	 */
	async initPlanningScreen(cache) {
		const planningCache = cache;
		const localCollections = await planningCache.readAll();
		const planningScreen = new PlanningScreen(planningCache.year, localCollections);
		planningScreen.onClickUpdate = this.onClickUpdate.bind(this);
		return planningScreen;
	}

	/*
	async initGDrive() {
		await this.planningGDrive.init();
		const needsUpdate = await this.planningGDrive.syncGDrive();
		if(needsUpdate) {
			const localCollections = await this.planningCache.readAll();
			for (const [id, planningCollection] of Object.entries(localCollections)) {
				this.#tabs.get(id).update(planningCollection);
			}
			M.toast({html: 'Updated from GDrive', classes: 'rounded'});
		}
	} */

	async onClickUpdate(id, statements) {
		// TODO repalce with a map
		for (let i = 0; i < this.#caches.length; i += 1) {
			if (this.#caches[i].year === id) {
				this.#caches[i].updateAll(statements);
			}
		}

		/*
		if(gdriveSync) {
			localStorage.setItem(GDrive.MODIFIED_TIME_FIELD, new Date().toISOString());
			const needsUpdate = await this.planningGDrive.syncGDrive();
			if(needsUpdate) {
				this.#tabs.get(id).update(planningCollection);
				M.toast({html: 'Updated from GDrive', classes: 'rounded'});
			}
		} */
	}
}

export { PlanningController as default };
