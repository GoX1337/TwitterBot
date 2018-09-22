let Twitter = require('twitter');
let env = require('dotenv').load();
let logger = require('./logger').logger;
let payloadLogger = require('./logger').payloadLogger;

let twitter = new Twitter({
	consumer_key: process.env.consumer_key,
	consumer_secret: process.env.consumer_secret,
	access_token_key: process.env.access_token_key,
	access_token_secret: process.env.access_token_secret
});

let nbProcessedTweet = 0;
let maxTweets = 3;
let apiCall = false;

logger.info("Starting twitter bot...");
logger.info("Concours tweets:");

let processTweet = (tweet) => {
	if(nbProcessedTweet == maxTweets) process.exit(1);
	payloadLogger.info(tweet.id_str + " " + JSON.stringify(tweet));
	let msg = "https://twitter.com/" + tweet.user.screen_name + "/status/" + tweet.id_str;
	let txt = "";

	if(tweet.retweeted_status && tweet.retweeted_status.extended_tweet && tweet.retweeted_status.extended_tweet.full_text)
		txt += tweet.retweeted_status.extended_tweet.full_text.toUpperCase();

	let rt = txt.includes("RT");
	let follow = txt.includes("FOLLOW") || txt.includes("SUIVRE");
	let rtTweet = tweet.retweeted_status;
	let quotedTweet = tweet.quoted_status;

	let instructions = getInstructions(rt, follow);
	let types = getTweetType(rtTweet, quotedTweet);

	if(!txt || !(rt && follow)){
		logger.warn(msg + " " + instructions + " " + types);
		return;
	}
	if(!tweet.id_str){
		logger.error("tweet.id_str is undefined");
		return;
	}

	if(apiCall && !tweet.retweeted_status.retweeted)
		retweet(tweet);

	if(apiCall && follow && tweet.entities.user_mentions){
		tweet.entities.user_mentions.forEach(user => {
			followUser(tweet, user);
		});
	}

	logger.info(msg + " " + instructions + " " + types);
	nbProcessedTweet++;
}

let retweet = (tweet) => {
	twitter.post('statuses/retweet/' + tweet.id_str, (err, tweet, response) => {
		if(err) 
			logger.error("RT " + tweet.id_str + " failed cause:" + JSON.stringify(err) + " " + JSON.stringify(tweet));
		logger.info("RT " + tweet.id_str + " done.");
   });
}

let getInstructions = (rt, follow) => {
	let inst = "";
	if(rt) inst += "RT";
	if(follow){
		if(inst.length > 0) inst += ", ";
		inst += "Follow";
	}
	return "[" + inst + "]";
}

let getTweetType = (rtTweet, quotedTweet) => {
	let types = "";
	if(rtTweet) types += "TwitRT";
	if(quotedTweet){
		if(types.length > 0) types += ", ";
		types += "TwitQuoted";
	}
	return "[" + types + "]";
}

let followUser = (tweet, user) => {
	twitter.post('friendships/create', {user_id: user.id_str, follow: true}, (err, resp) => {
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

twitter.stream('statuses/filter', { track: '#CONCOURS, CONCOURS' }, stream => {
	stream.on('data', processTweet);
	stream.on('error', errorTweet);
});