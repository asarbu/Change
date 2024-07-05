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

	it('init from default GDrive structure', async () => {
		const gDriveBackend = new GDriveBackendMock(defaultGDriveStructure());
		window.fetch = gDriveBackend.fetch.bind(gDriveBackend);
		localStorage.setItem('oauth2_token', JSON.stringify(validGDriveOAuthToken()));
		expect(planningGdrive.init()).resolves.not.toThrow();
	});
});
