const Twitter = require('twitter');
const env = require('dotenv').load();
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

let queryString = process.argv[2];
let count = process.argv[3];
let rates;
let maxId = -1;

let getRates = () => {
	twitter.get('application/rate_limit_status', (err, resp) => {
		if (err) 
            logger.error("application/rate_limit_status " + JSON.stringify(err));
        let rateSearch = resp.resources.search["/search/tweets"];
        var d = new Date(0);
        d.setUTCSeconds(rateSearch.reset);
        logger.info("application/rate_limit_status  " + JSON.stringify(rateSearch) + " " + d);
        rates = rateSearch;

        let t;
        if(rateSearch.remaining > 0){
            t = maxId != -1 ? 1000 * 3 : 0;
        } else {
            let now = new Date();
            t = (d.getTime() - now.getTime()) + 2000;
            logger.info("Rate limit reached : waiting " + t / 1000 + "s before next search iteration");
        }

        setTimeout(() => {
            searchTweet();
        }, t);
	});
}

let searchTweet = () => {
    let params = {
        q: queryString, 
        count: count, 
        lang: "en"
    };
    if(maxId != -1)
        params.max_id = maxId;

    logger.info(JSON.stringify(params));
    
    twitter.get('search/tweets', params, (error, tweets, response) => {
        if(error){
            logger.error("Failed search/tweet cause: " + JSON.stringify(error));
        } 
        else {
                       
            tweets.statuses.forEach(tweet => {
                payloadLogger.info(tweet.id_str + " " + JSON.stringify(tweet));
                let msg = "https://twitter.com/" + tweet.user.screen_name + "/status/" + tweet.id_str;
                logger.info(msg);
                if(maxId == -1 || maxId > tweet.id_str){
                    maxId = tweet.id_str;
                }
                db.get().collection("tweets").findOne({"tweet_id_str": tweet.id_str}, (err, result) => {
                    if(err)
                        logger.error(err);
                    else if(!result){
                        db.get().collection("tweets").insertOne({"tweet_id_str": tweet.id_str}, (err, result) => {
                            if (!err) {
                                logger.info("New tweet inserted in db");
                            }
                        });
                    }
                    getRates();
                });
            });
            logger.info(JSON.stringify(tweets.search_metadata));
        }
    });
}

db.connect(config.dbUrl, config.dbName, (err) => {
    if(err) {
        logger.error(err);
        process.exit(1);
    } else 
        getRates();
});