const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer to save uploads to /uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({ storage });

const router = express.Router();

const fs = require('fs');

// Get product by QR code
router.get('/:qrCode', authMiddleware, async (req, res) => {
  const { qrCode } = req.params;

  try {
    const result = await pool.query(
      `SELECT id::text as id, name, description, category, quantity, expiry_date, location, image_url, created_at
       FROM products WHERE id::text = $1`,
      [qrCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all products
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id::text as id, name, description, category, quantity, expiry_date, location, image_url, created_at
       FROM products ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create product (supports optional image upload)
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { name, description, category, quantity, expiry_date, location } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    // If file uploaded, build image URL
    let image_url = null;
    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    }

    const result = await pool.query(
      `INSERT INTO products (name, description, category, quantity, expiry_date, location, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id::text as id, name, description, category, quantity, expiry_date, location, image_url, created_at`,
      [name, description || null, category || null, quantity ? parseInt(quantity, 10) : 0, expiry_date || null, location || null, image_url]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // unique_violation
      return res.status(409).json({ error: 'Product with this QR code already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update product (partial or full). Supports JSON or multipart/form-data (image replacement)
router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch existing product to know current image (for cleanup)
    const existing = await pool.query(
      `SELECT id::text as id, image_url FROM products WHERE id::text = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updates = [];
    const values = [];
    let idx = 1;

    // Helper to push column update
    const push = (col, val) => {
      updates.push(`${col} = $${idx}`);
      values.push(val);
      idx += 1;
    };

    // Accept fields from either JSON body or form fields
    const body = req.body || {};

    if (Object.prototype.hasOwnProperty.call(body, 'name')) push('name', body.name || null);
    if (Object.prototype.hasOwnProperty.call(body, 'description')) push('description', body.description || null);
    if (Object.prototype.hasOwnProperty.call(body, 'category')) push('category', body.category || null);
    if (Object.prototype.hasOwnProperty.call(body, 'quantity')) {
      const q = body.quantity === '' || body.quantity == null ? 0 : parseInt(body.quantity, 10);
      push('quantity', Number.isNaN(q) ? 0 : q);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'expiry_date')) push('expiry_date', body.expiry_date || null);
    if (Object.prototype.hasOwnProperty.call(body, 'location')) push('location', body.location || null);

    let newImageUrl = null;
    if (req.file) {
      newImageUrl = `/uploads/${req.file.filename}`;
      push('image_url', newImageUrl);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    // Finalize query
    const query = `UPDATE products SET ${updates.join(', ')} WHERE id::text = $${idx} RETURNING id::text as id, name, description, category, quantity, expiry_date, location, image_url, created_at`;
    values.push(id);

    const result = await pool.query(query, values);

    // If we replaced the image, remove the previous file from disk (best-effort)
    try {
      const prevImage = existing.rows[0].image_url;
      if (req.file && prevImage && prevImage !== newImageUrl) {
        const prevFilename = path.basename(prevImage);
        const prevPath = path.join(__dirname, '..', 'uploads', prevFilename);
        fs.unlink(prevPath, (err) => {
          if (err) console.warn('Failed to remove previous image:', err.message);
        });
      }
    } catch (cleanupErr) {
      console.warn('Image cleanup error', cleanupErr);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
