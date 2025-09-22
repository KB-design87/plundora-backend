const Joi = require('joi');

// Common validation schemas
const schemas = {
  // User validation
  userRegistration: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional()
  }),

  userLogin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  userUpdate: Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional()
  }),

  // Store validation
  storeCreation: Joi.object({
    storeName: Joi.string().min(2).max(255).required(),
    storeDescription: Joi.string().max(1000).optional(),
    storeUrlSlug: Joi.string().min(3).max(100).pattern(/^[a-z0-9-]+$/).required(),
    locationCity: Joi.string().max(100).optional(),
    locationState: Joi.string().max(100).optional(),
    locationCountry: Joi.string().max(100).optional(),
    contactEmail: Joi.string().email().optional(),
    contactPhone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional(),
    socialInstagram: Joi.string().uri().optional(),
    socialFacebook: Joi.string().uri().optional(),
    socialWebsite: Joi.string().uri().optional()
  }),

  // Sale validation
  saleCreation: Joi.object({
    title: Joi.string().min(3).max(255).required(),
    description: Joi.string().max(2000).optional(),
    price: Joi.number().positive().required(),
    originalPrice: Joi.number().positive().optional(),
    category: Joi.string().required(),
    subcategory: Joi.string().optional(),
    brand: Joi.string().max(100).optional(),
    condition: Joi.string().valid('new', 'like_new', 'good', 'fair', 'poor').required(),
    size: Joi.string().max(50).optional(),
    color: Joi.string().max(50).optional(),
    material: Joi.string().max(100).optional(),
    tags: Joi.string().optional(),
    locationCity: Joi.string().max(100).optional(),
    locationState: Joi.string().max(100).optional(),
    locationZip: Joi.string().max(20).optional(),
    shippingAvailable: Joi.boolean().optional(),
    localPickup: Joi.boolean().optional(),
    shippingCost: Joi.number().min(0).optional(),
    storeId: Joi.string().uuid().optional()
  }),

  // Payment validation
  paymentIntent: Joi.object({
    saleId: Joi.string().uuid().required(),
    shippingAddress: Joi.object({
      name: Joi.string().required(),
      line1: Joi.string().required(),
      line2: Joi.string().optional(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      postal_code: Joi.string().required(),
      country: Joi.string().required()
    }).required(),
    billingAddress: Joi.object({
      name: Joi.string().required(),
      line1: Joi.string().required(),
      line2: Joi.string().optional(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      postal_code: Joi.string().required(),
      country: Joi.string().required()
    }).optional()
  }),

  // Review validation
  reviewCreation: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    reviewText: Joi.string().max(1000).optional(),
    reviewType: Joi.string().valid('buyer', 'seller').optional()
  }),

  // Query parameters validation
  pagination: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional()
  }),

  salesQuery: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    category: Joi.string().optional(),
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional(),
    condition: Joi.string().valid('new', 'like_new', 'good', 'fair', 'poor').optional(),
    location: Joi.string().optional(),
    search: Joi.string().optional(),
    sortBy: Joi.string().valid('price_asc', 'price_desc', 'date_asc', 'date_desc', 'popular').optional(),
    storeId: Joi.string().uuid().optional()
  }),

  storesQuery: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    location: Joi.string().optional(),
    search: Joi.string().optional(),
    verified: Joi.boolean().optional(),
    sortBy: Joi.string().valid('name_asc', 'name_desc', 'rating_desc', 'sales_desc', 'date_desc').optional()
  })
};

// Validation middleware factory
const validateSchema = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation error',
        errors
      });
    }

    req.body = value;
    next();
  };
};

// Validate query parameters
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Query validation error',
        errors
      });
    }

    req.query = value;
    next();
  };
};

// Sanitize HTML content
const sanitizeHtml = (html) => {
  if (!html) return html;

  // Basic HTML sanitization - remove script tags and dangerous attributes
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '');
};

// Validate and sanitize user input
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.trim();
  }
  return input;
};

// Validate file upload
const validateImageFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
  }

  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`);
  }

  return true;
};

// Validate UUID
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Validate email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number
const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone);
};

// Validate URL slug
const isValidSlug = (slug) => {
  const slugRegex = /^[a-z0-9-]+$/;
  return slugRegex.test(slug);
};

module.exports = {
  schemas,
  validateSchema,
  validateQuery,
  sanitizeHtml,
  sanitizeInput,
  validateImageFile,
  isValidUUID,
  isValidEmail,
  isValidPhone,
  isValidSlug
};