const router = require('koa-joi-router');
const Joi = router.Joi;

require('./config/passport');
const passport = require('koa-passport');
const requireAuth = passport.authenticate('jwt', {
	session: false
});
const profile = require('./controllers/profile');
const cities = require('./controllers/cities');
const user = require('./controllers/users');
const auth = require('./controllers/auth');

const api = router(); 

api.get('/profile', requireAuth, profile.getProfile);

api.patch('/profile', requireAuth, profile.updateProfile);

api.post('/profile/changePassword', profile.changePassword);



api.get('/cities/all', requireAuth, cities.getAllItems);

api.get('/cities', requireAuth, cities.getItems);

api.post('/cities', requireAuth, cities.createItem);

api.get('/cities/:id', requireAuth, cities.getItem);

api.patch('/cities/:id', requireAuth, cities.updateItem);

api.delete('/cities/:id', requireAuth, cities.deleteItem);



/*********************
 * Router & Validation *
 *********************/

/*
 * Auth routes
 */

/**
 * Signup
 * @param {JSON} user - user object
 */
api.route({
	method: 'post',
	path: '/signup',
	validate: {
		body: {
			name: Joi.string().max(100),
			email: Joi.string().lowercase().email(),
			password: Joi.string().max(100),
		},
		type: 'json',
		output: {
			200: {
				body: {
					token: Joi.string(),
					user: {
						_id: Joi.any(),
						name: Joi.string(),
						email: Joi.string().lowercase().email(),
						role: Joi.string(),
						verified: Joi.bool(),
						verification: Joi.string()
					}
				},
				headers: Joi.object({
					authorization: Joi.string().required()
				}).options({
					allowUnknown: true
				})
			}
		}
	},
	handler: auth.register,
});
/**
 * Login
 * @param {JSON} user - user object
 */
api.route({
	method: 'post',
	path: '/login',
	validate: {
		body: {
			email: Joi.string().lowercase().email().required(),
			password: Joi.string().max(100),
			_csrf: Joi.string().token()
		},
		type: 'json',
		output: {
			200: {
				body: {
					token: Joi.string(),
					user: {
						_id: Joi.any(),
						name: Joi.string(),
						email: Joi.string().lowercase().email(),
						role: Joi.string(),
						verified: Joi.bool(),
						verification: Joi.string()
					}
				},
				headers: Joi.object({
					authorization: Joi.string()
				}).options({
					allowUnknown: true
				})
			}
		}
	},
	handler: auth.login,
});
/**
 * Verify
 * @param {string} token - token string
 */
api.route({
	method: 'post',
	path: '/verify',
	validate: {
		params: {
			id: Joi.string()
		},
		output: {
			200: {
				body: {
					email: Joi.string().lowercase().email(),
					verified: Joi.bool()
				}
			}
		}
	},
	handler: auth.verify,
});
/**
 * Forgot
 * @param {JSON} user - user object
 */
api.route({
	method: 'post',
	path: '/forgot',
	validate: {
		params: {
			email: Joi.string().lowercase().email(),
		},
		output: {
			200: {
				body: {
					email: Joi.string().lowercase(),
					verification:Joi.string(),
					msg: Joi.string()
				}
			}
		}
	},
	handler: auth.forgotPassword,
});
/**
 * Reset Password
 * @param {string} token - token string
 */
api.route({
	method: 'post',
	path: '/reset',
	validate: {
		params: {
			email: Joi.string().lowercase().email(),
			password: Joi.string().max(100),
			id:Joi.string()
		},
		output: {
			200: {
				body: {
					email: Joi.string().lowercase(),
					verification:Joi.string(),
					msg: Joi.string()
				}
			}
		}
	},
	handler: auth.resetPassword,
});
/**
 * Refresh Token
 * @param {string} token - token string
 */
api.route({
	method: 'post',
	path: '/token',
	validate: {
		header: {
			authorization: Joi.string(),
			accept: Joi.optional(),
			'postman-token': Joi.optional(),
			'user-agent': Joi.optional(),
			host: Joi.optional(),
			'content-length': Joi.optional(),
			'accept-encoding':Joi.optional(),
			connection:Joi.optional(),
		},
		output: {
			'100-200,300-599': {
				headers: Joi.object({
					authorization: Joi.string().required()
				}).options({
					allowUnknown: true
				})
			}
		}
	},
	handler: auth.getRefreshToken,
});

/*
 * Profile routes
 */

api.route({
	method: ['get', 'post'],
	path: '/profile',
	validate: {
		header: {
			authorization: Joi.string(),
			accept: Joi.optional(),
			'user-agent': Joi.optional(),
			host: Joi.optional(),
			'content-length': Joi.optional(),
			'accept-encoding':Joi.optional(),
			connection:Joi.optional(),
		},
		body: {
			email: Joi.string().lowercase().email().required(),
			password: Joi.string().max(100),
			_csrf: Joi.string().token()
		},
		type: 'json',
		output: {
			200: {
				body: {
					token: Joi.string(),
					user: {
						_id: Joi.any(),
						name: Joi.string(),
						email: Joi.string().lowercase().email(),
						role: Joi.string(),
						verified: Joi.bool(),
						verification: Joi.string()
					}
				},
				headers: Joi.object({
					authorization: Joi.string()
				}).options({
					allowUnknown: true
				})
			}
		}
	},
	handler: [requireAuth, profile.getProfile]
	/*  auth.roleAuthorization(['admin']),   */
});


/*
 * Users routes
 */

/*
 * Get items route
 */


api.route({
	method: ['get'],
	path: '/users',
	validate: {
		params: {
			query:Joi.string().alphanum()
		},
		output: {
			'100-200,300-599': {
				headers: Joi.object({
					authorization: Joi.string()
				}).options({
					allowUnknown: true
				})
			}
		}
	},
	handler: [requireAuth, user.getItems]
	/*  auth.roleAuthorization(['admin']),   */
});

api.post('/users', requireAuth, user.createItem);


api.get('/users/:id', requireAuth, user.getItem);


api.route({
	method: ['patch'],
	path: '/users/:id',
	validate: {
		params: {
			query: Joi.string().alphanum()
		},
		body: {
			email: Joi.string().lowercase().email().required(),
			password: Joi.string().max(100),
			role: Joi.string(),
			city: Joi.string(),
			country: Joi.string(),
			phone: Joi.number()
		},
		type: 'json',
	},
	handler: user.updateItem,
});

api.delete('/users/:id', requireAuth, user.deleteItem);

module.exports = api;