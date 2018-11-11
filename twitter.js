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
		if(err){
			logger.error("concoursTweets findOne : " + JSON.stringify(err));
			return;
		}
		if(!result){
			concoursTweets.insertOne(tweet, (err, result) => {
				if(err){
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
    logger.info("Concours tweet");
    logger.info("Concours tweet");
    logger.info("Random tweet");
    logger.info("Random tweet");
}

let startConcours = () => {
	logger.info("Start concours (interval:" + config.concoursInterval/1000 + "s)");
	config.concours = true;
    if(concoursTimer)
        clearInterval(concoursTimer);
    processTweet();
    concoursTimer = setInterval(processTweet, config.concoursInterval);
}

let stopConcours = () => {
	logger.info("Stop concours");
	config.concours = false;
    clearInterval(concoursTimer);
}

let startConcoursStream = () => {
	logger.info("Start concours twitter stream");
	config.stream = true;
	twitter.stream('statuses/filter', { track: '#CONCOURS, CONCOURS' }, stream => {
		tweetStream = stream;
		stream.on('data', processStreamTweet);
		stream.on('error', errorStreamTweet);
	});
}

let stopConcoursStream = () => {
	logger.info("Stop concours twitter stream");
	config.stream = false;
	if(tweetStream)
    	tweetStream.destroy();
}

TwitterModule = {
    startConcoursStream: startConcoursStream,
    stopConcoursStream: stopConcoursStream,
    startConcours: startConcours,
    stopConcours: stopConcours
};

module.exports = TwitterModule;