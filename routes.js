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
	res.status(200).send(config);
});

router.post('/config', (req, res) => {
	let reqConcoursInter = req.body.concoursInterval;
	if(reqConcoursInter && reqConcoursInter != config.concoursInterval){
		logger.info("Bot config 'concoursInterval' is updated (from " + config.concoursInterval + "s to " + reqConcoursInter + "s)");
		twitter.stopConcours();
		config.concoursInterval = reqConcoursInter;
		twitter.startConcours();
	}
	res.status(200).send({msg: "New bot configuration updated"});
});

module.exports = router;