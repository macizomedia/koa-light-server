const { checkBody } = require('koa-validation');
/**
 * Validates register request
 */
exports.register = function  (data, next) {
	checkBody('name').notEmpty('must provide a name').len(3, 20),
	checkBody('email').notEmpty().isEmail('your enter a bad email.'),
	checkBody('password').notEmpty().len(5, 20),
	next();
};

/**
 * Validates login request
 */
exports.login = function * () {
	this.checkBody('email').notEmpty().isEmail('your enter a bad email.'),
	this.checkBody('password').notEmpty().len(5, 20),
	yield this.ctx.req.body;
};
