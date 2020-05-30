const Koa = require('koa');
const KeyGrip = require('keygrip');
const cors = require('@koa/cors');
const json = require('koa-json');
const bodyparser = require('koa-bodyparser');
const morgan = require('koa-morgan');
const compression = require('koa-compress');
const helmet = require('koa-helmet');
const respond = require('koa-respond');
const i18n = require('koa-i18n');
const locale = require('koa-locale');
const passport = require('koa-passport');
const mount = require('koa-mount');
const graphqlHTTP = require('koa-graphql');
const schema = require('./graphql/schema');
const initDB = require('./config/database');


const api = require('./router');
const errorHandler = require('./middleware/errorHandler');

initDB();

const app = new Koa();
locale(app);

app.keys = new KeyGrip(['a complicated secret', 'i like onions'], 'sha256');

// x-response-time

app.use(async (ctx, next) => {
	const start = Date.now();
	await next();
	const ms = Date.now() - start;
	ctx.set('X-Response-Time', `${ms}ms`);
});


// logger
app.use(async (ctx, next) => {
	await next();
	const rt = ctx.response.get('X-Response-Time');
	console.log(`${ctx.method} ${ctx.url} - ${rt}`);
});

// Enable only in development HTTP request logger middleware
if (process.env.NODE_ENV === 'development') {
	app.use(morgan('dev'));
}

app.use(json());
app.use(bodyparser({
	enableTypes: ['json'],
	jsonLimit: '5mb',
	strict: true,
	onerror: function (err, ctx) {
		ctx.throw('body parse error', 422);
	}
}));

app.use(cors());
app.use(compression());
app.use(helmet());
app.use(respond());

app.use(i18n(app, {
	directory: `${__dirname}/locales`,
	locales: ['es', 'en'],
	objectNotation: true
}));

app.use(passport.initialize());
app.use(errorHandler);
app.use(mount('/graphql', graphqlHTTP({
	schema,
	graphiql: true
})));

app.use(api.middleware());


app.listen(process.env.PORT || 3000, () => console.log('server started 3000'));