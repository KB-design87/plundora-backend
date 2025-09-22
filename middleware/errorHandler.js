// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = { message, statusCode: 400 };
  }

  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        error = {
          message: 'Duplicate entry. This record already exists.',
          statusCode: 409
        };
        break;
      case '23503': // Foreign key violation
        error = {
          message: 'Related record not found.',
          statusCode: 400
        };
        break;
      case '23502': // Not null violation
        error = {
          message: 'Required field is missing.',
          statusCode: 400
        };
        break;
      case '22001': // String data too long
        error = {
          message: 'Input data too long.',
          statusCode: 400
        };
        break;
      case 'ECONNREFUSED':
        error = {
          message: 'Database connection failed.',
          statusCode: 500
        };
        break;
      default:
        error = {
          message: 'Database error occurred.',
          statusCode: 500
        };
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Invalid token.',
      statusCode: 401
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      message: 'Token expired.',
      statusCode: 401
    };
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      message: 'File too large.',
      statusCode: 400
    };
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    error = {
      message: 'Too many files.',
      statusCode: 400
    };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = {
      message: 'Unexpected file field.',
      statusCode: 400
    };
  }

  // Stripe errors
  if (err.type && err.type.startsWith('Stripe')) {
    error = {
      message: 'Payment processing error.',
      statusCode: 400
    };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;