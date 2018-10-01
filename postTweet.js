const Twitter = require('twitter');
const logger = require('./logger').logger;
const payloadLogger = require('./logger').payloadLogger;
const db = require('./db');
const config = require('./config');

let twitter = new Twitter({
    consumer_key: process.env.consumer_key,
    consumer_secret: process.env.consumer_secret,
    access_token_key: process.env.access_token_key,
    access_token_secret: process.env.access_token_secret
});

let postTweet = (status) => {
    twitter.post('statuses/update', { status: status }, (error, tweet, response) => {
        if (error)
            logger.error(JSON.stringify(error));
        logger.info("Tweet " + status + " done.");
        process.exit(1);
    });
}

let printTweetUrl = (tweet) => {
	return "https://twitter.com/" + tweet.user.screen_name + "/status/" + tweet.id_str;
}

db.connect(config.dbUrl, config.dbName, (err) => {
    if (err) {
        logger.error(err);
        process.exit(1);
    } else {
        let tweetCollection = db.get().collection("tweets");

        tweetCollection.aggregate([
            { $sample: { size: 1 } }
        ]).toArray((err, docs) => {
            if(err) 
                logger.error(err);
            let tweet = docs[0];
            payloadLogger.info(JSON.stringify(tweet));
            let status = tweet.full_text;
            if(tweet.retweeted_status){
                status = tweet.retweeted_status.full_text;
                if(tweet.retweeted_status.entities && tweet.retweeted_status.entities.urls){
                    tweet.retweeted_status.entities.urls.forEach(urlElem => {
                        if(!status.includes(urlElem.url))
                            status += urlElem.url;
                    });
                }
            }
            logger.info(printTweetUrl(tweet) + " " + status);
            postTweet(status);
        });
    }
});
