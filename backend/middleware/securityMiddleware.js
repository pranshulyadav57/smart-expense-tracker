// =========================
// SECURITY MIDDLEWARE SETUP
// =========================

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const logger = require('../utils/logger');

function applySecurity(app) {
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  const sanitizer = (req, res, next) => {
    try {
      const opts = { replaceWith: '_' };
      if (req.body && typeof req.body === 'object') {
        mongoSanitize.sanitize(req.body, opts);
      }
      if (req.params && typeof req.params === 'object') {
        mongoSanitize.sanitize(req.params, opts);
      }
      if (req.headers && typeof req.headers === 'object') {
        mongoSanitize.sanitize(req.headers, opts);
      }
      if (req.query && typeof req.query === 'object') {
        const sanitized = mongoSanitize.sanitize(JSON.parse(JSON.stringify(req.query)), opts);
        Object.keys(req.query).forEach(k => delete req.query[k]);
        Object.assign(req.query, sanitized);
      }
    } catch (err) {
      logger.warn('Sanitization skipped', { error: err.message });
    }
    next();
  };
  
  app.use(helmet());
  app.use(generalLimiter);
  app.use(sanitizer);
  
  // Return authLimiter for backward compatibility with the call in server.js
  return { authLimiter: applySecurity.authLimiter };
}

applySecurity.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs for auth actions
  message: 'Too many attempts from this IP, please try again after 15 minutes.',
  skipSuccessfulRequests: true,
});

module.exports = applySecurity;
