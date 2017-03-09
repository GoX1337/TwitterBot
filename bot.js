
var Twitter = require('twitter');
var env = require('dotenv').load();
var async = require('async');
var log = require('./log.js');

var twitter = new Twitter({
	consumer_key: process.env.consumer_key,
	consumer_secret: process.env.consumer_secret,
	access_token_key: process.env.access_token_key,
	access_token_secret: process.env.access_token_secret
});

var maxQuerySize = 500;

var trendsFR = [];

function retweetThisFucktardShit(tweet){
	twitter.post('statuses/retweet/' + tweet.id_str, function(err, tweet, response) {
		if(!err){
			return null;
		}
		return err;
   });
};

function followAllRetardsInTweet(tweet, callback){
	var user_mentions = tweet.entities.user_mentions;
	var users = [];
	var isOK = true;

	user_mentions.forEach(function(entry) {

		if(addUserInList(entry, users)){
			var err = followUser(entry.id);
			entry['isFollowedOK'] = !err;
			users.push(entry);

			if(err)
				isOK = false;
		} else {
			console.log(entry.id + " Already in list");
		}
	});

	var res = {
		'isOK': isOK,
		'users': users
	};
	console.log('res follow');
	callback(null);
};

function addUserInList(user,  userList){
	if(userList && userList.length > 0){
		userList.forEach(function(entry) {
			if(entry.id == user.id){
				return false;
			}
		});
	}
	return true;
};

function followUser(userId){

	// request object to follow
	var followParam = {
		user_id: userId,
		follow: true
	}

	twitter.post('friendships/create', followParam, function (err, resp) {
		if (err) {
			console.log(followParam.user_id + " " + JSON.stringify(err));
			return err;
		} 
		console.log('followUser ' + userId);
		return null;
	});
};

function printTweet(tweet, errorRT, resultFollow){
	var msg = "Id:" + tweet.id_str + ", RT:" + (errorRT ? "Fail" : "Success") + ", Follow:" + printFollowStatus(resultFollow) + ", Date:" + tweet.created_at + ", Text:" + tweet.text + "\n";
	
	if(!errorRT && resultFollow.isOK){
		log.payloadSuccess(tweet);
		log.info(msg);
	} else {
		log.payloadFail(tweet);
		log.error(msg);
	}
};

function printFollowStatus(resultFollow){
	var followStatus = (resultFollow.isOK ? "Success" : "Fail") + "[";

	resultFollow.users.forEach(function(entry) {
		followStatus += entry.name + ":" + entry.id + ":" + entry.isFollowedOK + ", ";
	});
	return followStatus + "]";
};

function bullshitRetweeter(nbRandomTweets){
	var query = trendsFR[Math.floor(Math.random() * 5)];
	var params = {
		q: query,
		count: nbRandomTweets
	};

	twitter.get('search/tweets', params, function(error, tweets, response) {
		if(error){
			log.error("Problem with bullshitRetweeter !");
		} else {
			var trendsTweets = [];
			async.forEachOf(tweets.statuses, function (value, key, callback) {
				if(!value.retweeted){
					retweetThisFucktardShit(value);
					trendsTweets.push(value.id);
				}
				callback();
			}, function (err) {
			  if (err) 
			  	console.error(err.message);
			  log.info(trendsTweets.length + " tweets about " + query + " RT " + trendsTweets);
			})
		}
	});
};

function getTrendsForWoeid(woeid, callback){
	var param = {
		id: woeid, 
		exclude: false
	};

	twitter.get('trends/place', param, function (err, data, response) {
		if(err){
			log.error("Problem GET frends/place:" + JSON.stringify(err));
		} else {
			if(data && data.length > 0){
				data.forEach(function(entry) {
					entry.trends.forEach(function(trd) {
						trendsFR.push(trd.name);
					});
				});
				trendsFR = Array.from(new Set(trendsFR));
				callback(null);
			} else {
				log.info("No trends founds");
			}
		}
	});
};

function getTrends(country, callback){
	twitter.get('trends/available', {}, function (err, data, response) {
		if(err){
			log.error("Problem GET frends/available:" + JSON.stringify(err));
		} else {
			data.forEach(function(entry) {
				if(entry.name.toUpperCase() == country.toUpperCase()){
					getTrendsForWoeid(entry.woeid, callback);
				}
			});
		}
	});
};

function startTrackGivewayTweets(){
	twitter.stream('statuses/filter', { track: '#CONCOURS, CONCOURS' },
	    function(stream) {
	 
	        stream.on('data', function( tweet ) {

	        	// already RT or response tweet : we ignore it
	        	if(tweet.retweeted || tweet.in_reply_to_status_id){
	        		stats.nbTweetsIgnored++;
	        		return;
	        	}

	        	async.series([
				    function(callback){
				       // RT the giveaway tweet
				       console.log("RT");
					   var errorRT = retweetThisFucktardShit(tweet);
					   callback(errorRT, 'rt');
				    },
				    function(callback){
				       // Follow all users mentionned in the giveaway tweet
				       console.log("Follows");
					   followAllRetardsInTweet(tweet, callback);
					   callback(errorRT, 'follow');
					   console.log("after follows");
				    },
				    function(callback){
				    	console.log("printTweet");
				       // Log all information about the current tweet
						printTweet(tweet, errorRT, resultFollow);
				    },
				    function(callback){
				    	console.log("log.stats");
						// Log all stats counters of the bot
						log.stats(stats);
				    }
				],
				// optional callback
				function(err, results){
				    // results is now equal to ['one', 'two']
				    console.log("result");
				});
	        });
	 
	        stream.on('error', function ( error ) {
	            log.error("Problem with stream! ");
	        });
	    }
	);
};

async.series([
    function(callback){
        console.log("getTrends");
        getTrends('FRANCE', callback);
    },
    function(callback){
        bullshitRetweeter(7);
        callback(null);
    }
],
// optional callback
function(err, results){
    // results is now equal to ['one', 'two']
    //console.log("result");
});
