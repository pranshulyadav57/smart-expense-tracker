const logger = require('../utils/logger');

// Notification adapter that supports multiple providers.
// By default it logs to console. Providers can be added later (Twilio, email, etc.).

const providers = {
  console: async ({ to, message, meta }) => {
    logger.info('Notification (console)', { to, message, meta });
    return { success: true, provider: 'console' };
  }
  ,twilio: async ({ to, message }) => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;
    if (!sid || !token || !from) {
      const err = new Error('Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM)');
      logger.error('Twilio provider misconfigured', { err: err.message });
      throw err;
    }

    let client;
    try {
      const twilio = require('twilio');
      client = twilio(sid, token);
    } catch (e) {
      logger.error('Twilio module not available', { err: e.message });
      throw e;
    }

    try {
      const resp = await client.messages.create({ to, from, body: message });
      logger.info('Notification (twilio) sent', { to, sid: resp.sid });
      return { success: true, provider: 'twilio', sid: resp.sid };
    } catch (err) {
      logger.error('Twilio send failed', { err: err.message });
      throw err;
    }
  }
};

const getProvider = (name) => providers[name] || providers.console;

async function sendNotification({ to, message, provider = process.env.NOTIFICATION_PROVIDER }) {
  const p = getProvider(provider);
  try {
    const res = await p({ to, message });
    // Persist alert for user if 'to' looks like a user id (number)
    try {
      const alertsService = require('./alertsService');
      const userId = Number.isFinite(Number(to)) ? Number(to) : null;
      if (userId) {
        await alertsService.logAlert(userId, 'notification', message, { provider: provider || 'console' });
      }
    } catch (err) {
      logger.warn('Failed to persist alert after sendNotification', { err: err?.message || err });
    }
    return res;
  } catch (err) {
    logger.error('Notification send failed', { err: err.message });
    return { success: false, error: err.message };
  }
}

module.exports = { sendNotification };
