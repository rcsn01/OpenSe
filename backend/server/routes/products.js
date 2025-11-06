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

module.exports = router;
