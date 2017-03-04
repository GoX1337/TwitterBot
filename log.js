
var winston = require('winston');

var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({ timestamp:true }),
      new (winston.transports.File)({ filename: 'bot.log', timestamp:true, json:false })
    ]
});

var payloadLogger = new (winston.Logger)({
    transports: [
      new (winston.transports.File)({ filename: 'payload.log', timestamp:true })
    ]
});

var statsLogger = new (winston.Logger)({
    transports: [
      new (winston.transports.File)({ filename: 'stats.log', timestamp:true })
    ]
});

var log = {
    
    error : function(msg){
     	logger.log('error', msg);
    },
    
    info: function(msg){
      	logger.log('info', msg);
    },

    payloadSuccess: function(tweet){
    	payloadLogger.log('info', JSON.stringify(tweet));
    },

    payloadFail: function(tweet){
    	payloadLogger.log('error', JSON.stringify(tweet));
    },

    stats: function(stats){
    	statsLogger.log('info', JSON.stringify(stats));
    }
};

module.exports = log;