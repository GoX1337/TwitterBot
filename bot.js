
var Twitter = require('twitter');
var env = require('dotenv').load();
var log = require('./log.js');

var stats = {
	nbTweetsProcess: 0,
	nbTweetsIgnored: 0,
	nbGivewayEnterSuccess: 0,
	nbGivewayTentative: 0,
    nbRetweetsSuccess: 0,
    nbRetweetsTentative: 0,
    nbFollowsSuccess: 0,
    nbFollowsTentative: 0
};
  
var twitter = new Twitter({
	consumer_key: process.env.consumer_key,
	consumer_secret: process.env.consumer_secret,
	access_token_key: process.env.access_token_key,
	access_token_secret: process.env.access_token_secret
});

function retweetThisFucktardShit(tweet){
	stats.nbRetweetsTentative++;
	twitter.post('statuses/retweet/' + tweet.id_str, function(err, tweet, response) {
		if(!err){
			stats.nbRetweetsSuccess++;
			return null;
		}
		return err;
   });
};

function followAllRetardsInTweet(tweet){
	var user_mentions = tweet.entities.user_mentions;
	var users = [];
	var isOK = true;

	user_mentions.forEach(function(entry) {

		if(addUserInList(entry, users)){
			//console.log("addUserInList " + entry.id + " " + JSON.stringify(users));
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

	return res;
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
		stats.nbFollowsTentative++;
		if (err) {
			console.log(JSON.stringify(err));
			return err;
		} 
		stats.nbFollowsSuccess++;
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

function bullshitRetweeter(){
	//TODO
};

twitter.stream('statuses/filter', { track: '#CONCOURS, CONCOURS' },
    function(stream) {
 
        stream.on('data', function( tweet ) {
        	stats.nbTweetsProcess++;

        	// already RT or response tweet : we ignore it
        	if(tweet.retweeted || tweet.in_reply_to_status_id){
        		stats.nbTweetsIgnored++;
        		return;
        	}

        	stats.nbGivewayTentative++;

        	// RT the giveaway tweet
			var errorRT = retweetThisFucktardShit(tweet);
			//console.log("after retweetThisFucktardShit");

			// Follow all users mentionned in the giveaway tweet
			var resultFollow = followAllRetardsInTweet(tweet);
			//console.log("after followAllRetardsInTweet");

			// Log all information about the current tweet
			printTweet(tweet, errorRT, resultFollow);

			// Log all stats counters of the bot
			log.stats(stats);

			// RT, like or comment random tweets 
			bullshitRetweeter();

			if(!errorRT && resultFollow.isOK)
				stats.nbGivewayEnterSuccess++;
        });
 
        stream.on('error', function ( error ) {
            log.error("Problem with stream!");
        });
    }
);