const _ = require('lodash');
const next = require('next');
const uuid = require('uuid');
const faker = require('faker');
const logger = require('morgan');
const moment = require('moment');
const Pusher = require('pusher');
const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv').config();

const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;

const app = next({ dev });
const handler = app.getRequestHandler();

// Ensure that your pusher credentials are properly set in the .env file
// Using the specified variables
const pusher = new Pusher({
	appId: process.env.PUSHER_APP_ID,
	key: process.env.PUSHER_APP_KEY,
	secret: process.env.PUSHER_APP_SECRET,
	cluster: process.env.PUSHER_APP_CLUSTER,
	encrypted: true
});

app.prepare()
	.then(() => {

		const server = express();

		let __allUsers__ = [];
		let __allBirthdays__ = [];

		server.use(logger('dev'));
		server.use(bodyParser.json());
		server.use(bodyParser.urlencoded({ extended: true }));

		server.post('/api/:userid/manage/birthdays', (req, res) => {
			const { count = 1 } = req.query;
			const { userid } = req.params;

			const birthdays = [];
			const countNumber = +count;
			const date2K = moment('2000-01-01').toDate();

			const length = countNumber && _.isNumber(countNumber)
				? Math.max(1, Math.min(100, countNumber))
				: 1;

			while (length > birthdays.length) {
				birthdays.push({
					id: uuid.v4(),
					name: faker.name.findName(),
					birthdate: faker.date.past(15, date2K),
					color: _.sample([
						'red', 'dark-red', 'orange', 'blue', 'green', 'purple', 'crimson', 'deep-pink',
						'medium-violet-red', 'dark-orange', 'brown', 'golden-rod', 'dark-khaki', 'saddle-brown',
						'olive', 'sea-green', 'teal', 'navy', 'magenta', 'indigo', 'slate-blue', 'dark-slate-gray'
					]),
					createdBy: userid
				});
			}

			__allBirthdays__ = [ ...__allBirthdays__, ...birthdays ];
			// trigger pusher notification

			return res.json({ status: 'success', count: length, birthdays });
		});

		server.get('*', (req, res) => {
			return handler(req, res);
		});

		server.listen(port, err => {
			if (err) throw err;
			console.log(`> Ready on http://localhost:${port}`);
		});

	})
	.catch(ex => {
		console.error(ex.stack);
		process.exit(1);
	});
