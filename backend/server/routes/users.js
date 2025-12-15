const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// Create a new role
router.post('/roles', authMiddleware, async (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Role name is required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING *',
      [name.toLowerCase(), description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Role already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all roles
router.get('/roles', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM roles ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a role to a user
router.post('/:userId/roles', authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const { roleName } = req.body;

  if (!roleName) {
    return res.status(400).json({ error: 'Role name is required' });
  }

  try {
    // Get role id
    const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [roleName.toLowerCase()]);
    if (roleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    const roleId = roleResult.rows[0].id;

    await pool.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, roleId]
    );
    
    res.json({ message: 'Role assigned successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove a role from a user
router.delete('/:userId/roles/:roleName', authMiddleware, async (req, res) => {
  const { userId, roleName } = req.params;

  try {
    const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [roleName.toLowerCase()]);
    if (roleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    const roleId = roleResult.rows[0].id;

    await pool.query(
      'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2',
      [userId, roleId]
    );

    res.json({ message: 'Role removed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get roles for a specific user
router.get('/:userId/roles', authMiddleware, async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      `SELECT r.* FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a user
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users with their roles
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.username, u.email, u.created_at, 
             COALESCE(json_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '[]') as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      GROUP BY u.id
      ORDER BY u.username
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
