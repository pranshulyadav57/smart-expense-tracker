const aiService = require("../services/aiService");
const { standardizeResponse } = require("../utils/responseHandler");
const logger = require("../utils/logger");

// =========================
// STUDENT AI INSIGHTS
// =========================
const getStudentInsights = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const insights = await aiService.getStudentInsights(user_id);
    
    return res.status(200).json(standardizeResponse(true, insights, "AI student insights retrieved successfully"));
  } catch (err) {
    // Log full error for diagnostics
    logger.error('Get student AI insights failed', { userId: req.user?.id, error: err.message, stack: err.stack });

    // Defensive fallback: do not break the dashboard when AI fails. Return empty insights and a helpful message.
    try {
      return res.status(200).json(standardizeResponse(true, [], 'AI insights currently unavailable'));
    } catch (sendErr) {
      // If even sending response fails, pass to centralized error handler
      return next(sendErr);
    }
  }
};
// =========================
// BUSINESS AI INSIGHTS
// =========================
const getBusinessInsights = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const insights = await aiService.getBusinessInsights(user_id);
    
    return res.status(200).json(standardizeResponse(true, insights, "AI business insights retrieved successfully"));
  } catch (err) {
    logger.error('Get business AI insights failed', { userId: req.user?.id, error: err.message, stack: err.stack });

    // Defensive fallback: return empty array so UI can continue to render
    try {
      return res.status(200).json(standardizeResponse(true, [], 'AI insights currently unavailable'));
    } catch (sendErr) {
      return next(sendErr);
    }
  }
};

module.exports = {
  getStudentInsights,
  getBusinessInsights,
};
