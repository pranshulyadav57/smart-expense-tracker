const winston = require('winston');
const path = require('path');

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info';
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

const formatMessage = winston.format((info) => {
  if (typeof info.message === 'object') {
    info.message = JSON.stringify(info.message, null, 2);
  }

  if (info instanceof Error) {
    info.message = info.message;
  }

  return info;
})();

const consoleFormat = winston.format.combine(
  formatMessage,
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    let output = `${info.timestamp} ${info.level}: ${info.message}`;

    if (info.stack) {
      output += `\n${info.stack}`;
    }

    if (info.metadata && Object.keys(info.metadata).length > 0) {
      output += `\n${JSON.stringify(info.metadata, null, 2)}`;
    }

    return output;
  })
);

const fileFormat = winston.format.combine(
  formatMessage,
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  winston.format.timestamp(),
  winston.format.json()
);

const transports = [
  new winston.transports.Console({ format: consoleFormat }),
];

if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '..', 'logs', 'error.log'),
      level: 'error',
      format: fileFormat,
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '..', 'logs', 'all.log'),
      format: fileFormat,
    })
  );
}

const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
});

module.exports = logger;