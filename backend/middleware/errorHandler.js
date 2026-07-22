const { sendError } = require('../utils/responseHandler');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  if (process.env.NODE_ENV !== 'production') {
    console.error('ERROR 💥:', err);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found. Invalid: ${err.path}`;
    return sendError(res, message, err, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    return sendError(res, message, err, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    return sendError(res, message, err, 400);
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token. Please log in again.', err, 401);
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Your token has expired. Please log in again.', err, 401);
  }

  const statusCode = error.statusCode || error.status || err.statusCode || err.status || 500;
  const message = error.message || "Server Error";
  
  return sendError(res, message, err, statusCode);
};

module.exports = errorHandler;
