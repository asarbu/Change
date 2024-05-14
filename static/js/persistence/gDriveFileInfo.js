export default class GDriveFileInfo {
	/** @type{string} */
	id = undefined;

	/** @type {number} */
	year = undefined;

	/** @type {number} */
	month = undefined;

	/** @type {string} */
	gDriveId = undefined;

	/** @type {boolean} */
	dirty = false;

	/** @type {number} */
	modified = undefined;

	/** @type {string} */
	fileName = undefined;

	constructor(id, year, month, gDriveId, modified = 0, dirty = false) {
		this.id = id;
		this.year = year;
		this.month = month;
		this.gDriveId = gDriveId;
		this.dirty = dirty;
		this.modified = modified;
	}
}
