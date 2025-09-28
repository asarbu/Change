import GDriveSettings from '../../settings/model/gDriveSettings.js';
import Spending from '../model/spending.js';
import SpendingCache from './spendingCache.js';
import SpendingGDrive from './spendingGdrive.js';

export default class SpendingPersistence {
	/** @type {number} */
	#year = undefined;

	/** @type {number} */
	#month = undefined;

	/** @type {SpendingGDrive} */
	#spendingGDrive = undefined;

	/** @type {SpendingCache} */
	#spendingCache = undefined;

	constructor(forYear, forMonth) {
		this.#year = forYear;
		this.#month = forMonth;
		this.#spendingCache = SpendingCache.for(forYear);
	}

	/**
	 * @param {GDriveSettings} gDriveSettings
	 */
	enableGdrive(gDriveSettings) {
		this.#spendingGDrive = new SpendingGDrive(this.#year, gDriveSettings);
	}

	/**
	 * Change default month of the persistence layer
	 * @param {number} month 
	 */
	forMonth(month) {
		this.#month = month;
		return this;
	}

	/**
	 * @param {number} forMonth
	 * @returns {Promise<Spending[]>}
	 */
	async readFromCache(forMonth = this.#month) {
		return await this.#spendingCache.readAllForMonth(forMonth);
	}

	/**
	 * @returns {Promise<Array<Spending[]>>}
	 */
	async readAllFromCache() {
		const yearlySpendings = new Array(12).fill(undefined);
		const spendings = await this.#spendingCache.readAll();
		for (let index = 0; index < spendings.length; index += 1) {
			const spending = spendings[index];
			const month = spending.spentOn.getMonth();
			if (!yearlySpendings[month]) {
				yearlySpendings[month] = [];
			}
			yearlySpendings[month].push(spending);
		}
		const now = new Date();
		if(yearlySpendings[now.getMonth()] === undefined) {
			yearlySpendings[now.getMonth()] = [];
		}
		return yearlySpendings;
	}

	/**
	 * Returns changed spending reports synchronized from GDrive
	 * @returns {Promise<Array<Spending[]>>}
	 */
	async readAllFromGDrive() {
		const spendings = [];
		// Force initialization beforehand to avoid race conditions in init.
		await this.#spendingGDrive.init();
		for (let month = 0; month < 12; month += 1) {
			spendings[month] = this.readFromGDrive(month);
		}
		return Promise.all(spendings);
	}

	/**
	 * @param {number} forMonth
	 */
	async readFromGDrive(forMonth = this.#month) {
		const fileExists = await this.#spendingGDrive.fileExists(forMonth);
		if (!fileExists) {
			const cachedSpendings = await this.#spendingCache.readAllForMonth(forMonth);
			if (cachedSpendings.length > 0) {
				await this.#spendingGDrive.storeSpendings(cachedSpendings, forMonth);
			}
			return undefined;
		}
		const fileChanged = await this.#spendingGDrive.fileChanged(forMonth);
		if (fileChanged) {
			const gDriveSpendings = await this.#spendingGDrive.readAll(forMonth);
			if (gDriveSpendings) {
				const cachedSpendings = await this.#spendingCache.readAllForMonth(forMonth);
				// Only filter for deleted spendings.
				// The added and modified ones will be handled by storeAll
				const deletedGDriveSpendings = cachedSpendings.filter(
					(cachedSpending) => cachedSpending.id < fileChanged.oldModified
					&& !gDriveSpendings.find((gDriveSpending) => cachedSpending.id === gDriveSpending.id),
				);

				if (deletedGDriveSpendings && deletedGDriveSpendings.length > 0) {
					await this.#spendingCache.deleteAll(deletedGDriveSpendings);
				}
				await this.#spendingCache.storeAll(gDriveSpendings);
				return gDriveSpendings;
			}
		}
		return undefined;
	}

	/**
	 * @param {Spending} spending
	 */
	async store(spending) {
		if (spending.spentOn.getFullYear() === this.#year) {
			await this.#spendingCache.store(spending);
			// If user disables GDrive, creates spending and re-enables GDrive, we miss one spending
			if (this.#spendingGDrive) {
				await this.#spendingGDrive.store(spending);
			}
		} else {
			const year = spending.spentOn.getFullYear();
			const spendingCache = SpendingCache.for(year);
			await spendingCache.store(spending);
			if (this.#spendingGDrive) {
				const spendingGDrive = new SpendingGDrive(year);
				await spendingGDrive.store(spending);
			}
		}
		return spending;
	}

	/**
	 * @param {Spending[]} fromSpendingReport
	 */
	async deleteAll(fromSpendingReport) {
		const cache = SpendingCache.for(fromSpendingReport.year());
		await cache.deleteAll(fromSpendingReport.spendings());
		// TOD replace below cache with factory method
		if (this.#spendingGDrive) {
			await this.#spendingGDrive.deleteFile(fromSpendingReport.month());
		}
	}

	/**
	 * @param {Spending[]} spendings
	 * @param {number} forMonth 
	 */
	async updateAll(spendings, forMonth = this.#month) {
		const cachedSpendings = await this.#spendingCache.readAllForMonth(forMonth);
		await this.#spendingCache.deleteAll(cachedSpendings);
		await this.#spendingCache.storeAll(spendings);

		// TODO update below with factory method
		if (this.#spendingGDrive) {
			await this.#spendingGDrive.deleteFile(forMonth);
			await this.#spendingGDrive.storeSpendings(spendings.spendings(), forMonth);
		}
	}

	/**
	 * @returns {Promise<Array<string>>}
	 */
	async availableYears() {
		const mergedYears = (await this.#spendingCache.readYears())
			.concat(await this.#spendingGDrive?.readYears() ?? []);
		return [...new Set(mergedYears)];
	}
}
