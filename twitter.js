var Twitter = require('twitter');
var env = require('dotenv').load();

var twitter = new Twitter({
	consumer_key: process.env.consumer_key,
	consumer_secret: process.env.consumer_secret,
	access_token_key: process.env.access_token_key,
	access_token_secret: process.env.access_token_secret
});

// Get all woeid of trend places for a given country code
function getTrends(country){
  return new Promise((resolve, reject) => {
  	twitter.get('trends/available', {}, function (err, data, response) {
  		if(err){
  			console.log("Problem GET trends/available:" + JSON.stringify(err));
  		} else {
			let trendsWoeid = [];
  			data.forEach(function(entry) {
				if(entry.countryCode && entry.countryCode.toUpperCase() == country.toUpperCase()){
					trendsWoeid.push(entry.woeid)
				}
  			});
			resolve(trendsWoeid);
  		}
  	});
  })
};

// Get all trends for given woeid place
function getTrendsForWoeid(trendsWoeid, resolve){
	return new Promise((resolve, reject) => {
		twitter.get('trends/place', {	id: trendsWoeid[0], exclude: false}, function (err, data, response) {
			if(err){
				log.error("Problem GET trends/place:" + JSON.stringify(err));
			} else {
				if(data && data.length > 0){
					let trendsFR = [];
					data.forEach(function(entry) {
						entry.trends.forEach(function(trd) {
							trendsFR.push(trd.name);
						});
					});
					trendsFR = Array.from(new Set(trendsFR));
					resolve(trendsFR);
				} else {
					console.log("No trends founds");
				}
			}
		});
	})
};

// RT random trendy tweets
function bullshitRetweeter(nbRandomTweets, trendsFR){
	return new Promise((resolve, reject) => {
		var params = { q: trendsFR[Math.floor(Math.random() * 5)],	count: nbRandomTweets };

		twitter.get('search/tweets', params, function(error, tweets, response) {
			if(error){
				console.log("Problem with bullshitRetweeter !");
				reject();
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
					console.log(trendsTweets.length + " tweets about " + query + " RT " + trendsTweets);
				})
			}
		});
	})
};

// RT the given tweet
function retweetThisFucktardShit(tweet){
	return new Promise((resolve, reject) => {
		twitter.post('statuses/retweet/' + tweet.id_str, function(err, tweet, response) {
			if(!err){
				reject();
			}
			resolve();
	   });
	 })
};

// Follow every users mentionned in given tweet
function followAllRetardsInTweet(tweet, callback){
	return new Promise((resolve, reject) => {
			var user_mentions = tweet.entities.user_mentions;
			var users = [];
			var promiseFollows = [];

			user_mentions.forEach(function(entry) {
				if(addUserInList(entry, users)){
					promiseFollows.push(followUser(entry.id));
					users.push(entry);
				}
			});

			Promise.all(promiseFollows).then((data) => {
				console.log("Success follow users :" + JSON.stringify(users));
			}, (err) => {
				console.log(`Error: ${err}`);
			})
	 })
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

// Follow the given user
var followUser = function(userId){
	return new Promise((resolve, reject) => {
		twitter.post('friendships/create', {user_id: userId, follow: true}, function (err, resp) {
			if (err) {
				console.log(followParam.user_id + " " + JSON.stringify(err));
				reject();
			}
			console.log('followUser ' + userId);
			resolve(userId);
		});
	})
};

// Start listen the giveways tweets stream : then RT and follow everyone to enter in giveaway
function giveawayEnter(nbRandomRT, trendsFR){
	twitter.stream('statuses/filter', { track: '#CONCOURS, CONCOURS' }, stream => {
			stream.on('data', function( tweet ) {
				Promise.all([
					retweetThisFucktardShit(tweet),
					followAllRetardsInTweet(tweet),
					bullshitRetweeter(nbRandomRT, trendsFR)
				]).then((data) => {
					console.log("Success");
					return;
				}, (err) => {
					console.log(`Error: ${err}`);
				})
			});

			stream.on('error', function ( error ) {
				console.log("Problem with stream !");
			});
		}
	);
};

var twitterModule = {
	getTrends: getTrends,
	getTrendsForWoeid: getTrendsForWoeid,
	giveawayEnter: giveawayEnter
};

module.exports = twitterModule;
