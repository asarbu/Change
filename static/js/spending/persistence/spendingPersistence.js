import Settings from "../../settings/settings";
import SpendingReport from "../model/spendingReport";
import SpendingCache from "./spendingCache";
import SpendingGDrive from "./spendingGdrive";

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
		spendingReport.updateSpendings(spendings);
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
				monthlyReport.updateSpendings(gDriveSpendings);
				return monthlyReport;
			}
		}
		return undefined;
	}

	/**
	 * @returns {Promise<Array<string>>}
	 */
	// eslint-disable-next-line class-methods-use-this
	async cachedYears() {
		return SpendingCache.readYears();
	}
}
