const Twitter = require('twitter');
const express = require('express')
const app = express()
const port = 3000
const logger = require('./logger').logger;
const payloadLogger = require('./logger').payloadLogger;
const db = require('./db');
const config = require('./config');

const twitter = new Twitter({
	consumer_key: process.env.consumer_key,
	consumer_secret: process.env.consumer_secret,
	access_token_key: process.env.access_token_key,
	access_token_secret: process.env.access_token_secret
});

let apiCall = true;
let concoursStream = null;
let nbProcessedTweet = 0;
let maxTweets = 5;
let pauseConcours = 5 * 60 * 1000; //5m
let concoursMaxDuration = 2 * 60 * 60 * 1000; //2h

logger.info("Starting twitter bot...");

let retweet = (tweet, cb) => {
	twitter.post('statuses/retweet/' + tweet.id_str, (err, tweet, response) => {
		if (err) {
			logger.error("RT " + tweet.id_str + " failed cause:" + JSON.stringify(err));
			cb(err);
		} else {
			logger.info("RT " + tweet.id_str + " done.");
			cb();
		}
	});
}

let getInstructions = (tweet) => {
	let txt = "";
	if (tweet.retweeted_status.extended_tweet)
		txt = tweet.retweeted_status.extended_tweet.full_text.toUpperCase();
	else
		txt = tweet.retweeted_status.text.toUpperCase();
	let rt = txt.includes("RT");
	let follow = txt.includes("FOLLOW") || txt.includes("SUIVRE");
	let like = txt.includes("LIKE") || txt.includes("AIME");
	let inst = "";
	if (rt) inst += "RT";
	if (follow) {
		if (inst.length > 0) inst += ", ";
		inst += "Follow";
	}
	if (like) {
		if (inst.length > 0) inst += ", ";
		inst += "Like";
	}
	return {
		"str": "[" + inst + "]",
		"rt": rt,
		"follow": follow,
		"like": like
	};
}

let followUser = (tweet, user) => {
	twitter.post('friendships/create', { user_id: user.id_str, follow: true }, (err, resp) => {
		if (err)
			logger.error("Follow " + user.id_str + " failed cause:" + JSON.stringify(err));
		logger.info("Follow " + user.id_str + " done (" + tweet.id_str + ")");
	});
}

let getRates = () => {
	twitter.get('application/rate_limit_status', (err, resp) => {
		if (err)
			logger.error("application/rate_limit_status " + JSON.stringify(err));
		logger.info("application/rate_limit_status  " + JSON.stringify(resp));
	});
}

let getTwitById = (id) => {
	twitter.get('statuses/show/' + id, (err, resp) => {
		if (err)
			logger.error("statuses/show/:id " + JSON.stringify(err));
		logger.info("statuses/show/:id  " + JSON.stringify(resp));
	});
}

let errorTweet = (error) => {
	logger.error("Problem with stream ! " + JSON.stringify(error));
	process.exit(1);
}

let printTweetUrl = (tweet) => {
	return "https://twitter.com/" + tweet.user.screen_name + "/status/" + tweet.id_str;
}

let processTweet = (tweet) => {
	if (nbProcessedTweet == maxTweets) {
		logger.info("------------------------------------------------------------------------------");
		logger.info("  Stop stream. Listen stream again after " + pauseConcours / 1000 / 60 + "m");
		logger.info("------------------------------------------------------------------------------");
		nbProcessedTweet = 0;
		concoursStream.destroy();

		postRandomTweet();
		setTimeout(() => {
			postRandomTweet();
		}, 2000);
		setTimeout(() => {
			postRandomTweet();
		}, 3000);

		setTimeout(() => {
			startConcoursStream();
		}, pauseConcours);
	}

	payloadLogger.info(tweet.id_str + " " + JSON.stringify(tweet));
	let msg = printTweetUrl(tweet);

	let rtTweet = tweet.retweeted_status;
	if (!rtTweet) {
		logger.warn(msg);
		return;
	}
	if (rtTweet) {
		msg = printTweetUrl(rtTweet);
	}

	let instructions = getInstructions(tweet);
	if (!instructions.rt && !instructions.follow) {
		logger.warn(msg);
		return;
	}

	if (apiCall && rtTweet && instructions.rt && !rtTweet.retweeted) {
		retweet(rtTweet, (err) => {
			if (err) return;

			updateBotStats("concoursRT");

			if (apiCall && instructions.follow && tweet.entities.user_mentions) {
				tweet.entities.user_mentions.forEach(user => {
					followUser(tweet, user);
				});
			}

			logger.info(msg + " " + instructions.str);
			nbProcessedTweet++;
		});
	}
}

let updateBotStats = (rtType) => {
	let statsCol = db.get().collection("stats");

	statsCol.findOne({ id: rtType }, (err, result) => {
		if (err) {
			logger.error(rtType + " stats update findOne : " + JSON.stringify(err));
		}
		else if (!result) {
			let botStats = { id: rtType, value: 1 };
			statsCol.insertOne(botStats, (err, result) => {
				if (err)
					logger.error(rtType + " stats update insertOne : " + JSON.stringify(err));
				else
					logger.info(rtType + " stats created.");
			});
		}
		else {
			statsCol.updateOne({ id: rtType }, { $inc: { value: 1 } }, (err, result) => {
				if (err)
					logger.error(rtType + " stats update value +1 : " + JSON.stringify(err));
				else
					logger.info(rtType + " stats updated.");
			});
		}
	});
}

let postTweet = (status) => {
	twitter.post('statuses/update', { status: status }, (error, tweet, response) => {
		if (error)
			logger.error("Random RT: " + JSON.stringify(error));
		logger.info("Random RT: Tweet done.");

		updateBotStats("randomRT");
	});
}

let postRandomTweet = () => {
	let tweetCollection = db.get().collection("tweets");
	tweetCollection.aggregate([
		{ $sample: { size: 1 } }
	]).toArray((err, docs) => {
		if (err)
			logger.error("Random RT: " + JSON.stringify(err));
		let tweet = docs[0];
		payloadLogger.info(JSON.stringify(tweet));
		let status = tweet.full_text;
		if (tweet.retweeted_status) {
			status = tweet.retweeted_status.full_text;
			if (tweet.retweeted_status.entities && tweet.retweeted_status.entities.urls) {
				tweet.retweeted_status.entities.urls.forEach(urlElem => {
					if (!status.includes(urlElem.url))
						status += urlElem.url;
				});
			}
		}
		logger.info("Random RT: " + printTweetUrl(tweet));
		postTweet(status);
	});
}

let startConcoursStream = () => {
	logger.info("------------------------------------------------------------------");
	logger.info("                  Start concours stream...                        ");
	logger.info("------------------------------------------------------------------");

	twitter.stream('statuses/filter', { track: '#CONCOURS, CONCOURS' }, stream => {
		concoursStream = stream;

		setTimeout(() => {
			logger.info("Bot stopped after " + (concoursMaxDuration / 1000) + "s");
			concoursStream.destroy();
			process.exit(1);
		}, concoursMaxDuration);

		stream.on('data', processTweet);
		stream.on('error', errorTweet);
	});
}

app.get('/stats', (req, res) => {
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

app.get('/stats/reset', (req, res) => {
	res.setHeader('Content-Type', 'application/json');
	let statsCol = db.get().collection("stats");
	statsCol.drop((err, result) => {
		if (err) {
			res.status(500).send(err);
			return;
		}
		res.status(200).send(result);
	});
});

app.listen(port, () => {
	logger.info(`Bot app listening on port ${port}!`);

	db.connect(config.dbUrl, config.dbName, (err) => {
		if (err) {
			logger.error(err);
			process.exit(1);
		} else {
			startConcoursStream();
		}
	});
});