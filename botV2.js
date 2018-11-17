const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const app = express();
const port = 8080;

const logger = require('./utils/logger').logger;
const db = require('./utils/db');
const config = require('./config');
const routes  = require('./routes');
const twitter  = require('./twitter');

app.use(bodyParser.json());
app.use(morgan('dev'));
app.use('/bot', routes);

logger.info("Starting twitter bot...");

app.listen(port, () => {
	logger.info(`Bot app listening on port ${port} !`);
	db.connect(config.dbUrl, config.dbName, (err) => {
		if (err) {
			logger.error("Problem to connect to mongodb.");
			process.exit(1);
		}
		//twitter.startConcoursStream();
		//twitter.startConcours();
	});
});