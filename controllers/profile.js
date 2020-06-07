const model = require('../models/user');
const utils = require('../middleware/utils');
const auth = require('../middleware/auth');

/*********************
 * Private functions *
 *********************/

/**
 * Gets profile from database by id
 * @param {string} id - user id
 */
const getProfileFromDB = async (id) => {
	return new Promise((resolve, reject) => {
		model.findById(id, '-_id -updatedAt -createdAt', (err, user) => {
			utils.itemNotFound(err, user, reject, 'NOT_FOUND');
			resolve(user);
		});
	});
};

/**
 * Updates profile in database
 * @param {Object} ctx - request object
 * @param {string} id - user id
 */
const updateProfileInDB = async (ctx, id) => {
	return new Promise((resolve, reject) => {
		model.findByIdAndUpdate(
			id,
			ctx,
			{
				new: true,
				runValidators: true,
				select: '-role -_id -updatedAt -createdAt'
			},
			(err, user) => {
				utils.itemNotFound(err, user, reject, 'NOT_FOUND');
				resolve(user);
			}
		);
	});
};

/**
 * Finds user by id
 * @param {string} email - user id
 */
const findUser = async (id) => {
	return new Promise((resolve, reject) => {
		model.findById(id, 'password email', (err, user) => {
			utils.itemNotFound(err, user, reject, 'USER_DOES_NOT_EXIST');
			resolve(user);
		});
	});
};

/**
 * Build passwords do not match object
 * @param {Object} user - user object
 */
const passwordsDoNotMatch = async () => {
	return new Promise((resolve) => {
		resolve(utils.buildErrObject(409, 'WRONG_PASSWORD'));
	});
};

/**
 * Changes password in database
 * @param {string} id - user id
 * @param {Object} ctx - request object
 */
const changePasswordInDB = async (id, ctx) => {
	return new Promise((resolve, reject) => {
		model.findById(id, '+password', (err, user) => {
			utils.itemNotFound(err, user, reject, 'NOT_FOUND');

			// Assigns new password to user
			user.password = ctx.newPassword;

			// Saves in DB
			user.save((error) => {
				if (err) {
					reject(utils.buildErrObject(422, error.message));
				}
				resolve(utils.buildSuccObject('PASSWORD_CHANGED'));
			});
		});
	});
};

/********************
 * Public functions *
 ********************/

/**
 * Get profile function called by route
 * @param {Object} ctx - request & response
 */
exports.getProfile = async (ctx) => {
	try {
		const id = await utils.isIDGood(ctx.state.user._id);
		const result = await getProfileFromDB(id);
		ctx.ok(result);
	} catch (error) {
		utils.handleError(ctx, error);
	}
};

/**
 * Update profile function called by route
* @param {Object} req - request & response
 */
exports.updateProfile = async (ctx) => {
	try {
		const id = await utils.isIDGood(ctx.params.id);
		const result = await updateProfileInDB(ctx.req.user, id);
		console.log(result);
		ctx.ok(result);
	} catch (error) {
		utils.handleError(ctx, error);
	}
};

/**
 * Change password function called by route
* @param {Object} req - request & response
 */
exports.changePassword = async (ctx) => {
	try {
		const id = await utils.isIDGood(ctx.user._id);
		const user = await findUser(id);
		const isPasswordMatch = await auth.checkPassword(ctx.oldPassword, user);
		if (!isPasswordMatch) {
			utils.handleError(ctx, await passwordsDoNotMatch());
		} else {
			// all ok, proceed to change password
			const result = await changePasswordInDB(id, ctx);
			ctx.ok(result);
		}
	} catch (error) {
		utils.handleError(ctx, error);
	}
};