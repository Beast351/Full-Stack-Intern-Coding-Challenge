// ==================== SERVER.JS ====================
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL Connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'store_rating_db'
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ==================== DATABASE SCHEMA ====================
const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(60) NOT NULL CHECK (LENGTH(name) >= 20),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        address VARCHAR(400),
        role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'store_owner')),
        store_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS stores (
        id SERIAL PRIMARY KEY,
        name VARCHAR(60) NOT NULL CHECK (LENGTH(name) >= 20),
        email VARCHAR(255) UNIQUE NOT NULL,
        address VARCHAR(400),
        owner_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE users ADD CONSTRAINT fk_store 
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL;

      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, store_id)
      );

      CREATE INDEX IF NOT EXISTS idx_ratings_store ON ratings(store_id);
      CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(user_id);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `);
    
    // Create default admin if not exists
    const adminExists = await client.query("SELECT * FROM users WHERE email = 'admin@system.com'");
    if (adminExists.rows.length === 0) {
      const hashedPw = await bcrypt.hash('Admin@123', 10);
      await client.query(
        `INSERT INTO users (name, email, password, address, role) 
         VALUES ($1, $2, $3, $4, $5)`,
        ['System Administrator User', 'admin@system.com', hashedPw, '123 Admin Street, City', 'admin']
      );
    }
    console.log('Database initialized');
  } catch (err) {
    console.error('DB Init Error:', err.message);
  } finally {
    client.release();
  }
};

// ==================== MIDDLEWARE ====================
const authMiddleware = (roles = []) => {
  return async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
      if (!user.rows[0]) return res.status(401).json({ error: 'User not found' });
      
      if (roles.length && !roles.includes(user.rows[0].role)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      req.user = user.rows[0];
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };
};

// ==================== VALIDATION ====================
const validateUser = (data, isUpdate = false) => {
  const errors = [];
  if (!isUpdate || data.name !== undefined) {
    if (!data.name || data.name.length < 20 || data.name.length > 60)
      errors.push('Name must be 20-60 characters');
  }
  if (!isUpdate || data.email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email))
      errors.push('Invalid email format');
  }
  if (!isUpdate || data.password !== undefined) {
    const pwRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,16}$/;
    if (data.password && !pwRegex.test(data.password))
      errors.push('Password: 8-16 chars, 1 uppercase, 1 special char');
  }
  if (data.address && data.address.length > 400)
    errors.push('Address max 400 characters');
  return errors;
};

// ==================== AUTH ROUTES ====================
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, address } = req.body;
  const errors = validateUser({ name, email, password, address });
  if (errors.length) return res.status(400).json({ errors });

  try {
    const hashedPw = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password, address, role) 
       VALUES ($1, $2, $3, $4, 'user') RETURNING id, name, email, role`,
      [name, email, hashedPw, address]
    );
    const token = jwt.sign({ id: result.rows[0].id }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ user: result.rows[0], token });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email exists' });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows[0]) return res.status(401).json({ error: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, result.rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, store_id: user.store_id }, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/auth/password', authMiddleware(), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const errors = validateUser({ password: newPassword });
  if (errors.length) return res.status(400).json({ errors });

  try {
    const valid = await bcrypt.compare(currentPassword, req.user.password);
    if (!valid) return res.status(400).json({ error: 'Current password incorrect' });
    
    const hashedPw = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPw, req.user.id]);
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ADMIN ROUTES ====================
app.get('/api/admin/dashboard', authMiddleware(['admin']), async (req, res) => {
  try {
    const [users, stores, ratings] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM stores'),
      pool.query('SELECT COUNT(*) FROM ratings')
    ]);
    res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalStores: parseInt(stores.rows[0].count),
      totalRatings: parseInt(ratings.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users', authMiddleware(['admin']), async (req, res) => {
  const { name, email, address, role, sortBy = 'name', order = 'asc' } = req.query;
  const validSort = ['name', 'email', 'address', 'role'].includes(sortBy) ? sortBy : 'name';
  const validOrder = order === 'desc' ? 'DESC' : 'ASC';
  
  let query = `SELECT u.id, u.name, u.email, u.address, u.role, u.store_id,
    COALESCE((SELECT ROUND(AVG(r.rating)::numeric, 2) FROM ratings r WHERE r.store_id = u.store_id), 0) as rating
    FROM users u WHERE 1=1`;
  const params = [];
  
  if (name) { params.push(`%${name}%`); query += ` AND u.name ILIKE $${params.length}`; }
  if (email) { params.push(`%${email}%`); query += ` AND u.email ILIKE $${params.length}`; }
  if (address) { params.push(`%${address}%`); query += ` AND u.address ILIKE $${params.length}`; }
  if (role) { params.push(role); query += ` AND u.role = $${params.length}`; }
  
  query += ` ORDER BY ${validSort} ${validOrder}`;
  
  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users', authMiddleware(['admin']), async (req, res) => {
  const { name, email, password, address, role = 'user' } = req.body;
  const errors = validateUser({ name, email, password, address });
  if (errors.length) return res.status(400).json({ errors });

  try {
    const hashedPw = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password, address, role) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, address, role`,
      [name, email, hashedPw, address, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email exists' });
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users/:id', authMiddleware(['admin']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.address, u.role, u.store_id,
        COALESCE((SELECT ROUND(AVG(r.rating)::numeric, 2) FROM ratings r WHERE r.store_id = u.store_id), 0) as rating
       FROM users u WHERE u.id = $1`, [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== STORE ROUTES ====================
app.get('/api/stores', authMiddleware(), async (req, res) => {
  const { name, address, sortBy = 'name', order = 'asc' } = req.query;
  const validSort = ['name', 'email', 'address'].includes(sortBy) ? sortBy : 'name';
  const validOrder = order === 'desc' ? 'DESC' : 'ASC';
  
  let query = `SELECT s.*, 
    COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0) as overall_rating,
    (SELECT rating FROM ratings WHERE user_id = $1 AND store_id = s.id) as user_rating
    FROM stores s LEFT JOIN ratings r ON s.id = r.store_id WHERE 1=1`;
  const params = [req.user.id];
  
  if (name) { params.push(`%${name}%`); query += ` AND s.name ILIKE $${params.length}`; }
  if (address) { params.push(`%${address}%`); query += ` AND s.address ILIKE $${params.length}`; }
  
  query += ` GROUP BY s.id ORDER BY ${validSort === 'name' ? 's.name' : validSort} ${validOrder}`;
  
  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/stores', authMiddleware(['admin']), async (req, res) => {
  const { name, email, address, ownerName, ownerEmail, ownerPassword, ownerAddress } = req.body;
  const storeErrors = validateUser({ name, email, address });
  const ownerErrors = validateUser({ name: ownerName, email: ownerEmail, password: ownerPassword, address: ownerAddress });
  
  if (storeErrors.length || ownerErrors.length) {
    return res.status(400).json({ errors: [...storeErrors, ...ownerErrors] });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const storeResult = await client.query(
      `INSERT INTO stores (name, email, address) VALUES ($1, $2, $3) RETURNING *`,
      [name, email, address]
    );
    
    const hashedPw = await bcrypt.hash(ownerPassword, 10);
    const ownerResult = await client.query(
      `INSERT INTO users (name, email, password, address, role, store_id) 
       VALUES ($1, $2, $3, $4, 'store_owner', $5) RETURNING id`,
      [ownerName, ownerEmail, hashedPw, ownerAddress, storeResult.rows[0].id]
    );
    
    await client.query('UPDATE stores SET owner_id = $1 WHERE id = $2', 
      [ownerResult.rows[0].id, storeResult.rows[0].id]);
    
    await client.query('COMMIT');
    res.status(201).json(storeResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get('/api/admin/stores', authMiddleware(['admin']), async (req, res) => {
  const { name, email, address, sortBy = 'name', order = 'asc' } = req.query;
  const validSort = ['name', 'email', 'address'].includes(sortBy) ? sortBy : 'name';
  const validOrder = order === 'desc' ? 'DESC' : 'ASC';
  
  let query = `SELECT s.*, COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0) as rating
    FROM stores s LEFT JOIN ratings r ON s.id = r.store_id WHERE 1=1`;
  const params = [];
  
  if (name) { params.push(`%${name}%`); query += ` AND s.name ILIKE $${params.length}`; }
  if (email) { params.push(`%${email}%`); query += ` AND s.email ILIKE $${params.length}`; }
  if (address) { params.push(`%${address}%`); query += ` AND s.address ILIKE $${params.length}`; }
  
  query += ` GROUP BY s.id ORDER BY ${validSort} ${validOrder}`;
  
  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== RATING ROUTES ====================
app.post('/api/ratings', authMiddleware(['user']), async (req, res) => {
  const { storeId, rating } = req.body;
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });

  try {
    const result = await pool.query(
      `INSERT INTO ratings (user_id, store_id, rating) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, store_id) DO UPDATE SET rating = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`, [req.user.id, storeId, rating]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== STORE OWNER ROUTES ====================
app.get('/api/owner/dashboard', authMiddleware(['store_owner']), async (req, res) => {
  if (!req.user.store_id) return res.status(400).json({ error: 'No store assigned' });
  
  try {
    const [avgRating, ratingUsers] = await Promise.all([
      pool.query('SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0) as avg FROM ratings WHERE store_id = $1', 
        [req.user.store_id]),
      pool.query(
        `SELECT u.name, u.email, r.rating, r.updated_at 
         FROM ratings r JOIN users u ON r.user_id = u.id 
         WHERE r.store_id = $1 ORDER BY r.updated_at DESC`, [req.user.store_id])
    ]);
    res.json({ averageRating: avgRating.rows[0].avg, ratings: ratingUsers.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
initDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});