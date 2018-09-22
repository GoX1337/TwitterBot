const { createLogger, format, transports } = require('winston');
const { printf } = format;

const myFormat = printf(info => {
    return `${info.timestamp} ${info.level}: ${info.message}`;
});

const logger = createLogger({
    level: "info",
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss:SSS'
        }),
        myFormat,
    ),
    transports: [
        new transports.Console({
            format: format.combine(
                format.colorize(),
                myFormat
            ),
        }),
        new transports.File({ filename: 'error.log', level: 'error', maxsize: '10000000' })
    ]
});

const payloadLogger = createLogger({
    level: "info",
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss:SSS'
        }),
        myFormat,
    ),
    transports: [
        new transports.File({ filename: 'payload.log', level: 'info', maxsize: '10000000' })
    ]
});

module.exports = { 
    "logger": logger, 
    "payloadLogger": payloadLogger 
};