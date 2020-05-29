const controller = require('../controllers/auth');
const validate = require('../controllers/auth.validate');
const trimRequest = require('trim-request');

exports.login = async (ctx, next) => {
    ctx.status = 200
    console.log('auth middleware reached')
	// passport 
	trimRequest.All
	validate.login
	controller.login
	await (next)
};

exports.register = async (ctx, next) => {
	