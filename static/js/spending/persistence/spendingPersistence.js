import Settings from '../../settings/settings.js';
import Spending from '../model/spending.js';
import SpendingReport from '../model/spendingReport.js';
import SpendingCache from './spendingCache.js';
import SpendingGDrive from './spendingGdrive.js';

export default class SpendingPersistence {
	/** @type {number} */
	#year = undefined;

	/** @type {SpendingCache} */
	#spendingCache = undefined;

	/** @type {SpendingGDrive} */
	#spendingGDrive = undefined;

	constructor(forYear) {
		this.#year = forYear;
		this.#spendingCache = new SpendingCache(forYear);

		const settings = new Settings().gDriveSettings();
		if (!settings || !settings.enabled) return;
		this.#spendingGDrive = new SpendingGDrive(forYear, settings.rememberLogin);
	}

	/**
	 * @param {number} forMonth
	 * @returns {Promise<SpendingReport>}
	 */
	async readFromCache(forMonth) {
		const spendings = await this.#spendingCache.readAllForMonth(forMonth);
		const spendingReport = new SpendingReport(this.#year, forMonth);
		spendingReport.updateAll(spendings);
		return spendingReport;
	}

	/**
	 * @returns {Promise<Array<SpendingReport>>}
	 */
	async readAllFromCache() {
		const reports = [];
		const spendings = await this.#spendingCache.readAll();
		for (let index = 0; index < spendings.length; index += 1) {
			const spending = spendings[index];
			const month = spending.spentOn.getMonth();
			if (!reports[month]) {
				const newReport = new SpendingReport(this.#year, month);
				reports[month] = newReport;
			}
			reports[month].appendSpending(spending);
		}
		return reports;
	}

	/**
	 * Returns changed spending reports synchronized from GDrive
	 * @returns {Promise<Array<SpendingReport>>}
	 */
	async readAllFromGDrive() {
		const spendingReports = [];
		for (let month = 0; month < 12; month += 1) {
			spendingReports[month] = this.readFromGDrive(month);
		}
		return Promise.all(spendingReports);
	}

	/**
	 * @param {number} forMonth
	 */
	async readFromGDrive(forMonth) {
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
				const monthlyReport = new SpendingReport(this.#year, forMonth);
				monthlyReport.updateAll(gDriveSpendings);
				return monthlyReport;
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
			if (this.#spendingGDrive) {
				await this.#spendingGDrive.store(spending);
			}
		} else {
			const year = spending.spentOn.getFullYear();
			const spendingCache = new SpendingCache(year);
			await spendingCache.store(spending);
			if (this.#spendingGDrive) {
				const spendingGDrive = new SpendingGDrive(year);
				await spendingGDrive.store(spending);
			}
		}
		return spending;
	}

	/**
	 * @param {SpendingReport} fromSpendingReport
	 */
	async deleteAll(fromSpendingReport) {
		this.#spendingCache.deleteAll(fromSpendingReport.spendings());
		return this.#spendingGDrive.deleteFile(fromSpendingReport.month());
	}

	/**
	 * @returns {Promise<Array<string>>}
	 */
	// eslint-disable-next-line class-methods-use-this
	async cachedYears() {
		return SpendingCache.readYears();
	}
}
