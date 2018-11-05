const Twitter = require('twitter');
const logger = require('./logger').logger;
const payloadLogger = require('./logger').payloadLogger;

let twitter = new Twitter({
    consumer_key: process.env.consumer_key,
    consumer_secret: process.env.consumer_secret,
    access_token_key: process.env.access_token_key,
    access_token_secret: process.env.access_token_secret
});

let showTweet = (id) => {
    twitter.get('statuses/show/' + id, { include_entities: true, tweet_mode: "extended" }, (error, tweet, response) => {
        if(error){
            logger.error(JSON.stringify(error));
            return;
        }
        payloadLogger.info(JSON.stringify(tweet));
        logger.info("https://twitter.com/" + tweet.user.screen_name + "/status/" + tweet.id_str);
    });
}