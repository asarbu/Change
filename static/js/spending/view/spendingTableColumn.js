class SpendingTableColumn {
    /** @type {string} */
    #name = undefined;

    /** @type {'wide' | 'narrow' | 'normal'} */
    #size = undefined;

    /** @type {string} */
    #type = undefined;

    constructor(name, size, type) {
        this.#name = name;
        this.#size = size;
        this.#type = type;
    }

    get name() {
        return this.#name;
    }

    get size() {
        return this.#size;
    }

    get type() {
        return this.#type;
    }

    toString() {
        return this.#name;
    }
}

const priceTableColumn = new SpendingTableColumn("Price", "normal", "fixedPrice");
const descriptionTableColumn = new SpendingTableColumn("Description", "normal", "description");
const categoryTableColumn = new SpendingTableColumn("Category", "normal", "category");
const dateTableColumn = new SpendingTableColumn("Date", "narrow", "dayOfMonth");

const predefinedColumns = {
    DATE: dateTableColumn,
    DESCRIPTION: descriptionTableColumn,
    PRICE: priceTableColumn,
    CATEGORY: categoryTableColumn,
    ALL: [dateTableColumn, descriptionTableColumn, categoryTableColumn, priceTableColumn],

    fromName: (name) => predefinedColumns.ALL.find(c => c.name === name),
};

export default Object.freeze(predefinedColumns);
/** @typedef {typeof predefinedColumns.ALL[0]} SpendingTableColumn */
