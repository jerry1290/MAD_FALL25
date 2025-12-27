const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Menu = require('./models/Menu');
const Order = require('./models/Order');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic route - testing ke liye
app.get('/', (req, res) => {
  res.json({ message: 'Coffee Shop Server is working!' });
});

// Get all menu items
app.get('/menu', async (req, res) => {
  try {
    const menuItems = await Menu.find();
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Get one random item where inStock = true
app.get('/menu/random', async (req, res) => {
  try {
    const randomItem = await Menu.aggregate([
      { $match: { inStock: true } },
      { $sample: { size: 1 } }
    ]);
    
    if (randomItem.length === 0) {
      return res.status(404).json({ message: 'No items in stock' });
    }
    
    res.json(randomItem[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Create new order
app.post('/orders', async (req, res) => {
  try {
    const { items } = req.body;
    
    // Calculate total amount
    let totalAmount = 0;
    for (let item of items) {
      const menuItem = await Menu.findById(item.menuItemId);
      if (!menuItem) {
        return res.status(404).json({ error: `Item ${item.menuItemId} not found` });
      }
      if (!menuItem.inStock) {
        return res.status(400).json({ error: `${menuItem.name} is out of stock` });
      }
      totalAmount += menuItem.price * item.quantity;
    }

    // Generate order ID
    const orderId = 'ORD' + Date.now();

    const order = new Order({
      orderId,
      items: items.map(item => ({
        menuItem: item.menuItemId,
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount
    });

    await order.save();
    await order.populate('items.menuItem');

    res.status(201).json({
      message: 'Order created successfully',
      order: order
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Get all orders
app.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().populate('items.menuItem').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB!");
  })
  .catch((error) => {
    console.log("MongoDB connection failed: " + error.message);
  });

// Server start karo
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Coffee shop server running on http://0.0.0.0:${PORT}`);
  console.log(`Also accessible on your network IP`);
});