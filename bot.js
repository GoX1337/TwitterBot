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
let maxTweets = 25;
let apiCall = false;

logger.info("Starting twitter bot...");

let retweet = (tweet) => {
	twitter.post('statuses/retweet/' + tweet.id_str, (err, tweet, response) => {
		if(err) 
			logger.error("RT " + tweet.id_str + " failed cause:" + JSON.stringify(err) + " " + JSON.stringify(tweet));
		logger.info("RT " + tweet.id_str + " done.");
   });
}

let getInstructions = (tweet) => {
	let txt = "";
	if(tweet.retweeted_status.extended_tweet)
		txt = tweet.retweeted_status.extended_tweet.full_text.toUpperCase();
	else 
		txt = tweet.retweeted_status.text.toUpperCase();

	let rt = txt.includes("RT");
	let follow = txt.includes("FOLLOW") || txt.includes("SUIVRE");
	let like = txt.includes("LIKE") || txt.includes("AIME");
	let inst = "";
	if(rt) inst += "RT";
	if(follow){
		if(inst.length > 0) inst += ", ";
		inst += "Follow";
	}
	if(like){
		if(inst.length > 0) inst += ", ";
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

let printTweetUrl = (tweet) => {
	return "https://twitter.com/" + tweet.user.screen_name + "/status/" + tweet.id_str;
}

let processTweet = (tweet) => {
	if(nbProcessedTweet == maxTweets) process.exit(1);
	payloadLogger.info(tweet.id_str + " " + JSON.stringify(tweet));
	let msg = printTweetUrl(tweet);

	let rtTweet = tweet.retweeted_status;
	if(!rtTweet){
		logger.warn(msg);
		return;
	}
	if(rtTweet){
		msg = printTweetUrl(rtTweet);
	}
	
	let instructions = getInstructions(tweet);
	if(instructions.like || (!instructions.rt && !instructions.follow)){
		logger.warn(msg);
		return;
	}

	if(apiCall && rtTweet && instructions.rt && !rtTweet.retweeted){
		retweet(tweet);
	}

	if(apiCall && instructions.follow && tweet.entities.user_mentions){
		tweet.entities.user_mentions.forEach(user => {
			followUser(tweet, user);
		});
	}

	logger.info(msg + " " + instructions.str);
	nbProcessedTweet++;
}

twitter.stream('statuses/filter', { track: '#CONCOURS, CONCOURS' }, stream => {
	stream.on('data', processTweet);
	stream.on('error', errorTweet);
});