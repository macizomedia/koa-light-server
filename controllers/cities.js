const model = require('../models/city');
const { matchedData } = require('express-validator');
const utils = require('../middleware/utils');
const db = require('../middleware/db');

/*********************
 * Private functions *
 *********************/

/**
 * Checks if a city already exists excluding itself
 * @param {string} id - id of item
 * @param {string} name - name of item
 */
const cityExistsExcludingItself = async (id, name) => {
	return new Promise((resolve, reject) => {
		model.findOne(
			{
				name,
				_id: {
					$ne: id
				}
			},
			(err, item) => {
				utils.itemAlreadyExists(err, item, reject, 'CITY_ALREADY_EXISTS');
				resolve(false);
			}
		);
	});
};

/**
 * Checks if a city already exists in database
 * @param {string} name - name of item
 */
const cityExists = async (name) => {
	return new Promise((resolve, reject) => {
		model.findOne(
			{
				name
			},
			(err, item) => {
				utils.itemAlreadyExists(err, item, reject, 'CITY_ALREADY_EXISTS');
				resolve(false);
			}
		);
	});
};

/**
 * Gets all items from database
 */
const getAllItemsFromDB = async () => {
	return new Promise((resolve, reject) => {
		model.find(
			{},
			'-updatedAt -createdAt',
			{
				sort: {
					name: 1
				}
			},
			(err, items) => {
				if (err) {
					reject(utils.buildErrObject(422, err.message));
				}
				resolve(items);
			}
		);
	});
};

/********************
 * Public functions *
 ********************/

/**
 * Get all items function called by route
 * @param {Object} ctx - request response
 */
exports.getAllItems = async (ctx) => {
	try {
		const result = await getAllItemsFromDB();
		console.log(result);
		ctx.ok(result);
	} catch (error) {
		utils.handleError(ctx, error);
	}
};

/**
 * Get items function called by route
 * @param {Object} ctx - request & response
 */
exports.getItems = async (ctx) => {
	try {
		const query = await db.checkQueryString(ctx.request.query);
		ctx.status(200).json(await db.getItems(ctx, model, query));
	} catch (error) {
		utils.handleError(ctx, error);
	}
};

/**
 * Get item function called by route
 * @param {Object} ctx - request & response
 */
exports.getItem = async (ctx) => {
	try {
		ctx = matchedData(ctx);
		const id = await utils.isIDGood(ctx.id);
		ctx.status(200).json(await db.getItem(id, model));
	} catch (error) {
		utils.handleError(ctx, error);
	}
};

/**
 * Update item function called by route
 * @param {Object} ctx - request & response
 */
exports.updateItem = async (ctx) => {
	try {

		const id = await utils.isIDGood(ctx.id);
		const doesCityExists = await cityExistsExcludingItself(id, ctx.name);
		if (!doesCityExists) {
			ctx.status(200).json(await db.updateItem(id, model, ctx));
		}
	} catch (error) {
		utils.handleError(ctx, error);
	}
};

/**
 * Create item function called by route
 * @param {Object} ctx - request & response
 */
exports.createItem = async (ctx) => {
	try {
		ctx = matchedData(ctx);
		const doesCityExists = await cityExists(ctx.name);
		if (!doesCityExists) {
			ctx.status(201).json(await db.createItem(ctx, model));
		}
	} catch (error) {
		utils.handleError(ctx, error);
	}
};

/**
 * Delete item function called by route
 * @param {Object} ctx - request & response
 */
exports.deleteItem = async (ctx) => {
	try {
		ctx = matchedData(ctx);
		const id = await utils.isIDGood(ctx.id);
		ctx.status(200).json(await db.deleteItem(id, model));
	} catch (error) {
		utils.handleError(ctx, error);
	}
};