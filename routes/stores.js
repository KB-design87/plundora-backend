const express = require('express');
const { body, query, validationResult } = require('express-validator');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const db = require('../db/connection');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Multer configuration for store images
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    files: 1 // Only one store image
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,webp').split(',');
    const fileExtension = file.originalname.split('.').pop().toLowerCase();

    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'), false);
    }
  }
});

// Validation middleware
const validateStore = [
  body('storeName').trim().isLength({ min: 2, max: 255 }).withMessage('Store name must be between 2 and 255 characters'),
  body('storeDescription').optional().trim().isLength({ max: 1000 }).withMessage('Store description must be less than 1000 characters'),
  body('storeUrlSlug').trim().isLength({ min: 3, max: 100 }).matches(/^[a-z0-9-]+$/).withMessage('Store URL slug must be 3-100 characters and contain only lowercase letters, numbers, and hyphens'),
  body('locationCity').optional().trim().isLength({ max: 100 }),
  body('locationState').optional().trim().isLength({ max: 100 }),
  body('locationCountry').optional().trim().isLength({ max: 100 }),
  body('contactEmail').optional().isEmail().normalizeEmail(),
  body('contactPhone').optional().isMobilePhone(),
  body('socialInstagram').optional().trim().isURL(),
  body('socialFacebook').optional().trim().isURL(),
  body('socialWebsite').optional().trim().isURL()
];

const validateStoreQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('location').optional().trim(),
  query('search').optional().trim(),
  query('verified').optional().isBoolean(),
  query('sortBy').optional().isIn(['name_asc', 'name_desc', 'rating_desc', 'sales_desc', 'date_desc'])
];

// Helper function to generate unique URL slug
const generateUniqueSlug = async (baseSlug, excludeStoreId = null) => {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = excludeStoreId
      ? 'SELECT id FROM stores WHERE store_url_slug = $1 AND id != $2'
      : 'SELECT id FROM stores WHERE store_url_slug = $1';

    const params = excludeStoreId ? [slug, excludeStoreId] : [slug];
    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
};

// Helper function to process and save store image
const processAndSaveStoreImage = async (file, storeId) => {
  const imageId = uuidv4();
  const fileExtension = 'webp';
  const filename = `store_${storeId}_${imageId}.${fileExtension}`;
  const imagePath = path.join(process.env.UPLOAD_PATH || './uploads', filename);

  try {
    await sharp(file.buffer)
      .resize(800, 600, { fit: 'cover' })
      .webp({ quality: 85 })
      .toFile(imagePath);

    return `/uploads/${filename}`;
  } catch (error) {
    console.error('Error processing store image:', error);
    throw new Error('Failed to process store image');
  }
};

// GET /api/stores - Get all stores with filtering and pagination
router.get('/', validateStoreQuery, optionalAuth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 20,
      location,
      search,
      verified,
      sortBy = 'date_desc'
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = ['s.status = $1'];
    let queryParams = ['active'];
    let paramCount = 1;

    // Build WHERE conditions
    if (location) {
      paramCount++;
      whereConditions.push(`(s.location_city ILIKE $${paramCount} OR s.location_state ILIKE $${paramCount} OR s.location_country ILIKE $${paramCount})`);
      queryParams.push(`%${location}%`);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(s.store_name ILIKE $${paramCount} OR s.store_description ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    if (verified !== undefined) {
      paramCount++;
      whereConditions.push(`s.is_verified = $${paramCount}`);
      queryParams.push(verified === 'true');
    }

    // Build ORDER BY clause
    let orderBy = 's.created_at DESC';
    switch (sortBy) {
      case 'name_asc':
        orderBy = 's.store_name ASC';
        break;
      case 'name_desc':
        orderBy = 's.store_name DESC';
        break;
      case 'rating_desc':
        orderBy = 's.rating DESC, s.total_reviews DESC';
        break;
      case 'sales_desc':
        orderBy = 's.total_sales DESC';
        break;
    }

    const query = `
      SELECT
        s.*,
        u.first_name as owner_first_name,
        u.last_name as owner_last_name,
        COUNT(DISTINCT sales.id) FILTER (WHERE sales.status = 'active') as active_listings
      FROM stores s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN sales ON s.id = sales.store_id
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY s.id, u.first_name, u.last_name
      ORDER BY ${orderBy}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);

    const result = await db.query(query, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT s.id) as total
      FROM stores s
      JOIN users u ON s.user_id = u.id
      WHERE ${whereConditions.join(' AND ')}
    `;

    const countResult = await db.query(countQuery, queryParams.slice(0, paramCount));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching stores:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stores'
    });
  }
});

// GET /api/stores/:slug - Get store by URL slug
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;

    const query = `
      SELECT
        s.*,
        u.first_name as owner_first_name,
        u.last_name as owner_last_name,
        u.email as owner_email,
        COUNT(DISTINCT sales.id) FILTER (WHERE sales.status = 'active') as active_listings,
        COUNT(DISTINCT sales.id) FILTER (WHERE sales.status = 'sold') as sold_listings
      FROM stores s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN sales ON s.id = sales.store_id
      WHERE s.store_url_slug = $1 AND s.status = 'active'
      GROUP BY s.id, u.first_name, u.last_name, u.email
    `;

    const result = await db.query(query, [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }

    const store = result.rows[0];

    // Get recent reviews
    const reviewsQuery = `
      SELECT
        r.rating,
        r.review_text,
        r.created_at,
        u.first_name as reviewer_first_name,
        u.last_name as reviewer_last_name,
        s.title as sale_title
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      JOIN sales s ON r.sale_id = s.id
      WHERE r.store_id = $1 AND r.is_public = true
      ORDER BY r.created_at DESC
      LIMIT 10
    `;

    const reviewsResult = await db.query(reviewsQuery, [store.id]);

    res.json({
      success: true,
      data: {
        ...store,
        recent_reviews: reviewsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching store:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch store'
    });
  }
});

// POST /api/stores - Create new store
router.post('/', authenticateToken, upload.single('storeImage'), validateStore, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      storeName,
      storeDescription,
      storeUrlSlug,
      locationCity,
      locationState,
      locationCountry,
      contactEmail,
      contactPhone,
      socialInstagram,
      socialFacebook,
      socialWebsite
    } = req.body;

    // Check if user already has a store
    const existingStore = await db.query(
      'SELECT id FROM stores WHERE user_id = $1',
      [req.user.id]
    );

    if (existingStore.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'You already have a store. Users can only have one store.'
      });
    }

    // Generate unique URL slug
    const uniqueSlug = await generateUniqueSlug(storeUrlSlug);

    // Create store record
    const storeResult = await db.query(
      `INSERT INTO stores (
        user_id, store_name, store_description, store_url_slug, location_city,
        location_state, location_country, contact_email, contact_phone,
        social_instagram, social_facebook, social_website
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        req.user.id,
        storeName,
        storeDescription || null,
        uniqueSlug,
        locationCity || null,
        locationState || null,
        locationCountry || null,
        contactEmail || null,
        contactPhone || null,
        socialInstagram || null,
        socialFacebook || null,
        socialWebsite || null
      ]
    );

    const store = storeResult.rows[0];

    // Process and save store image if provided
    if (req.file) {
      try {
        const imageUrl = await processAndSaveStoreImage(req.file, store.id);
        await db.query(
          'UPDATE stores SET store_image_url = $1 WHERE id = $2',
          [imageUrl, store.id]
        );
        store.store_image_url = imageUrl;
      } catch (imageError) {
        console.error('Error processing store image:', imageError);
        // Don't fail the store creation if image processing fails
      }
    }

    res.status(201).json({
      success: true,
      data: store
    });
  } catch (error) {
    console.error('Error creating store:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create store'
    });
  }
});

// PUT /api/stores/:id - Update store
router.put('/:id', authenticateToken, upload.single('storeImage'), validateStore, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;

    // Check ownership
    const ownershipResult = await db.query(
      'SELECT user_id FROM stores WHERE id = $1',
      [id]
    );

    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }

    if (req.user.role !== 'admin' && ownershipResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only update your own store'
      });
    }

    const {
      storeName,
      storeDescription,
      storeUrlSlug,
      locationCity,
      locationState,
      locationCountry,
      contactEmail,
      contactPhone,
      socialInstagram,
      socialFacebook,
      socialWebsite
    } = req.body;

    // Generate unique URL slug if changed
    const uniqueSlug = await generateUniqueSlug(storeUrlSlug, id);

    // Update store record
    const updateResult = await db.query(
      `UPDATE stores SET
        store_name = $1,
        store_description = $2,
        store_url_slug = $3,
        location_city = $4,
        location_state = $5,
        location_country = $6,
        contact_email = $7,
        contact_phone = $8,
        social_instagram = $9,
        social_facebook = $10,
        social_website = $11,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *`,
      [
        storeName,
        storeDescription,
        uniqueSlug,
        locationCity,
        locationState,
        locationCountry,
        contactEmail,
        contactPhone,
        socialInstagram,
        socialFacebook,
        socialWebsite,
        id
      ]
    );

    const store = updateResult.rows[0];

    // Process and save new store image if provided
    if (req.file) {
      try {
        const imageUrl = await processAndSaveStoreImage(req.file, store.id);
        await db.query(
          'UPDATE stores SET store_image_url = $1 WHERE id = $2',
          [imageUrl, store.id]
        );
        store.store_image_url = imageUrl;
      } catch (imageError) {
        console.error('Error processing store image:', imageError);
        // Don't fail the update if image processing fails
      }
    }

    res.json({
      success: true,
      data: store
    });
  } catch (error) {
    console.error('Error updating store:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update store'
    });
  }
});

// DELETE /api/stores/:id - Delete store
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const ownershipResult = await db.query(
      'SELECT user_id FROM stores WHERE id = $1',
      [id]
    );

    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }

    if (req.user.role !== 'admin' && ownershipResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own store'
      });
    }

    // Check if store has active sales
    const activeSalesResult = await db.query(
      'SELECT COUNT(*) as count FROM sales WHERE store_id = $1 AND status = $2',
      [id, 'active']
    );

    if (parseInt(activeSalesResult.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete store with active sales. Please remove or end all active sales first.'
      });
    }

    // Soft delete the store
    await db.query(
      'UPDATE stores SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['suspended', id]
    );

    res.json({
      success: true,
      message: 'Store deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting store:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete store'
    });
  }
});

// GET /api/stores/:id/sales - Get store's sales
router.get('/:id/sales', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, status = 'active' } = req.query;
    const offset = (page - 1) * limit;

    // Verify store exists
    const storeResult = await db.query('SELECT id FROM stores WHERE id = $1', [id]);
    if (storeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }

    const query = `
      SELECT
        s.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', i.id,
              'image_url', i.image_url,
              'thumbnail_url', i.thumbnail_url,
              'is_primary', i.is_primary,
              'display_order', i.display_order
            ) ORDER BY i.display_order
          ) FILTER (WHERE i.id IS NOT NULL),
          '[]'
        ) as images,
        CASE WHEN f.id IS NOT NULL THEN true ELSE false END as is_favorited
      FROM sales s
      LEFT JOIN images i ON s.id = i.sale_id
      LEFT JOIN favorites f ON s.id = f.sale_id AND f.user_id = $4
      WHERE s.store_id = $1 AND s.status = $2
      GROUP BY s.id, f.id
      ORDER BY s.created_at DESC
      LIMIT $3 OFFSET $5
    `;

    const result = await db.query(query, [id, status, limit, req.user?.id || null, offset]);

    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM sales WHERE store_id = $1 AND status = $2',
      [id, status]
    );
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching store sales:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch store sales'
    });
  }
});

// GET /api/stores/:id/reviews - Get store reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
      SELECT
        r.rating,
        r.review_text,
        r.review_type,
        r.created_at,
        u.first_name as reviewer_first_name,
        u.last_name as reviewer_last_name,
        s.title as sale_title
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      JOIN sales s ON r.sale_id = s.id
      WHERE r.store_id = $1 AND r.is_public = true
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [id, limit, offset]);

    // Get total count and rating summary
    const summaryQuery = `
      SELECT
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM reviews
      WHERE store_id = $1 AND is_public = true
    `;

    const summaryResult = await db.query(summaryQuery, [id]);
    const summary = summaryResult.rows[0];

    res.json({
      success: true,
      data: result.rows,
      summary: {
        totalReviews: parseInt(summary.total_reviews),
        averageRating: parseFloat(summary.average_rating) || 0,
        ratingDistribution: {
          5: parseInt(summary.five_star),
          4: parseInt(summary.four_star),
          3: parseInt(summary.three_star),
          2: parseInt(summary.two_star),
          1: parseInt(summary.one_star)
        }
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(summary.total_reviews),
        pages: Math.ceil(parseInt(summary.total_reviews) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching store reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch store reviews'
    });
  }
});

// GET /api/stores/my/store - Get current user's store
router.get('/my/store', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT
        s.*,
        COUNT(DISTINCT sales.id) FILTER (WHERE sales.status = 'active') as active_listings,
        COUNT(DISTINCT sales.id) FILTER (WHERE sales.status = 'sold') as sold_listings
      FROM stores s
      LEFT JOIN sales ON s.id = sales.store_id
      WHERE s.user_id = $1
      GROUP BY s.id
    `;

    const result = await db.query(query, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No store found for this user'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching user store:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user store'
    });
  }
});

module.exports = router;