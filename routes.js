const express = require('express');
const router = express.Router();
const db = require('./utils/db');
const logger = require('./utils/logger').logger;
const twitter  = require('./twitter');
const config = require('./config');

router.get('/stats', (req, res) => {
	res.setHeader('Content-Type', 'application/json');
	let statsCol = db.get().collection("stats");
	statsCol.find({}).toArray((err, result) => {
		if (err) {
			res.status(500).send(err);
			return;
		}
		res.status(200).send(result);
	});
});

router.get('/stats/reset', (req, res) => {
	res.setHeader('Content-Type', 'application/json');
	let statsCol = db.get().collection("stats");
	statsCol.drop((err, result) => {
		if (err) {
			res.status(500).send(err);
			return;
		}
		res.status(200).send({msg: "stats reset OK"});
	});
});

router.get('/tweets', (req, res) => {
	res.setHeader('Content-Type', 'application/json');
	let concoursTweets = db.get().collection("concoursTweets");
	concoursTweets.find({}).sort({ _id: -1 }).limit(10).toArray((err, result) => {
		if (err) {
			res.status(500).send(err);
			return;
		}
		res.status(200).send(result);
	});
});

router.get('/tweets/reset', (req, res) => {
	res.setHeader('Content-Type', 'application/json');
	let concoursTweets = db.get().collection("concoursTweets");
	concoursTweets.drop((err, result) => {
		if (err) {
			res.status(500).send(err);
			return;
		}
		res.status(200).send({msg: "concoursTweets reset OK"});
	});
});

router.get('/tweets/dropAll', (req, res) => {
	res.setHeader('Content-Type', 'application/json');
	let concoursTweets = db.get().collection("concoursTweets");
	concoursTweets.drop((err, result) => {
		if (err) {
			res.status(500).send(err);
			return;
		}
		res.status(200).send({msg: "concoursTweets reset OK"});
	});
});

router.get('/startStream', (req, res) => {
	res.setHeader('Content-Type', 'application/json');
	twitter.startConcoursStream();
	res.status(200).send({msg: "startStream OK"});
});

router.get('/stopStream', (req, res) => {
	res.setHeader('Content-Type', 'application/json');
	twitter.stopConcoursStream();
	res.status(200).send({msg: "stopStream OK"});
});

router.get('/startConcours', (req, res) => {
	res.setHeader('Content-Type', 'application/json');
	twitter.startConcours();
	res.status(200).send({msg: "startConcours OK"});
});

router.get('/stopConcours', (req, res) => {
	res.setHeader('Content-Type', 'application/json');
	twitter.stopConcours();
	res.status(200).send({msg: "stopConcours OK"});
});

router.get('/config', (req, res) => {
	res.setHeader('Content-Type', 'application/json');
	let cfg = config;
	delete cfg.dbUrl;
	delete cfg.dbName;
	res.status(200).send(cfg);
});

router.post('/config', (req, res) => {
	let concoursInterval = req.body.concoursInterval;
	let nbConcoursTweetsPerInterval = req.body.nbConcoursTweetsPerInterval;
	let nbRandomTweetsPerInterval = req.body.nbRandomTweetsPerInterval;
	let stream = req.body.stream;
	let concours = req.body.concours;
	let msg = [];
	let configHasChanged = false;

	if(concoursInterval && concoursInterval != config.concoursInterval){
		msg.push("concoursInterval is updated (from " + config.concoursInterval + "min to " + concoursInterval + "min)");
		config.concoursInterval = concoursInterval;
		configHasChanged = true;
	} 
	if(nbConcoursTweetsPerInterval && nbConcoursTweetsPerInterval != config.nbConcoursTweetsPerInterval){
		msg.push("nbConcoursTweetsPerInterval is updated (from " + config.nbConcoursTweetsPerInterval + " to " + nbConcoursTweetsPerInterval + ")");
		config.nbConcoursTweetsPerInterval = nbConcoursTweetsPerInterval;
		configHasChanged = true;
	}
	if(nbRandomTweetsPerInterval && nbRandomTweetsPerInterval != config.nbRandomTweetsPerInterval){
		msg.push("nbRandomTweetsPerInterval is updated (from " + config.nbRandomTweetsPerInterval + " to " + nbRandomTweetsPerInterval + ")");
		config.nbRandomTweetsPerInterval = nbRandomTweetsPerInterval;
		configHasChanged = true;
	}

	if(configHasChanged){
		logger.info("Config has changed:");
		msg.forEach((m) => {
			logger.info(m);
		});
	}

	if(config.stream != stream){
		if(stream && !config.stream){
			twitter.startConcoursStream();
		} 
		else if(!stream && config.stream) {
			twitter.stopConcoursStream();
		}
		config.stream = stream;
	}

	if(config.concours != concours){
		if(concours && !config.concours){
			twitter.startConcours();
		} 
		else if(!concours && config.concours) {
			twitter.stopConcours();
		}
		config.concours = concours;
	} 
	else if(config.concours && config.concours == concours && configHasChanged) {
		logger.info("Restarting because config has changed.");
		twitter.stopConcours();
		twitter.startConcours();
	}

	res.status(200).send({msg: "New bot configuration updated."});
});

module.exports = router;