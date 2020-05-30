const router = require('koa-joi-router');
const Joi = router.Joi;

const auth = require('./controllers/auth');
const api = router();

api.get('/', async (ctx) => {
	ctx.body = 'hello joi-router!';
});

api.route({
	method: 'post',
	path: '/signup',
	validate: {
		body: {
			name: Joi.string().max(100),
			email: Joi.string().lowercase().email(),
			role: Joi.optional(),
			verified: Joi.bool().default(false),
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
				}
			}
		}
	},
	handler: auth.register,
});


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
				}
			}
		}
	},
	handler: auth.login,
});

module.exports = api;