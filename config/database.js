const mongoose = require('mongoose');
require('dotenv').config();

const initDB = () => {

	mongoose.connect(process.env.DB_CONNECTION, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useFindAndModify: false,
		serverSelectionTimeoutMS: 5000
	});

	var db = mongoose.connection;

	mongoose.Promise = global.Promise;

	mongoose.set('useCreateIndex', true);

	db.once('open', function () {
		console.log('connected to mongodb');
	});

	db.on('error', function (err) {
		console.log(err);
	});

};

module.exports = initDB;