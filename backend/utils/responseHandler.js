/**
 * Standard API Response Handlers
 */

/**
 * Success Response
 * @param {Object} res - Express response object
 * @param {String} message - Success message
 * @param {Object|Array} data - Data to return
 * @param {Number} statusCode - HTTP status code (default 200)
 */
const sendSuccess = (res, message = 'Success', data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Error Response
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Object|String} error - Error details or stack
 * @param {Number} statusCode - HTTP status code (default 500)
 */
const sendError = (res, message = 'Internal Server Error', error = null, statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'production' ? null : error
  });
};

module.exports = {
  sendSuccess,
  sendError
};
