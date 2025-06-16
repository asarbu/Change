/**
 * @jest-environment jsdom
 */
import {
	beforeEach, describe, expect, it,
	jest,
} from '@jest/globals';
import PlanningGDrive from '../../static/js/planning/persistence/planningGdrive.js';
import GDriveBackendMock from '../common/gDriveBackendMock.js';
import GDrive from '../../static/js/common/persistence/gDrive.js';
import Planning, { Statement } from '../../static/js/planning/model/planningModel.js';
import GDriveAuth from '../../static/js/common/persistence/gDriveAuth.js';
import LocalStorage from '../../static/js/common/persistence/localStorage.js';

describe('Planning gDrive', () => {
	/** @type {Date} */
	let now;
	/** @type {PlanningGDrive} */
	let	planningGdrive;

	beforeEach(() => {
		now = new Date();
		localStorage.clear();
		planningGdrive = new PlanningGDrive(now.getFullYear(), true);
		jest.restoreAllMocks();
	});

	function emptyGDriveJson() {
		return {
			id: 'root',
			name: 'root',
			mimeType: GDrive.GDRIVE_MIME_TYPE_FOLDER,
			files: [],
		};
	}

	/**
	 * @returns {JSON} Initial GDrive folder state of a working application
	 */
	function defaultGDriveStructure() {
		return {
			id: 'root',
			name: 'root',
			mimeType: GDrive.GDRIVE_MIME_TYPE_FOLDER,
			files: [{
				id: '1',
				name: 'Change!',
				mimeType: GDrive.GDRIVE_MIME_TYPE_FOLDER,
				files: [{
					id: '2',
					name: 'Planning',
					mimeType: GDrive.GDRIVE_MIME_TYPE_FOLDER,
					files: [{
						id: '3', name: `${now.getFullYear()}`, mimeType: GDrive.GDRIVE_MIME_TYPE_FOLDER, files: [],
					}],
				}, {
					id: '4',
					name: 'Spending',
					mimeType: 'application/vnd.google-apps.folder',
					files: [{
						id: '5', name: `${now.getFullYear()}`, mimeType: GDrive.GDRIVE_MIME_TYPE_FOLDER, files: [],
					}],
				},
				],
			}],
		};
	}

	function validGDriveOAuthToken() {
		const endOfYear = new Date(now.getFullYear(), now.getMonth, now.getDate(), 23, 59, 59);
		return {
			access_token: '1234',
			expires_in: 3599,
			scope: 'https://www.googleapis.com/auth/drive',
			token_type: 'Bearer',
			refreshed_at: now.getTime(),
			expires_at: `${endOfYear.getTime()}`,
		};
	}

	function preInitPlanningGDrive() {
		new LocalStorage(LocalStorage.GDRIVE_FILES_KEY).store({ id: GDrive.APP_FOLDER, gDriveId: '1' });
		new LocalStorage(LocalStorage.GDRIVE_FILES_KEY).store({ id: 'Planning', gDriveId: '2' });
		new LocalStorage(LocalStorage.GDRIVE_FILES_KEY).store({ id: `Planning_${now.getFullYear()}`, gDriveId: '3' });
	}

	it('init from default GDrive structure', async () => {
		const gDriveBackend = new GDriveBackendMock(defaultGDriveStructure());
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		localStorage.setItem('oauth2_token', JSON.stringify(validGDriveOAuthToken()));
		expect(planningGdrive.init()).resolves.not.toThrow();
	});

	it('init empty GDrive', async () => {
		const gDriveBackend = new GDriveBackendMock(emptyGDriveJson());
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		localStorage.setItem('oauth2_token', JSON.stringify(validGDriveOAuthToken()));
		expect(planningGdrive.init()).resolves.not.toThrow();
	});

	it('reads from empty GDrive', async () => {
		const gDriveBackend = new GDriveBackendMock(emptyGDriveJson());
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		localStorage.setItem('oauth2_token', JSON.stringify(validGDriveOAuthToken()));
		const allPlannings = await planningGdrive.readAll();
		expect(allPlannings).toBeDefined();
		expect(allPlannings.length).toBe(0);
	});

	it('reads from empty GDrive that has a shortcut do Change! folder', async () => {
		const gDriveBackend = new GDriveBackendMock({
			id: 'root',
			name: 'root',
			mimeType: GDrive.GDRIVE_MIME_TYPE_FOLDER,
			files: [{
				id: '1',
				name: 'Change!',
				mimeType: GDrive.GDRIVE_MIME_TYPE_SHORTCUT,
				shortcutDetails: { targetMimeType: GDrive.GDRIVE_MIME_TYPE_FOLDER },
				files: [],
			}],
		});
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		localStorage.setItem('oauth2_token', JSON.stringify(validGDriveOAuthToken()));
		const allPlannings = await planningGdrive.readAll();
		expect(allPlannings).toBeDefined();
		expect(allPlannings.length).toBe(0);
	});

	it('reads from empty GDrive that has a file named Change!', async () => {
		const gDriveBackend = new GDriveBackendMock({
			id: 'root',
			name: 'root',
			mimeType: GDrive.GDRIVE_MIME_TYPE_FOLDER,
			files: [{
				id: '1',
				name: 'Change!',
				data: {},
			}],
		});
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		localStorage.setItem('oauth2_token', JSON.stringify(validGDriveOAuthToken()));
		const allPlannings = await planningGdrive.readAll();
		expect(allPlannings).toBeDefined();
		expect(allPlannings.length).toBe(0);
	});

	it('reads from default GDrive structure', async () => {
		const gDriveBackend = new GDriveBackendMock(defaultGDriveStructure());
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		localStorage.setItem('oauth2_token', JSON.stringify(validGDriveOAuthToken()));
		const allPlannings = await planningGdrive.readAll();
		expect(allPlannings).toBeDefined();
		expect(allPlannings.length).toBe(0);
	});

	it('reads unexisting file from GDrive', async () => {
		jest.spyOn(GDriveAuth.prototype, 'init').mockImplementation(() => undefined);
		localStorage.setItem('oauth2_token', JSON.stringify(validGDriveOAuthToken()));
		const gDrive = new GDrive();
		expect(gDrive.readFile(undefined)).rejects.toThrow();
	});

	it('reads one file from default GDrive structure', async () => {
		const gDriveBackend = new GDriveBackendMock(defaultGDriveStructure());
		gDriveBackend.writeFile(`Planning_${now.getFullYear()}_Jan.json`, '3');
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		localStorage.setItem('oauth2_token', JSON.stringify(validGDriveOAuthToken()));
		const allPlannings = await planningGdrive.readAll();
		expect(allPlannings).toBeDefined();
		expect(allPlannings.files.length).toBe(1);
	});

	it('stores one empty Planning object', async () => {
		const gDriveBackend = new GDriveBackendMock(defaultGDriveStructure());
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		localStorage.setItem('oauth2_token', JSON.stringify(validGDriveOAuthToken()));
		const planning = new Planning(1, now.getFullYear(), now.getMonth(), []);
		await planningGdrive.store(planning);
		const storedPlanning = await planningGdrive.read(planning.month);
		expect(storedPlanning).toEqual(planning);
	});

	it('updates one Planning object', async () => {
		const gDriveBackend = new GDriveBackendMock(defaultGDriveStructure());
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		localStorage.setItem('oauth2_token', JSON.stringify(validGDriveOAuthToken()));
		const planning = new Planning(1, now.getFullYear(), now.getMonth(), []);
		await planningGdrive.store(planning);
		planning.statements.push(new Statement(2, 'Statement', Statement.EXPENSE, []));
		await planningGdrive.store(planning);
		const storedPlanning = await planningGdrive.read(planning.month);
		expect(storedPlanning).toEqual(planning);
	});

	it('reads planning for inexistent month from GDrive', async () => {
		const gDriveBackend = new GDriveBackendMock(defaultGDriveStructure());
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		localStorage.setItem('oauth2_token', JSON.stringify(validGDriveOAuthToken()));
		const planning = await planningGdrive.read(0);
		expect(planning).not.toBeDefined();
	});

	it('init empty GDrive without auth token', async () => {
		jest.spyOn(GDriveAuth.prototype, 'init').mockImplementation(() => undefined);
		jest.spyOn(GDriveAuth.prototype, 'getAccessToken').mockImplementation(() => undefined);
		const gDriveBackend = new GDriveBackendMock(emptyGDriveJson());
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		expect(planningGdrive.init()).rejects.toThrow();
	});

	it('stores one empty Planning object without auth token', async () => {
		jest.spyOn(GDriveAuth.prototype, 'init').mockImplementation(() => undefined);
		jest.spyOn(GDriveAuth.prototype, 'getAccessToken').mockImplementation(() => undefined);
		preInitPlanningGDrive(now);
		const gDriveBackend = new GDriveBackendMock(defaultGDriveStructure());
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		const planning = new Planning(1, now.getFullYear(), now.getMonth(), []);
		expect(planningGdrive.store(planning)).resolves.not.toBeDefined();
	});

	it('reads from empty GDrive without auth token', async () => {
		jest.spyOn(GDriveAuth.prototype, 'init').mockImplementation(() => undefined);
		jest.spyOn(GDriveAuth.prototype, 'getAccessToken').mockImplementation(() => undefined);
		preInitPlanningGDrive(now);
		const gDriveBackend = new GDriveBackendMock(emptyGDriveJson());
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		const allPlannings = await planningGdrive.readAll();
		expect(allPlannings).toBeDefined();
		expect(allPlannings.length).toBe(0);
	});

	it('reads planning from GDrive without auth token', async () => {
		jest.spyOn(GDriveAuth.prototype, 'init').mockImplementation(() => undefined);
		jest.spyOn(GDriveAuth.prototype, 'getAccessToken').mockImplementation(() => undefined);
		jest.spyOn(GDrive.prototype, 'readFileMetadata').mockImplementation(() => ({ [GDrive.MODIFIED_TIME_FIELD]: now.getTime() }));
		preInitPlanningGDrive(now);
		const gDriveBackend = new GDriveBackendMock(defaultGDriveStructure());
		const planningFileName = `Planning_${now.getFullYear()}_Jan.json`;
		const gDriveId = gDriveBackend.writeFile(planningFileName, '3');
		new LocalStorage(LocalStorage.GDRIVE_FILES_KEY)
			.store({ id: planningFileName, gDriveId: gDriveId });
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		const planning = await planningGdrive.read(0);
		expect(planning).not.toBeDefined();
	});

	it('reads reads file medatadata for innexistent file', async () => {
		jest.spyOn(GDriveAuth.prototype, 'init').mockImplementation(() => undefined);
		localStorage.setItem('oauth2_token', JSON.stringify(validGDriveOAuthToken()));
		const gDrive = new GDrive();
		expect(gDrive.readFileMetadata(undefined)).rejects.toThrow();
	});

	it('reads planning from GDrive fails', async () => {
		jest.spyOn(GDriveAuth.prototype, 'init').mockImplementation(() => undefined);
		jest.spyOn(GDrive.prototype, 'readFileMetadata').mockImplementation(() => ({ [GDrive.MODIFIED_TIME_FIELD]: now.getTime() }));
		localStorage.setItem('oauth2_token', JSON.stringify(validGDriveOAuthToken()));
		preInitPlanningGDrive(now);
		const gDriveBackend = new GDriveBackendMock(defaultGDriveStructure(), { failAltMedia: true });
		const planningFileName = `Planning_${now.getFullYear()}_Jan.json`;
		new LocalStorage(LocalStorage.GDRIVE_FILES_KEY).store({ id: planningFileName, gDriveId: '123' });
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		expect(planningGdrive.read(0)).rejects.toThrow();
	});

	it('fails to read file metadata due to no auth token', async () => {
		jest.spyOn(GDriveAuth.prototype, 'init').mockImplementation(() => undefined);
		jest.spyOn(GDrive.prototype, 'writeFile').mockImplementation(() => '123');
		jest.spyOn(GDriveAuth.prototype, 'getAccessToken').mockImplementation(() => undefined);
		preInitPlanningGDrive(now);
		const gDriveBackend = new GDriveBackendMock(defaultGDriveStructure(), { failFields: true });
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		const planning = new Planning(1, now.getFullYear(), now.getMonth(), []);
		expect(planningGdrive.store(planning)).rejects.toThrow();
	});

	it('updates one Planning object without auth', async () => {
		jest.spyOn(GDriveAuth.prototype, 'init').mockImplementation(() => undefined);
		jest.spyOn(GDriveAuth.prototype, 'getAccessToken').mockImplementation(() => undefined);
		jest.spyOn(GDrive.prototype, 'init').mockImplementation(() => undefined);
		const gDriveBackend = new GDriveBackendMock(
			defaultGDriveStructure(),
			{ failUploadPatch: true },
		);
		preInitPlanningGDrive(now);
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		const planning = new Planning(1, now.getFullYear(), 0, []);
		const planningFileName = `Planning_${now.getFullYear()}_Jan.json`;
		const gDriveId = gDriveBackend.writeFile(planningFileName, '3');
		jest.spyOn(GDrive.prototype, 'findFile').mockImplementation(() => gDriveId);
		new LocalStorage(LocalStorage.GDRIVE_FILES_KEY)
			.store({ id: planningFileName, gDriveId: gDriveId });
		expect(planningGdrive.store(planning)).resolves.not.toBeDefined();
	});

	it('fails to read file metadata due to error', async () => {
		jest.spyOn(GDriveAuth.prototype, 'init').mockImplementation(() => undefined);
		jest.spyOn(GDrive.prototype, 'init').mockImplementation(() => undefined);
		localStorage.setItem('oauth2_token', JSON.stringify(validGDriveOAuthToken()));
		const gDriveBackend = new GDriveBackendMock(
			defaultGDriveStructure(),
			{ failFields: true },
		);
		preInitPlanningGDrive(now);
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		const planning = new Planning(1, now.getFullYear(), 0, []);
		const planningFileName = `Planning_${now.getFullYear()}_Jan.json`;
		const gDriveId = gDriveBackend.writeFile(planningFileName, '3');
		jest.spyOn(GDrive.prototype, 'writeFile').mockImplementation(() => gDriveId);
		jest.spyOn(GDrive.prototype, 'findFile').mockImplementation(() => gDriveId);
		new LocalStorage(LocalStorage.GDRIVE_FILES_KEY)
			.store({ id: planningFileName, gDriveId: gDriveId });
		expect(planningGdrive.store(planning)).rejects.toThrow();
	});

	it('updates fails for one Planning object', async () => {
		const gDriveBackend = new GDriveBackendMock(defaultGDriveStructure());
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		localStorage.setItem('oauth2_token', JSON.stringify(validGDriveOAuthToken()));
		const planning = new Planning(1, now.getFullYear(), now.getMonth(), []);
		await planningGdrive.store(planning);
		planning.statements.push(new Statement(2, 'Statement', Statement.EXPENSE, []));
		jest.spyOn(GDrive.prototype, 'update').mockImplementation(() => undefined);
		await planningGdrive.store(planning);
		const storedPlanning = await planningGdrive.read(planning.month);
		expect(storedPlanning).not.toEqual(planning);
	});

	it('checks if file changed once', async () => {
		const gDriveBackend = new GDriveBackendMock(defaultGDriveStructure());
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		localStorage.setItem('oauth2_token', JSON.stringify(validGDriveOAuthToken()));
		gDriveBackend.writeFile(`Planning_${now.getFullYear()}_Jan.json`, '3');
		const fileChanged = await planningGdrive.fileChanged(0);
		expect(fileChanged).toBe(true);
	});

	it('checks if file changed twice', async () => {
		const gDriveBackend = new GDriveBackendMock(defaultGDriveStructure());
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		localStorage.setItem('oauth2_token', JSON.stringify(validGDriveOAuthToken()));
		gDriveBackend.writeFile(`Planning_${now.getFullYear()}_Jan.json`, '3');
		let fileChanged = await planningGdrive.fileChanged(0);
		expect(fileChanged).toBe(true);
		fileChanged = await planningGdrive.fileChanged(0);
		expect(fileChanged).toBe(false);
	});

	it('checks if file exists when it exists', async () => {
		const gDriveBackend = new GDriveBackendMock(defaultGDriveStructure());
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		localStorage.setItem('oauth2_token', JSON.stringify(validGDriveOAuthToken()));
		gDriveBackend.writeFile(`Planning_${now.getFullYear()}_Jan.json`, '3');
		const fileExists = await planningGdrive.fileExists(0);
		expect(fileExists).toBe(true);
	});

	it('checks if file exists when it does not exist', async () => {
		const gDriveBackend = new GDriveBackendMock(defaultGDriveStructure());
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		localStorage.setItem('oauth2_token', JSON.stringify(validGDriveOAuthToken()));
		const fileExists = await planningGdrive.fileExists(0);
		expect(fileExists).toBe(false);
	});

	it('returns current year by default when no file is added', async () => {
		const gDriveBackend = new GDriveBackendMock(emptyGDriveJson());
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		localStorage.setItem('oauth2_token', JSON.stringify(validGDriveOAuthToken()));
		const availableYears = await planningGdrive.availableYears();
		expect(availableYears.length).toBe(1);
		expect(availableYears[0]).toBe(`${now.getFullYear()}`);
	});

	it('returns past year if present', async () => {
		const gDriveBackend = new GDriveBackendMock({
			id: 'root',
			name: 'root',
			mimeType: GDrive.GDRIVE_MIME_TYPE_FOLDER,
			files: [{
				id: '1',
				name: 'Change!',
				mimeType: GDrive.GDRIVE_MIME_TYPE_FOLDER,
				files: [{
					id: '2',
					name: 'Planning',
					mimeType: GDrive.GDRIVE_MIME_TYPE_FOLDER,
					files: [{
						id: '3', name: `${now.getFullYear() - 1}`, mimeType: GDrive.GDRIVE_MIME_TYPE_FOLDER, files: [],
					}],
				}],
			}],
		});
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		localStorage.setItem('oauth2_token', JSON.stringify(validGDriveOAuthToken()));
		const availableYears = await planningGdrive.availableYears();
		expect(availableYears.length).toBe(2);
		expect(availableYears[0]).toBe(`${now.getFullYear() - 1}`);
	});

	it('returns no month by default when no file is added', async () => {
		const gDriveBackend = new GDriveBackendMock(emptyGDriveJson());
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		localStorage.setItem('oauth2_token', JSON.stringify(validGDriveOAuthToken()));
		const availableMonths = await planningGdrive.availableMonths();
		expect(availableMonths.length).toBe(0);
	});

	it('returns one month by default when a file is added', async () => {
		const gDriveBackend = new GDriveBackendMock(defaultGDriveStructure());
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		localStorage.setItem('oauth2_token', JSON.stringify(validGDriveOAuthToken()));
		gDriveBackend.writeFile(`Planning_${now.getFullYear()}_${now.getMonth()}.json`, '3');
		const availableMonths = await planningGdrive.availableMonths();
		expect(availableMonths.length).toBe(1);
	});
});
