const jwt = require('jsonwebtoken');
const db = require('../db/connection');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database to ensure they still exist and are active
    const userResult = await db.query(
      'SELECT id, email, first_name, last_name, role, status FROM users WHERE id = $1 AND status = $2',
      [decoded.userId, 'active']
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        code: 'TOKEN_INVALID'
      });
    }

    // Add user info to request object
    req.user = {
      id: userResult.rows[0].id,
      email: userResult.rows[0].email,
      firstName: userResult.rows[0].first_name,
      lastName: userResult.rows[0].last_name,
      role: userResult.rows[0].role,
      status: userResult.rows[0].status
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    } else {
      console.error('Auth middleware error:', error);
      return res.status(500).json({
        error: 'Authentication error',
        code: 'AUTH_ERROR'
      });
    }
  }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }

  next();
};

// Middleware to check if user owns the resource or is admin
const requireOwnership = (resourceUserIdField = 'user_id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Admin can access any resource
      if (req.user.role === 'admin') {
        return next();
      }

      // Get resource ID from params
      const resourceId = req.params.id;
      if (!resourceId) {
        return res.status(400).json({
          error: 'Resource ID required',
          code: 'RESOURCE_ID_REQUIRED'
        });
      }

      // This will be implemented in route handlers that need ownership checks
      req.requiresOwnershipCheck = {
        resourceId,
        userIdField: resourceUserIdField
      };

      next();
    } catch (error) {
      console.error('Ownership middleware error:', error);
      return res.status(500).json({
        error: 'Authorization error',
        code: 'AUTH_ERROR'
      });
    }
  };
};

// Optional authentication (for endpoints that work with or without auth)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userResult = await db.query(
      'SELECT id, email, first_name, last_name, role, status FROM users WHERE id = $1 AND status = $2',
      [decoded.userId, 'active']
    );

    if (userResult.rows.length > 0) {
      req.user = {
        id: userResult.rows[0].id,
        email: userResult.rows[0].email,
        firstName: userResult.rows[0].first_name,
        lastName: userResult.rows[0].last_name,
        role: userResult.rows[0].role,
        status: userResult.rows[0].status
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // If token is invalid, just proceed without user
    req.user = null;
    next();
  }
};

// Generate JWT token
const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Generate refresh token
const generateRefreshToken = (userId, email) => {
  return jwt.sign(
    { userId, email, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireOwnership,
  optionalAuth,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken
};