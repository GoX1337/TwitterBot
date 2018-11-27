const Twitter = require('twitter');
const logger = require('./utils/logger').logger;
const payloadLogger = require('./utils/logger').payloadLogger;
const db = require('./utils/db');
const config = require('./config');

const twitter = new Twitter({
	consumer_key: process.env.consumer_key,
	consumer_secret: process.env.consumer_secret,
	access_token_key: process.env.access_token_key,
	access_token_secret: process.env.access_token_secret
});

let tweetStream;
let concoursTimer;
let concoursTimeoutTab = [];
let apiCall = true;

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
	if(!tweet.retweeted_status)
		return;
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

let enterConcours = () => {
	let concoursTweets = db.get().collection("concoursTweets");
	concoursTweets.findOne({ concoursEnter: null, concoursFailed: null }, (err, tweet) => {
		if (err) {
			logger.error("concoursTweets findOne : " + JSON.stringify(err));
			return;
		}
		if(!tweet){
			logger.error("concoursTweets no mode concours tweet available in db");
			return;
		}
		let idDb = tweet._id;
		payloadLogger.info(tweet.id_str + " " + JSON.stringify(tweet));
		let msg = printTweetUrl(tweet);

		let rtTweet = tweet.retweeted_status;
		if (!rtTweet) {
			logger.warn(msg);
			concoursTweets.updateOne({ _id: idDb }, { $set: { concoursFailed: true } }, (err, result) => {
				if (err) {
					logger.error("concoursTweets updateOne");
				} else {
					enterConcours();
					return;
				}
			});
			return;
		} 
		else {
			msg = printTweetUrl(rtTweet);
		}

		let instructions = getInstructions(tweet);
		if (!instructions || (!instructions.rt && !instructions.follow)) {
			logger.warn(msg);
			concoursTweets.updateOne({ _id: idDb }, { $set: { concoursFailed: true } }, (err, result) => {
				if (err) {
					logger.error("concoursTweets updateOne");
				} else {
					enterConcours();
					return;
				}
			});
			return;
		}

		if (apiCall && rtTweet && instructions.rt && !rtTweet.retweeted) {
			retweet(rtTweet, (err) => {
				if (err) {
					concoursTweets.updateOne({ _id: idDb }, { $set: { concoursFailed: true } }, (err, result) => {
						if (err) {
							logger.error("concoursTweets updateOne");
						} else {
							enterConcours();
							return;
						}
					});
					return;
				}
				concoursTweets.updateOne({ _id: idDb }, { $set: { concoursEnter: true } }, (err, result) => {
					if (err)
						logger.error("concoursTweets updateOne");
					else
						updateBotStats("concoursRT");
				});
				if (apiCall && instructions.follow && tweet.entities.user_mentions) {
					tweet.entities.user_mentions.forEach(user => {
						followUser(tweet, user);
					});
				}
				logger.info(msg + " " + instructions.str);
			});
		} 
		else {
			logger.warn("!rt " + msg);
			concoursTweets.updateOne({ _id: idDb }, { $set: { concoursFailed: true } }, (err, result) => {
				if (err) {
					logger.error("concoursTweets updateOne");
				} else {
					enterConcours();
					return;
				}
			});
		} 
	});
}

let updateBotStats = (rtType) => {
	let statsCol = db.get().collection("stats");
	statsCol.findOne({ id: rtType }, (err, result) => {
		if (err) {
			logger.error(rtType + " stats update findOne : " + JSON.stringify(err));
		}
		else if (!result) {
			let botStats = { id: rtType, value: 1, date: new Date() };
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

let postTweet = (status, callback) => {
	twitter.post('statuses/update', { status: status }, (error, tweet, response) => {
		if (error)
			logger.error("Random RT: " + JSON.stringify(error));
		logger.info("Random RT: Tweet done.");
		callback();
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
		postTweet(status, () => {
			updateBotStats("randomRT");
		});
	});
}

let followUser = (tweet, user) => {
	twitter.post('friendships/create', { user_id: user.id_str, follow: true }, (err, resp) => {
		if (err)
			logger.error("Follow " + user.id_str + " failed cause:" + JSON.stringify(err));
		logger.info("Follow " + user.id_str + " done (" + tweet.id_str + ")");
	});
}

let errorStreamTweet = (error) => {
	logger.error("Problem with stream ! " + JSON.stringify(error));
	process.exit(1);
}

let processStreamTweet = (tweet) => {
	let concoursTweets = db.get().collection("concoursTweets");
	concoursTweets.findOne({ id_str: tweet.id_str }, (err, result) => {
		if (err) {
			logger.error("concoursTweets findOne : " + JSON.stringify(err));
			return;
		}
		if (!result) {
			concoursTweets.insertOne(tweet, (err, result) => {
				if (err) {
					logger.error("concoursTweets insertOne : " + JSON.stringify(err));
					return;
				}
				logger.info(printTweetUrl(tweet) + " inserted in db.");
			});
		}
		else {
			logger.warn(printTweetUrl(tweet) + " already present in db.");
		}
	});
}

let printTweetUrl = (tweet) => {
	return "https://twitter.com/" + tweet.user.screen_name + "/status/" + tweet.id_str;
}

let processTweet = () => {
	let nbConcoursTweets = config.nbConcoursTweetsPerInterval;
	let nbRandomTweets = config.nbRandomTweetsPerInterval;
	let interval = (config.concoursInterval * 60 * 1000) / (nbConcoursTweets + nbRandomTweets);
	let offset = 0;

	for (let i = 0; i < nbConcoursTweets; i++) {
		let to = setTimeout(() => {
			logger.info("Concours tweet");
			enterConcours();
		}, offset);
		concoursTimeoutTab.push(to);
		offset += interval;
	}

	for (let i = 0; i < nbRandomTweets; i++) {
		let to = setTimeout(() => {
			logger.info("Random tweet");
			postRandomTweet();
		}, offset);
		concoursTimeoutTab.push(to);
		offset += interval;
	}
}

let startConcours = () => {
	logger.info("Start concours (interval: " + config.concoursInterval + " min, pause " + config.pause + " min)");
	config.concours = true;
	if (concoursTimer)
		clearInterval(concoursTimer);
	processTweet();
	concoursTimer = setInterval(processTweet, (config.concoursInterval * 60 * 1000) + (config.pause * 60 * 1000));
}

let stopConcours = () => {
	logger.info("Stop concours");
	config.concours = false;
	clearInterval(concoursTimer);
	concoursTimeoutTab.forEach((to) => {
		clearTimeout(to);
	});
	concoursTimeoutTab = [];
	concoursTimer = null;
}

let startConcoursStream = () => {
	logger.info("Start concours twitter stream");
	if (!config.stream) {
		config.stream = true;
		twitter.stream('statuses/filter', { track: '#CONCOURS, CONCOURS' }, stream => {
			tweetStream = stream;
			stream.on('data', processStreamTweet);
			stream.on('error', errorStreamTweet);
		});
	}
}

let stopConcoursStream = () => {
	logger.info("Stop concours twitter stream");
	config.stream = false;
	if (tweetStream)
		tweetStream.destroy();
}

TwitterModule = {
	startConcoursStream: startConcoursStream,
	stopConcoursStream: stopConcoursStream,
	startConcours: startConcours,
	stopConcours: stopConcours
};

module.exports = TwitterModule;