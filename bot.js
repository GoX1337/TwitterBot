
var Twitter = require('twitter');
var env = require('dotenv').load();

var nbGivewayEnterSuccess = 0;
var nbGivewayTentative = 0;
var nbRetweets = 0;
var nbFollows = 0;
  
var twitter = new Twitter({
	consumer_key: process.env.consumer_key,
	consumer_secret: process.env.consumer_secret,
	access_token_key: process.env.access_token_key,
	access_token_secret: process.env.access_token_secret
});

function retweetThisFucktardShit(tweet){

	twitter.post('statuses/retweet/' + tweet.id_str, function(error, tweet, response) {
		if(error) 
			console.log("Error retweeting: %j", error);
		else {
			console.log("Succes retweeting");
		}
		console.log("-----------------");
   });
};

function printTweet(tweet){
	console.log(tweet.id_str + " " + tweet.text);
};

function followAllRetardsInTweet(tweet){
	var user_mentions = tweet.entities.user_mentions;
	var users = [];

	user_mentions.forEach(function(entry) {
		users.push(entry.id);
		followUser(entry.id);
	});
	users = Array.from(new Set(users));
	console.log("Users id to follow : " + users);
}

function followUser(user){

	var followParam = {
		user_id: user,
		follow: true
	}

	twitter.post('friendships/create', followParam, function (err, resp) {
		if (err) {
			console.log('friendship gave error: ' + JSON.stringify(err));
			return false;
		}
		console.log('friended');
		return true;
	});
}

twitter.stream('statuses/filter', { track: '#CONCOURS, CONCOURS' },
    function(stream) {
 
        stream.on('data', function( tweet ) {
			printTweet(tweet);
			retweetThisFucktardShit(tweet);
			followAllRetardsInTweet(tweet);
        });
 
        stream.on('error', function ( error ) {
            console.error(error);
        });
    });