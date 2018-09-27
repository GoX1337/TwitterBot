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

let queryString = process.argv[2];
let count = process.argv[3];
let maxId = -1;

let getRates = () => {
	twitter.get('application/rate_limit_status', (err, resp) => {
		if (err) 
            logger.error("application/rate_limit_status " + JSON.stringify(err));
        let rateSearch = resp.resources.search["/search/tweets"];
        var d = new Date(0);
        d.setUTCSeconds(rateSearch.reset);
        logger.info("application/rate_limit_status  " + JSON.stringify(rateSearch) + " " + d);

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
        lang: "en",
        until: "2018-09-20"
    };
    if(maxId != -1)
        params.max_id = maxId;
    
    twitter.get('search/tweets', params, (error, tweets, response) => {
        if(error){
            logger.error("Failed search/tweet cause: " + JSON.stringify(error));
        } 
        else {
            let tweetListLen = tweets.statuses.length;
            let i = 0;
            let nbTweetsInserted = 0;
            let nbTweetsIgnored = 0;

            logger.info(tweetListLen + " tweets found");
                       
            tweets.statuses.forEach(tweet => {
                payloadLogger.info(tweet.id_str + " " + JSON.stringify(tweet));
                let msg = "https://twitter.com/" + tweet.user.screen_name + "/status/" + tweet.id_str;
                if(maxId == -1 || maxId > tweet.id_str){
                    maxId = tweet.id_str;
                }
                let tweetCollection = db.get().collection("tweets");

                tweetCollection.findOne({"id_str": tweet.id_str}, (err, result) => {
                    if(err)
                        logger.error(err);
                    else if(!result){
                        tweetCollection.insertOne(tweet, (err, result) => {
                            if (!err) 
                                logger.info("Tweet " + tweet.id_str + " inserted in db " + msg);
                            nbTweetsInserted++;
                            if(++i == tweetListLen - 1){
                                logger.info(nbTweetsInserted + " tweets inserted; " + nbTweetsIgnored + " tweets ignored");
                                getRates();
                            }
                        });
                    } 
                    else {
                        logger.debug("Tweet " + tweet.id_str + " already in db " + msg);
                        nbTweetsIgnored++;
                        if(++i == tweetListLen - 1){
                            logger.info(nbTweetsInserted + " tweets inserted; " + nbTweetsIgnored + " tweets ignored");
                            getRates();
                        }  
                    }
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