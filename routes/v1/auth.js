module.exports = async (ctx, next) => {
    ctx.status = 200
    console.log('auth middleware reached')
	// passport 
	await (next)
};