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

		const __allColors__ = [
			'red', 'darkred', 'orange', 'blue', 'green', 'purple', 'crimson', 'deeppink',
			'mediumvioletred', 'darkorange', 'brown', 'goldenrod', 'darkkhaki', 'saddlebrown',
			'olive', 'seagreen', 'teal', 'navy', 'magenta', 'indigo', 'slateblue', 'darkslategray'
		];

		server.use(logger('dev'));
		server.use(bodyParser.json());
		server.use(bodyParser.urlencoded({ extended: true }));

		server.post('/api/users', (req, res) => {
			const { name = null } = req.query;
			const regex = /^[a-z]{2,}\s+[a-z]{2,}$/i;
			const date2K = moment('2000-01-01').toDate();

			if (!( name && _.isString(name) && regex.test(name) )) {
				return res.status(422).json({ status: 'failed', message: 'Invalid name.' });
			}

			const user = {
				id: uuid.v4(),
				name,
				birthdate: faker.date.past(15, date2K),
				color: _.sample(__allColors__),
				createdAt: moment().unix()
			};

			__allUsers__ = [ ...__allUsers__, user ];
			// trigger pusher notification

			return res.json({ status: 'success', user });
		});

		server.delete('/api/users/:userid', (req, res) => {
			const { userid } = req.params;
			const user = __allUsers__.find(({ id }) => id === userid);

			if (!user) {
				return res.status(404).json({ status: 'failed', message: 'User not found.' });
			}

			__allUsers__ = __allUsers__.filter(({ id }) => id !== userid);
			__allBirthdays__ = __allBirthdays__.filter(({ createdBy }) => createdBy !== userid);
			// trigger pusher notifications

			return res.json({ status: 'success', message: 'User destroyed successfully.', user });
		});

		server.post('/api/users/:userid/birthdays', (req, res) => {
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
					color: _.sample(__allColors__),
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
