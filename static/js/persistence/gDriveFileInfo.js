export default class GDriveFileInfo {
	/** @type{string} */
	id = undefined;

	/** @type {string} */
	gDriveId = undefined;

	/** @type {boolean} */
	dirty = false;

	/** @type {number} */
	modified = undefined;

	/** @type {string} */
	fileName = undefined;

	constructor(id, gDriveId, modified = 0, dirty = false) {
		this.id = id;
		this.gDriveId = gDriveId;
		this.dirty = dirty;
		this.modified = modified;
	}
}
