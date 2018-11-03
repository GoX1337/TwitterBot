let Twitter = require('twitter');
const logger = require('./logger').logger;
const payloadLogger = require('./logger').payloadLogger;

let twitter = new Twitter({
	consumer_key: process.env.consumer_key,
	consumer_secret: process.env.consumer_secret,
	access_token_key: process.env.access_token_key,
	access_token_secret: process.env.access_token_secret
});

let retweet = (tweet) => {
	twitter.post('statuses/retweet/' + tweet.id_str, (err, tweet, response) => {
		if(err) 
			logger.error("RT " + tweet.id_str + " failed cause:" + JSON.stringify(err) + " " + JSON.stringify(tweet));
		logger.info("RT " + tweet.id_str + " done.");
   });
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
