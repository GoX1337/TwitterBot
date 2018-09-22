let Twitter = require('twitter');
let env = require('dotenv').load();
let logger = require('./logger');

let twitter = new Twitter({
	consumer_key: process.env.consumer_key,
	consumer_secret: process.env.consumer_secret,
	access_token_key: process.env.access_token_key,
	access_token_secret: process.env.access_token_secret
});

twitter.get('search/tweets', { q: process.argv[2], count: process.argv[3], lang: "en" }, (error, tweets, response) => {
    if(error){
        logger.error("Failed search/tweet cause: " + JSON.stringify(error));
        process.exit(1);
    } else {
        tweets.statuses.forEach(tweet => {
            let msg = "https://twitter.com/" + tweet.user.screen_name + "/status/" + tweet.id_str;
            logger.info(msg);
        });
    }
});