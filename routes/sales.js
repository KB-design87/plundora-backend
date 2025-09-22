const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const db = require('../db/connection');
const { authenticateToken, optionalAuth, requireOwnership } = require('../middleware/auth');

const router = express.Router();

// Multer configuration for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    files: 10 // Maximum 10 images per sale
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
const validateSale = [
  body('title').trim().isLength({ min: 3, max: 255 }).withMessage('Title must be between 3 and 255 characters'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters'),
  body('price').isFloat({ min: 0.01 }).withMessage('Price must be a positive number'),
  body('originalPrice').optional().isFloat({ min: 0 }).withMessage('Original price must be a positive number'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('condition').isIn(['new', 'like_new', 'good', 'fair', 'poor']).withMessage('Invalid condition'),
  body('shippingAvailable').optional().isBoolean().withMessage('Shipping available must be boolean'),
  body('localPickup').optional().isBoolean().withMessage('Local pickup must be boolean'),
  body('shippingCost').optional().isFloat({ min: 0 }).withMessage('Shipping cost must be positive'),
];

const validateSaleQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('category').optional().trim(),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be positive'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be positive'),
  query('condition').optional().isIn(['new', 'like_new', 'good', 'fair', 'poor']),
  query('location').optional().trim(),
  query('search').optional().trim(),
  query('sortBy').optional().isIn(['price_asc', 'price_desc', 'date_asc', 'date_desc', 'popular']),
];

// Helper function to process and save images
const processAndSaveImages = async (files, saleId) => {
  const imageRecords = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const imageId = uuidv4();
    const fileExtension = 'webp'; // Convert all images to WebP
    const filename = `${imageId}.${fileExtension}`;
    const thumbnailFilename = `${imageId}_thumb.${fileExtension}`;

    const imagePath = path.join(process.env.UPLOAD_PATH || './uploads', filename);
    const thumbnailPath = path.join(process.env.UPLOAD_PATH || './uploads', thumbnailFilename);

    try {
      // Process main image
      const processedImage = await sharp(file.buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(imagePath);

      // Process thumbnail
      await sharp(file.buffer)
        .resize(300, 300, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(thumbnailPath);

      // Save image record to database
      const imageResult = await db.query(
        `INSERT INTO images (id, sale_id, image_url, thumbnail_url, alt_text, display_order, is_primary, file_size, dimensions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          imageId,
          saleId,
          `/uploads/${filename}`,
          `/uploads/${thumbnailFilename}`,
          file.originalname,
          i,
          i === 0, // First image is primary
          processedImage.size,
          `${processedImage.width}x${processedImage.height}`
        ]
      );

      imageRecords.push(imageResult.rows[0]);
    } catch (error) {
      console.error('Error processing image:', error);
      throw new Error(`Failed to process image: ${file.originalname}`);
    }
  }

  return imageRecords;
};

// GET /api/sales - Get all sales with filtering and pagination
router.get('/', validateSaleQuery, optionalAuth, async (req, res) => {
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
      category,
      minPrice,
      maxPrice,
      condition,
      location,
      search,
      sortBy = 'date_desc',
      storeId
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = ['s.status = $1'];
    let queryParams = ['active'];
    let paramCount = 1;

    // Build WHERE conditions
    if (category) {
      paramCount++;
      whereConditions.push(`s.category = $${paramCount}`);
      queryParams.push(category);
    }

    if (minPrice) {
      paramCount++;
      whereConditions.push(`s.price >= $${paramCount}`);
      queryParams.push(minPrice);
    }

    if (maxPrice) {
      paramCount++;
      whereConditions.push(`s.price <= $${paramCount}`);
      queryParams.push(maxPrice);
    }

    if (condition) {
      paramCount++;
      whereConditions.push(`s.condition = $${paramCount}`);
      queryParams.push(condition);
    }

    if (location) {
      paramCount++;
      whereConditions.push(`(s.location_city ILIKE $${paramCount} OR s.location_state ILIKE $${paramCount})`);
      queryParams.push(`%${location}%`);
    }

    if (storeId) {
      paramCount++;
      whereConditions.push(`s.store_id = $${paramCount}`);
      queryParams.push(storeId);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(s.title ILIKE $${paramCount} OR s.description ILIKE $${paramCount} OR s.tags::text ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    // Build ORDER BY clause
    let orderBy = 's.created_at DESC';
    switch (sortBy) {
      case 'price_asc':
        orderBy = 's.price ASC';
        break;
      case 'price_desc':
        orderBy = 's.price DESC';
        break;
      case 'date_asc':
        orderBy = 's.created_at ASC';
        break;
      case 'popular':
        orderBy = 's.view_count DESC, s.favorite_count DESC';
        break;
    }

    const query = `
      SELECT
        s.*,
        st.store_name,
        st.store_url_slug,
        st.rating as store_rating,
        u.first_name as seller_first_name,
        u.last_name as seller_last_name,
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
      LEFT JOIN stores st ON s.store_id = st.id
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN images i ON s.id = i.sale_id
      LEFT JOIN favorites f ON s.id = f.sale_id AND f.user_id = $${req.user ? paramCount + 1 : 'NULL'}
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY s.id, st.store_name, st.store_url_slug, st.rating, u.first_name, u.last_name, f.id
      ORDER BY ${orderBy}
      LIMIT $${paramCount + (req.user ? 2 : 1)} OFFSET $${paramCount + (req.user ? 3 : 2)}
    `;

    if (req.user) {
      queryParams.push(req.user.id);
    }
    queryParams.push(limit, offset);

    const result = await db.query(query, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT s.id) as total
      FROM sales s
      LEFT JOIN stores st ON s.store_id = st.id
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
    console.error('Error fetching sales:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales'
    });
  }
});

// GET /api/sales/:id - Get single sale by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        s.*,
        st.store_name,
        st.store_url_slug,
        st.rating as store_rating,
        st.total_reviews as store_total_reviews,
        u.first_name as seller_first_name,
        u.last_name as seller_last_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', i.id,
              'image_url', i.image_url,
              'thumbnail_url', i.thumbnail_url,
              'is_primary', i.is_primary,
              'display_order', i.display_order,
              'alt_text', i.alt_text
            ) ORDER BY i.display_order
          ) FILTER (WHERE i.id IS NOT NULL),
          '[]'
        ) as images,
        CASE WHEN f.id IS NOT NULL THEN true ELSE false END as is_favorited
      FROM sales s
      LEFT JOIN stores st ON s.store_id = st.id
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN images i ON s.id = i.sale_id
      LEFT JOIN favorites f ON s.id = f.sale_id AND f.user_id = $2
      WHERE s.id = $1
      GROUP BY s.id, st.store_name, st.store_url_slug, st.rating, st.total_reviews, u.first_name, u.last_name, f.id
    `;

    const result = await db.query(query, [id, req.user?.id || null]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Sale not found'
      });
    }

    // Increment view count (don't count owner views)
    if (!req.user || req.user.id !== result.rows[0].user_id) {
      await db.query(
        'UPDATE sales SET view_count = view_count + 1 WHERE id = $1',
        [id]
      );
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sale'
    });
  }
});

// POST /api/sales - Create new sale
router.post('/', authenticateToken, upload.array('images', 10), validateSale, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      title,
      description,
      price,
      originalPrice,
      category,
      subcategory,
      brand,
      condition,
      size,
      color,
      material,
      tags,
      locationCity,
      locationState,
      locationZip,
      shippingAvailable = true,
      localPickup = false,
      shippingCost = 0,
      storeId
    } = req.body;

    // Verify store ownership
    if (storeId) {
      const storeResult = await db.query(
        'SELECT id FROM stores WHERE id = $1 AND user_id = $2',
        [storeId, req.user.id]
      );

      if (storeResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'You can only create sales for your own stores'
        });
      }
    }

    // Create sale record
    const saleResult = await db.query(
      `INSERT INTO sales (
        user_id, store_id, title, description, price, original_price, category, subcategory,
        brand, condition, size, color, material, tags, location_city, location_state,
        location_zip, shipping_available, local_pickup, shipping_cost
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        req.user.id,
        storeId || null,
        title,
        description || null,
        price,
        originalPrice || null,
        category,
        subcategory || null,
        brand || null,
        condition,
        size || null,
        color || null,
        material || null,
        tags ? tags.split(',').map(tag => tag.trim()) : null,
        locationCity || null,
        locationState || null,
        locationZip || null,
        shippingAvailable,
        localPickup,
        shippingCost
      ]
    );

    const sale = saleResult.rows[0];

    // Process and save images if any
    let images = [];
    if (req.files && req.files.length > 0) {
      images = await processAndSaveImages(req.files, sale.id);
    }

    res.status(201).json({
      success: true,
      data: {
        ...sale,
        images
      }
    });
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create sale'
    });
  }
});

// PUT /api/sales/:id - Update sale
router.put('/:id', authenticateToken, requireOwnership(), upload.array('images', 10), validateSale, async (req, res) => {
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
      'SELECT user_id FROM sales WHERE id = $1',
      [id]
    );

    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Sale not found'
      });
    }

    if (req.user.role !== 'admin' && ownershipResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only update your own sales'
      });
    }

    const {
      title,
      description,
      price,
      originalPrice,
      category,
      subcategory,
      brand,
      condition,
      size,
      color,
      material,
      tags,
      locationCity,
      locationState,
      locationZip,
      shippingAvailable,
      localPickup,
      shippingCost,
      status
    } = req.body;

    // Update sale record
    const updateResult = await db.query(
      `UPDATE sales SET
        title = $1, description = $2, price = $3, original_price = $4, category = $5,
        subcategory = $6, brand = $7, condition = $8, size = $9, color = $10,
        material = $11, tags = $12, location_city = $13, location_state = $14,
        location_zip = $15, shipping_available = $16, local_pickup = $17,
        shipping_cost = $18, status = $19, updated_at = CURRENT_TIMESTAMP
      WHERE id = $20
      RETURNING *`,
      [
        title,
        description,
        price,
        originalPrice,
        category,
        subcategory,
        brand,
        condition,
        size,
        color,
        material,
        tags ? tags.split(',').map(tag => tag.trim()) : null,
        locationCity,
        locationState,
        locationZip,
        shippingAvailable,
        localPickup,
        shippingCost,
        status || 'active',
        id
      ]
    );

    // Process new images if any
    let newImages = [];
    if (req.files && req.files.length > 0) {
      newImages = await processAndSaveImages(req.files, id);
    }

    res.json({
      success: true,
      data: {
        ...updateResult.rows[0],
        newImages
      }
    });
  } catch (error) {
    console.error('Error updating sale:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update sale'
    });
  }
});

// DELETE /api/sales/:id - Delete sale
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const ownershipResult = await db.query(
      'SELECT user_id FROM sales WHERE id = $1',
      [id]
    );

    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Sale not found'
      });
    }

    if (req.user.role !== 'admin' && ownershipResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own sales'
      });
    }

    // Get all images to delete files
    const imagesResult = await db.query(
      'SELECT image_url, thumbnail_url FROM images WHERE sale_id = $1',
      [id]
    );

    // Delete sale (cascade will handle images table)
    await db.query('DELETE FROM sales WHERE id = $1', [id]);

    // Delete image files
    for (const image of imagesResult.rows) {
      try {
        if (image.image_url) {
          await fs.unlink(path.join('.', image.image_url));
        }
        if (image.thumbnail_url) {
          await fs.unlink(path.join('.', image.thumbnail_url));
        }
      } catch (fileError) {
        console.error('Error deleting image file:', fileError);
      }
    }

    res.json({
      success: true,
      message: 'Sale deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting sale:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete sale'
    });
  }
});

// POST /api/sales/:id/favorite - Toggle favorite
router.post('/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if sale exists
    const saleResult = await db.query('SELECT id FROM sales WHERE id = $1', [id]);
    if (saleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Sale not found'
      });
    }

    // Check if already favorited
    const existingFavorite = await db.query(
      'SELECT id FROM favorites WHERE user_id = $1 AND sale_id = $2',
      [req.user.id, id]
    );

    let isFavorited;
    if (existingFavorite.rows.length > 0) {
      // Remove favorite
      await db.query('DELETE FROM favorites WHERE user_id = $1 AND sale_id = $2', [req.user.id, id]);
      await db.query('UPDATE sales SET favorite_count = favorite_count - 1 WHERE id = $1', [id]);
      isFavorited = false;
    } else {
      // Add favorite
      await db.query(
        'INSERT INTO favorites (user_id, sale_id) VALUES ($1, $2)',
        [req.user.id, id]
      );
      await db.query('UPDATE sales SET favorite_count = favorite_count + 1 WHERE id = $1', [id]);
      isFavorited = true;
    }

    res.json({
      success: true,
      data: { isFavorited }
    });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle favorite'
    });
  }
});

// DELETE /api/sales/:saleId/images/:imageId - Delete specific image
router.delete('/:saleId/images/:imageId', authenticateToken, async (req, res) => {
  try {
    const { saleId, imageId } = req.params;

    // Check sale ownership
    const ownershipResult = await db.query(
      'SELECT user_id FROM sales WHERE id = $1',
      [saleId]
    );

    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Sale not found'
      });
    }

    if (req.user.role !== 'admin' && ownershipResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete images from your own sales'
      });
    }

    // Get image info
    const imageResult = await db.query(
      'SELECT image_url, thumbnail_url FROM images WHERE id = $1 AND sale_id = $2',
      [imageId, saleId]
    );

    if (imageResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }

    const image = imageResult.rows[0];

    // Delete from database
    await db.query('DELETE FROM images WHERE id = $1', [imageId]);

    // Delete files
    try {
      if (image.image_url) {
        await fs.unlink(path.join('.', image.image_url));
      }
      if (image.thumbnail_url) {
        await fs.unlink(path.join('.', image.thumbnail_url));
      }
    } catch (fileError) {
      console.error('Error deleting image files:', fileError);
    }

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete image'
    });
  }
});

module.exports = router;