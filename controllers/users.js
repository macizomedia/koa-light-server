const model = require('../models/user');
const uuid = require('uuid');
const utils = require('../middleware/utils');
const db = require('../middleware/db');
const emailer = require('../middleware/emailer');

/*********************
 * Private functions *
 *********************/

/**
 * Creates a new item in database
 * @param {Object} req - request object
 */
const createItem = async (ctx) => {
	return new Promise((resolve, reject) => {
		const user = new model({
			name: ctx.name,
			email: ctx.email,
			password:ctx.password,
			role: ctx.role,
			phone: ctx.phone,
			city: ctx.city,
			country: ctx.country,
			verification: uuid.v4()
		});
		user.save((err, item) => {
			if (err) {
				reject(utils.buildErrObject(422, err.message));
			}
			// Removes properties with rest operator
			const removeProperties = ({
				// eslint-disable-next-line no-unused-vars
				password,
				// eslint-disable-next-line no-unused-vars
				blockExpires,
				// eslint-disable-next-line no-unused-vars
				loginAttempts,
				...rest
			}) => rest;
			resolve(removeProperties(item.toObject()));
		});
	});
};

/********************
 * Public functions *
 ********************/

/**
 * Get items function called by route
 * @param {Object} ctx - request & response object
 */
exports.getItems = async (ctx) => {
	try {
		const query = await db.checkQueryString(ctx.request.query);
		const result = await db.getItems(ctx, model, query);
		ctx.ok(result);
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
		const id = await utils.isIDGood(ctx.params.id);
		const result = await db.getItem(id, model);
		console.log('get item', result); 
		console.log('Reach user', ctx.res.body);
	} catch (error) {
		utils.handleError(ctx, error);
	}
};

/**
 * Update item function called by route
 * @param {Object} ctx - request & response
 */
exports.updateItem = async (ctx) => {
	console.log('update item', ctx.req);
	const id = await utils.isIDGood(ctx.params.id);
	const doesEmailExists = await emailer.emailExistsExcludingMyself(
		id,
		ctx.email
	);
	try {
		if (!doesEmailExists) {
			const result = await db.updateItem(id, model, ctx.req);
			console.log('the result', result);
			ctx.ok(result);
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
		// Gets locale from header 'Accept-Language'
		/* const locale = req.getLocale(); */
		const doesEmailExists = await emailer.emailExists(ctx.email);
		if (!doesEmailExists) {
			const item = await createItem(ctx);
			/* emailer.sendRegistrationEmailMessage(locale, item); */
			ctx.status(201).json(item);
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
		const id = await utils.isIDGood(ctx.id);
		ctx.status(200).json(await db.deleteItem(id, model));
	} catch (error) {
		utils.handleError(ctx, error);
	}
};