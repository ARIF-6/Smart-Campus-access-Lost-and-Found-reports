const errorHandler = (err, req, res, next) => {
  console.error(err);

  const statusCode = err.status || 500;
  
  res.status(statusCode).json({
    success: false,
    message: err.message || "Server Error",
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = errorHandler;
