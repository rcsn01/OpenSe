const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Create a stock report
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  const { qrCode, status, notes } = req.body;
  const userId = req.user.id;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    // Get product by QR code
    const productResult = await pool.query('SELECT id FROM products WHERE qr_code = $1', [qrCode]);

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productId = productResult.rows[0].id;

    // Create report
    const result = await pool.query(
      'INSERT INTO stock_reports (product_id, user_id, status, notes, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [productId, userId, status, notes, imageUrl]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all reports
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sr.*, p.name as product_name, p.qr_code, u.username 
      FROM stock_reports sr
      JOIN products p ON sr.product_id = p.id
      JOIN users u ON sr.user_id = u.id
      ORDER BY sr.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get reports for a specific product
router.get('/product/:qrCode', authMiddleware, async (req, res) => {
  const { qrCode } = req.params;

  try {
    const result = await pool.query(`
      SELECT sr.*, p.name as product_name, p.qr_code, u.username 
      FROM stock_reports sr
      JOIN products p ON sr.product_id = p.id
      JOIN users u ON sr.user_id = u.id
      WHERE p.qr_code = $1
      ORDER BY sr.created_at DESC
    `, [qrCode]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
