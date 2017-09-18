const twitter = require('./twitter.js')

const country = "FR";
const nbRandomRT = 1;

twitter.getTrends(country)
	.then(trendsWoeid => {
		console.log("getTrendsForWoeid");
		return twitter.getTrendsForWoeid(trendsWoeid);
	})
	.then(trendsFR => {
		console.log("giveawayEnter");
		twitter.giveawayEnter(nbRandomRT, trendsFR);
	});
