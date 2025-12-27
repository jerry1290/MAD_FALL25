const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your-secret-key';

// ✅ Fixed CORS - Allow all origins for development
app.use(cors({
  origin: '*', // Allow all origins temporarily
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// ✅ MySQL Database connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ecommerce_db'
});

// Connect to MySQL
connection.connect((err) => {
  if (err) {
    console.log('Database connection failed: ', err);
    return;
  }
  console.log('✅ Connected to MySQL database');
});

// ==================== AUTHENTICATION ROUTES ====================

// User Registration
app.post('/api/register', async (req, res) => {
  const { name, email, password, address, phone } = req.body;

  try {
    const checkUserQuery = 'SELECT * FROM users WHERE email = ?';
    connection.query(checkUserQuery, [email], async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (results.length > 0) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const insertUserQuery = 'INSERT INTO users (name, email, password, address, phone) VALUES (?, ?, ?, ?, ?)';
      connection.query(insertUserQuery, [name, email, hashedPassword, address, phone], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const token = jwt.sign({ userId: results.insertId }, JWT_SECRET);
        res.json({ 
          message: 'User registered successfully', 
          token,
          user: { id: results.insertId, name, email }
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const query = 'SELECT * FROM users WHERE email = ?';

  connection.query(query, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(400).json({ error: 'Invalid credentials' });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    res.json({ 
      message: 'Login successful', 
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  });
});

// ==================== PRODUCT ROUTES ====================

// Get all products
app.get('/api/products', (req, res) => {
  const { category, minPrice, maxPrice, search } = req.query;
  
  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (minPrice) {
    query += ' AND price >= ?';
    params.push(parseFloat(minPrice));
  }
  if (maxPrice) {
    query += ' AND price <= ?';
    params.push(parseFloat(maxPrice));
  }
  if (search) {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  console.log('Executing query:', query, params);

  connection.query(query, params, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log(`Found ${results.length} products`);
    res.json(results);
  });
});

// Get single product by ID
app.get('/api/products/:id', (req, res) => {
  const productId = req.params.id;
  const query = 'SELECT * FROM products WHERE id = ?';
  
  connection.query(query, [productId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(results[0]);
  });
});

// ==================== CART ROUTES ====================

// Get user cart
app.get('/api/cart/:userId', (req, res) => {
  const userId = req.params.userId;
  const query = `
    SELECT c.*, p.name, p.price, p.image_url, p.stock 
    FROM cart c 
    JOIN products p ON c.product_id = p.id 
    WHERE c.user_id = ?
  `;
  connection.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Add to cart
app.post('/api/cart', (req, res) => {
  const { user_id, product_id, quantity } = req.body;
  const checkQuery = 'SELECT * FROM cart WHERE user_id = ? AND product_id = ?';

  connection.query(checkQuery, [user_id, product_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length > 0) {
      const updateQuery = 'UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?';
      connection.query(updateQuery, [quantity, user_id, product_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Cart updated successfully' });
      });
    } else {
      const insertQuery = 'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)';
      connection.query(insertQuery, [user_id, product_id, quantity], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Product added to cart' });
      });
    }
  });
});

// Update cart item quantity
app.put('/api/cart/:id', (req, res) => {
  const cartId = req.params.id;
  const { quantity } = req.body;
  const query = 'UPDATE cart SET quantity = ? WHERE id = ?';
  connection.query(query, [quantity, cartId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Cart updated successfully' });
  });
});

// Remove from cart
app.delete('/api/cart/:id', (req, res) => {
  const cartId = req.params.id;
  const query = 'DELETE FROM cart WHERE id = ?';
  connection.query(query, [cartId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Item removed from cart' });
  });
});

// ==================== ORDER ROUTES ====================

// Create order
app.post('/api/orders', (req, res) => {
  const { user_id, items, total_amount, shipping_address, payment_method } = req.body;

  connection.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: err.message });

    const orderQuery = 'INSERT INTO orders (user_id, total_amount, shipping_address, payment_method) VALUES (?, ?, ?, ?)';
    connection.query(orderQuery, [user_id, total_amount, shipping_address, payment_method], (err, results) => {
      if (err) return connection.rollback(() => res.status(500).json({ error: err.message }));

      const orderId = results.insertId;
      const orderItemsQuery = 'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?';
      const orderItemsValues = items.map(item => [orderId, item.product_id, item.quantity, item.price]);
      
      connection.query(orderItemsQuery, [orderItemsValues], (err) => {
        if (err) return connection.rollback(() => res.status(500).json({ error: err.message }));

        const clearCartQuery = 'DELETE FROM cart WHERE user_id = ?';
        connection.query(clearCartQuery, [user_id], (err) => {
          if (err) return connection.rollback(() => res.status(500).json({ error: err.message }));

          connection.commit((err) => {
            if (err) return connection.rollback(() => res.status(500).json({ error: err.message }));
            res.json({ message: 'Order created successfully', orderId });
          });
        });
      });
    });
  });
});

// Get user orders
app.get('/api/orders/:userId', (req, res) => {
  const userId = req.params.userId;
  const query = `
    SELECT o.*, 
           GROUP_CONCAT(oi.quantity, 'x ', p.name) as items
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE o.user_id = ?
    GROUP BY o.id
    ORDER BY o.order_date DESC
  `;
  connection.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ==================== CATEGORY ROUTES ====================

// Get all categories
app.get('/api/categories', (req, res) => {
  const query = 'SELECT DISTINCT category FROM products';
  connection.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    const categories = results.map(row => row.category);
    res.json(categories);
  });
});

// ✅ Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Basic test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'E-commerce Backend Server is running!',
    endpoints: {
      auth: ['POST /api/register', 'POST /api/login'],
      products: ['GET /api/products', 'GET /api/products/:id'],
      cart: ['GET /api/cart/:userId', 'POST /api/cart', 'PUT /api/cart/:id', 'DELETE /api/cart/:id'],
      orders: ['GET /api/orders/:userId', 'POST /api/orders'],
      categories: ['GET /api/categories'],
      health: ['GET /api/health']
    }
  });
});

// ✅ Updated server listener to allow network access
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🌐 Accessible via network: http://192.168.94.1:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});