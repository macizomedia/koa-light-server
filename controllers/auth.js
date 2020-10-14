const jwt = require('jsonwebtoken');
const User = require('../models/user');
const auth = require('../middleware/auth');
const UserAccess = require('../models/userAccess');
const ForgotPassword = require('../models/forgotPassword');
const utils = require('../middleware/utils');
const uuid = require('uuid');
const { addHours } = require('date-fns');
const emailer = require('../middleware/emailer');
const HOURS_TO_BLOCK = 2;
const LOGIN_ATTEMPTS = 5;

/*********************
 * Private functions *
 *********************/

/**
 * Generates a token
 * @param {Object} user - user object
 */
const generateToken = (user) => {
	// Gets expiration time
	const expiration =
        Math.floor(Date.now() / 1000) + 60 * process.env.JWT_EXPIRATION_IN_MINUTES;

	// returns signed and encrypted token
	return auth.encrypt(
		jwt.sign({
			data: {
				_id: user
			},
			exp: expiration
		},
		process.env.JWT_SECRET
		)
	);
};

/**
 * Creates an object with user info
 * @param {Object} req - request object
 */
const setUserInfo = (ctx) => {
	console.log(ctx);
	let user = {
		_id: ctx._id,
		name: ctx.name,
		email: ctx.email,
		role: ctx.role,
		verified: ctx.verified
	};
	// Adds verification for testing purposes
	if (process.env.NODE_ENV !== 'production') {
		user = {
			...user,
			verification: ctx.verification
		};
	}
	return user;
};
/**
 * Builds the registration token
 * @param {Object} item - user object that contains created id
 * @param {Object} userInfo - user object
 */
const returnRegisterToken = (item, userInfo) => {
	if (process.env.NODE_ENV !== 'production') {
		userInfo.verification = item.verification;
	}
	const data = {
		token: generateToken(item._id),
		user: userInfo
	};
	return data;
};
/**
 * Registers a new user in database
 * @param {Object} req - request object
 */
const registerUser = async (ctx) => {
	return new Promise((resolve, reject) => {
		const user = new User({
			name: ctx.request.body.name,
			email: ctx.request.body.email,
			password: ctx.request.body.password,
			verification: uuid.v4()
		});
		console.log(user);
		user.save((err, item) => {
			if (err) {
				reject(utils.buildErrObject(422, err.message));
			}
			resolve(item);
		});
	});
};

/**
 * Checks if blockExpires from user is greater than now
 * @param {Object} user - user object
 */
const userIsBlocked = async (user) => {
	return new Promise((resolve, reject) => {
		if (user.blockExpires > new Date()) {
			reject(utils.buildErrObject(409, 'BLOCKED_USER'));
		}
		resolve(true);
	});
};

/**
 * Saves login attempts to dabatabse
 * @param {Object} user - user object
 */
const saveLoginAttemptsToDB = async (user) => {
	return new Promise((resolve, reject) => {
		user.save((err, result) => {
			if (err) {
				reject(utils.buildErrObject(422, err.message));
			}
			if (result) {
				resolve(true);
			}
		});
	});
};

/**
 * Checks that login attempts are greater than specified in constant and also that blockexpires is less than now
 * @param {Object} user - user object
 */
const blockIsExpired = (user) =>
	user.loginAttempts > LOGIN_ATTEMPTS && user.blockExpires <= new Date();

/**
 *
 * @param {Object} user - user object.
 */
const checkLoginAttemptsAndBlockExpires = async (user) => {
	return new Promise((resolve, reject) => {
		// Let user try to login again after blockexpires, resets user loginAttempts
		if (blockIsExpired(user)) {
			user.loginAttempts = 0;
			user.save((err, result) => {
				if (err) {
					reject(utils.buildErrObject(422, err.message));
				}
				if (result) {
					resolve(true);
				}
			});
		} else {
			// User is not blocked, check password (normal behaviour)
			resolve(true);
		}
	});
};

/**
 * Finds user by email
 * @param {string} email - user´s email
 */
const findUser = async (email) => {
	return new Promise((resolve, reject) => {
		User.findOne(
			{
				email
			},
			'password loginAttempts blockExpires name email role verified verification',
			(err, item) => {
				utils.itemNotFound(err, item, reject, 'USER_DOES_NOT_EXIST');
				resolve(item);
			}
		);
	});
};

/**
 * Saves a new user access and then returns token
 * @param {Object} req - request object
 * @param {Object} user - user object
 */
const saveUserAccessAndReturnToken = async (ctx, user) => {
	return new Promise((resolve, reject) => {
		const userAccess = new UserAccess({
			email: user.email,
			ip: utils.getIP(ctx.req),
			browser: utils.getBrowserInfo(ctx.req),
			country: utils.getCountry(ctx.req)
		});
		console.log(userAccess);
		userAccess.save((err) => {
			if (err) {
				reject(utils.buildErrObject(422, err.message));
			}
			const userInfo = setUserInfo(user);
			// Returns data with access token
			resolve({
				token: generateToken(user._id),
				user: userInfo
			});
		});
	});
};

/**
 * Blocks a user by setting blockExpires to the specified date based on constant HOURS_TO_BLOCK
 * @param {Object} user - user object
 */
const blockUser = async (user) => {
	return new Promise((resolve, reject) => {
		user.blockExpires = addHours(new Date(), HOURS_TO_BLOCK);
		user.save((err, result) => {
			if (err) {
				reject(utils.buildErrObject(422, err.message));
			}
			if (result) {
				resolve(utils.buildErrObject(409, 'BLOCKED_USER'));
			}
		});
	});
};

/**
 * Adds one attempt to loginAttempts, then compares loginAttempts with the constant LOGIN_ATTEMPTS, if is less returns wrong password, else returns blockUser function
 * @param {Object} user - user object
 */
const passwordsDoNotMatch = async (user) => {
	user.loginAttempts += 1;
	await saveLoginAttemptsToDB(user);
	return new Promise((resolve, reject) => {
		if (user.loginAttempts <= LOGIN_ATTEMPTS) {
			resolve(utils.buildErrObject(409, 'WRONG_PASSWORD'));
		} else {
			resolve(blockUser(user));
		}
		reject(utils.buildErrObject(422, 'ERROR'));
	});
};

/**
 * Checks if verification id exists for user
 * @param {string} id - verification id
 */
const verificationExists = async (id) => {
	return new Promise((resolve, reject) => {
		User.findOne(
			{
				verification: id,
				verified: false
			},
			(err, user) => {
				utils.itemNotFound(err, user, reject, 'NOT_FOUND_OR_ALREADY_VERIFIED');
				resolve(user);
			}
		);
	});
};

/**
 * Verifies an user
 * @param {Object} user - user object
 */
const verifyUser = async (user) => {
	return new Promise((resolve, reject) => {
		user.verified = true;
		user.save((err, item) => {
			if (err) {
				reject(utils.buildErrObject(422, err.message));
			}
			resolve({
				email: item.email,
				verified: item.verified
			});
		});
	});
};
/**
 * Builds an object with created forgot password object, if env is development or testing exposes the verification
 * @param {Object} item - created forgot password object
 */
const forgotPasswordResponse = (item) => {
	let data = {
		msg: 'RESET_EMAIL_SENT',
		email: item.email
	};
	if (process.env.NODE_ENV !== 'production') {
		data = {
			...data,
			verification: item.verification
		};
	}
	return data;
};

const markResetPasswordAsUsed = async (ctx, forgot) => {
	return new Promise((resolve, reject) => {
		forgot.used = true;
		forgot.ipChanged = utils.getIP(ctx);
		forgot.browserChanged = utils.getBrowserInfo(ctx);
		forgot.countryChanged = utils.getCountry(ctx);
		forgot.save((err, item) => {
			utils.itemNotFound(err, item, reject, 'NOT_FOUND');
			resolve(utils.buildSuccObject('PASSWORD_CHANGED'));
		});
	});
};

/**
 * Finds user by email to reset password
 * @param {string} email - user email
 */
const findUserToResetPassword = async (email) => {
	return new Promise((resolve, reject) => {
		User.findOne(
			{
				email
			},
			(err, user) => {
				utils.itemNotFound(err, user, reject, 'NOT_FOUND');
				resolve(user);
			}
		);
	});
};

const updatePassword = async (password, user) => {
	return new Promise((resolve, reject) => {
		user.password = password;
		user.save((err, item) => {
			utils.itemNotFound(err, item, reject, 'NOT_FOUND');
			resolve(item);
		});
	});
};
/**
 * Checks if a forgot password verification exists
 * @param {string} id - verification id
 */
const findForgotPassword = async (id) => {
	return new Promise((resolve, reject) => {
		ForgotPassword.findOne(
			{
				verification: id,
				used: false
			},
			(err, item) => {
				utils.itemNotFound(err, item, reject, 'NOT_FOUND_OR_ALREADY_USED');
				resolve(item);
			}
		);
	});
};

/**
 * Creates a new password forgot
 * @param {Object} req - request object
 */
const saveForgotPassword = async (ctx) => {
	return new Promise((resolve, reject) => {
		const forgot = new ForgotPassword({
			email: ctx.request.body.email,
			verification: uuid.v4(),
			ipRequest: utils.getIP(ctx.req),
			browserRequest: utils.getBrowserInfo(ctx.req),
			countryRequest: utils.getCountry(ctx.req)
		});
		console.log(forgot);
		forgot.save((err, item) => {
			if (err) {
				reject(utils.buildErrObject(422, err.message));
			}
			resolve(item);
		});
	});
};

/**
 * Finds user by ID
 * @param {string} id - user´s id
 */
const findUserById = async (userId) => {
	return new Promise((resolve, reject) => {
		User.findById(userId, (err, item) => {
			utils.itemNotFound(err, item, reject, 'USER_DOES_NOT_EXIST');
			resolve(item);
		});
	});
};

/**
 * Gets user id from token
 * @param {string} token - Encrypted and encoded token
 */
const getUserIdFromToken = async (token) => {
	return new Promise((resolve, reject) => {
		// Decrypts, verifies and decode token
		jwt.verify(auth.decrypt(token), process.env.JWT_SECRET, (err, decoded) => {
			if (err) {
				reject(utils.buildErrObject(409, 'BAD_TOKEN'));
			}
			resolve(decoded.data._id);
		});
	});
};


/**
 * Checks against user if has quested role
 * @param {Object} data - data object
 * @param {*} next - next callback
 */
const checkPermissions = async (data, next) => {
	return new Promise((resolve, reject) => {
		User.findById(data.id, (err, result) => {
			utils.itemNotFound(err, result, reject, 'NOT_FOUND');
			if (data.roles.indexOf(result.role) > -1) {
				return resolve(next());
			}
			return reject(utils.buildErrObject(401, 'UNAUTHORIZED'));
		});
	});
};

/********************
 * Public functions *
 ********************/

/**
 * Login function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.login = async (ctx) => {
	console.log(ctx.request);
	try {
		const data = ctx.request.body;
		const user = await findUser(data.email);
		console.log(user);
		await userIsBlocked(user);
		await checkLoginAttemptsAndBlockExpires(user);
		const isPasswordMatch = await auth.checkPassword(data.password, user);
		if (!isPasswordMatch) {
			utils.handleError(ctx, await passwordsDoNotMatch(user));
		} else {
			// all ok, register access and return token
			user.loginAttempts = 0;
			await saveLoginAttemptsToDB(user);
			const response = await saveUserAccessAndReturnToken(ctx, user);
			const token = response.token;
			ctx.header.authorization= `Bearer ${token}`;
			ctx.state.user = response.user;
			console.log(response);
			ctx.ok(response);
		}
	} catch (error) {
		utils.handleError(ctx, error);
	}
};

/**
 * Register function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.register = async (ctx, next) => {
	try {
		const doesEmailExists = await emailer.emailExists(ctx.request.body.email);
		if (!doesEmailExists) {
			const item = await registerUser(ctx);
			const userInfo = setUserInfo(item);
			const response = returnRegisterToken(item, userInfo);
			console.log(response);
			ctx.ok(response);
		}
	} catch (error) {
		utils.handleError(ctx.res, error);
	}
	next();
};

/**
 * Verify function called by route
 * @param {Object} ctx - request response object
 */
exports.verify = async (ctx) => {
	console.log(ctx.request.query.id);
	try {
		const user = await verificationExists(ctx.request.query.id);
		const response = await verifyUser(user);
		console.log(response);
		ctx.ok(response);
	} catch (error) {
		utils.handleError(ctx, error);
	}
};

/**
 * Forgot password function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.forgotPassword = async (ctx) => {
	try {
		console.log(ctx.request.body);
		/* const locale = ctx.getLocale(); */
		const data = ctx.request.body;
		await findUser(data.email);
		const item = await saveForgotPassword(ctx);
		/* emailer.sendResetPasswordEmailMessage(locale, item); */
		const response = forgotPasswordResponse(item);
		ctx.ok(response);
	} catch (error) {
		utils.handleError(ctx, error);
	}
};

/**
 * Reset password function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.resetPassword = async (ctx) => {
	try {
		console.log(ctx.request.body);
		const data = ctx.request.body;
		const forgotPassword = await findForgotPassword(data.id);
		const user = await findUserToResetPassword(forgotPassword.email);
		await updatePassword(data.password, user);
		const result = await markResetPasswordAsUsed(ctx, forgotPassword);
		ctx.ok(result);
	} catch (error) {
		utils.handleError(ctx, error);
	}
};

/**
 * Refresh token function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.getRefreshToken = async (ctx) => {
	try {
		const tokenEncrypted = ctx.request.header.authorization
			.replace('Bearer ', '')
			.trim();
		let userId = await getUserIdFromToken(tokenEncrypted);
		userId = await utils.isIDGood(userId);
		const user = await findUserById(userId);
		const token = await saveUserAccessAndReturnToken(ctx, user);
		// Removes user info from response
		delete token.user;
		ctx.ok(token);
	} catch (error) {
		utils.handleError(ctx, error);
	}
};

/**
 * Roles authorization function called by route
 * @param {Array} roles - roles specified on the route
 */
exports.roleAuthorization = (roles) => async (ctx, next) => {
	console.log(ctx.request.header.authorization);
	try {
		const data = {
			id: ctx.req.user._id,
			roles
		};
		await checkPermissions(data, next);
	} catch (error) {
		utils.handleError(ctx, error);
	}
};