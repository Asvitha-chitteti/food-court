const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { sendOrderConfirmationEmail } = require('./emailService');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../')));

// Helper for notifications
function createNotification(username, title, message, type = 'info') {
  db.run(
    'INSERT INTO notifications (username, title, message, type) VALUES (?, ?, ?, ?)',
    [username, title, message, type],
    (err) => {
      if (err) console.error('Notification creation error:', err);
    }
  );
}


// ==========================================
// 1. AUTHENTICATION API
// ==========================================

// Signup
app.post('/api/auth/signup', (req, res) => {
  const { username, password, role, email } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  const userRole = role === 'admin' ? 'admin' : 'customer';

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    if (user) return res.status(400).json({ success: false, message: 'Username already taken' });

    const hashedPassword = bcrypt.hashSync(password, 10);
    db.run(
      'INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, userRole, email || ''],
      function(err) {
        if (err) return res.status(500).json({ success: false, message: 'Failed to create user' });

        createNotification(username, 'Welcome to Food Court! 🎉', 'Your account has been successfully created.');
        res.json({
          success: true,
          message: 'Account created successfully!',
          userId: this.lastID,
          username,
          role: userRole
        });
      }
    );
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const isValidPassword = bcrypt.compareSync(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    res.json({
      success: true,
      message: 'Login successful!',
      user: {
        id: user.id,
        username: user.username,
        role: user.role || 'customer',
        email: user.email
      }
    });
  });
});


// ==========================================
// 2. CATEGORIES & FOOD ITEMS API
// ==========================================

app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM categories', [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Error fetching categories' });
    res.json({ success: true, categories: rows });
  });
});

app.get('/api/food', (req, res) => {
  const { search, category, minPrice, maxPrice, veg, availability, sort } = req.query;

  let query = `
    SELECT f.*, c.name as category_name,
    COALESCE(AVG(r.rating), 4.5) as avg_rating,
    COUNT(r.id) as review_count
    FROM food_items f
    LEFT JOIN categories c ON f.category_id = c.id
    LEFT JOIN reviews r ON f.id = r.food_item_id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    query += ` AND (f.name LIKE ? OR f.description LIKE ? OR c.name LIKE ?)`;
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  if (category && category !== 'All') {
    query += ` AND (c.name = ? OR f.category_id = ?)`;
    params.push(category, category);
  }

  if (minPrice) {
    query += ` AND f.price >= ?`;
    params.push(parseFloat(minPrice));
  }

  if (maxPrice) {
    query += ` AND f.price <= ?`;
    params.push(parseFloat(maxPrice));
  }

  if (veg !== undefined && veg !== '' && veg !== 'All') {
    query += ` AND f.vegetarian = ?`;
    params.push(veg === 'true' || veg === '1' ? 1 : 0);
  }

  query += ` GROUP BY f.id`;

  if (sort === 'price_asc') {
    query += ` ORDER BY f.price ASC`;
  } else if (sort === 'price_desc') {
    query += ` ORDER BY f.price DESC`;
  } else if (sort === 'rating') {
    query += ` ORDER BY avg_rating DESC`;
  } else {
    query += ` ORDER BY f.id ASC`;
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Error fetching food items' });
    res.json({ success: true, foodItems: rows });
  });
});

app.get('/api/food/:id', (req, res) => {
  const foodId = req.params.id;

  db.get(
    `SELECT f.*, c.name as category_name,
     COALESCE(AVG(r.rating), 4.5) as avg_rating,
     COUNT(r.id) as review_count
     FROM food_items f
     LEFT JOIN categories c ON f.category_id = c.id
     LEFT JOIN reviews r ON f.id = r.food_item_id
     WHERE f.id = ?
     GROUP BY f.id`,
    [foodId],
    (err, food) => {
      if (err || !food) return res.status(404).json({ success: false, message: 'Food item not found' });

      db.all('SELECT * FROM reviews WHERE food_item_id = ? ORDER BY created_at DESC', [foodId], (err, reviews) => {
        food.reviews = reviews || [];
        res.json({ success: true, food });
      });
    }
  );
});

// Admin Add/Edit/Delete Food
app.post('/api/admin/food', (req, res) => {
  const { name, description, price, image_url, category_id, vegetarian, availability } = req.body;
  if (!name || !price) return res.status(400).json({ success: false, message: 'Food name and price required' });

  db.run(
    'INSERT INTO food_items (name, description, price, image_url, category_id, vegetarian, availability) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, description || '', price, image_url || '', category_id || 1, vegetarian ? 1 : 0, availability !== undefined ? (availability ? 1 : 0) : 1],
    function(err) {
      if (err) return res.status(500).json({ success: false, message: 'Error adding food item' });
      res.json({ success: true, message: 'Food item added successfully!', id: this.lastID });
    }
  );
});

app.delete('/api/admin/food/:id', (req, res) => {
  db.run('DELETE FROM food_items WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ success: false, message: 'Error deleting food item' });
    res.json({ success: true, message: 'Food item deleted successfully!' });
  });
});


// ==========================================
// 3. COUPONS & PROMO CODES
// ==========================================

app.post('/api/coupons/apply', (req, res) => {
  const { code, subtotal } = req.body;
  const upperCode = (code || '').toUpperCase().trim();

  let discount = 0;
  let message = '';

  if (upperCode === 'FOOD50') {
    discount = Math.min(50, subtotal * 0.20);
    message = '🎉 Coupon FOOD50 Applied! 20% off up to ₹50';
  } else if (upperCode === 'WELCOME20') {
    discount = subtotal * 0.20;
    message = '🎉 Welcome Coupon Applied! 20% Discount';
  } else if (upperCode === 'COURT100' && subtotal >= 300) {
    discount = 100;
    message = '🎉 Flat ₹100 Discount Applied!';
  } else {
    return res.status(400).json({ success: false, message: 'Invalid or expired coupon code' });
  }

  res.json({ success: true, discount, message, couponCode: upperCode });
});


// ==========================================
// 4. ORDERS, PAYMENTS & REORDER
// ==========================================

app.post('/api/orders', (req, res) => {
  const { username, user_id, items, payment_method, delivery_address, discount, delivery_schedule } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart items are required' });
  }

  const orderUsername = username || 'Guest';

  let subtotal = 0;
  items.forEach(item => {
    const itemPrice = item.price || item.p || 0;
    const itemQty = item.quantity || 1;
    subtotal += itemPrice * itemQty;
  });

  const tax = subtotal * 0.05;
  const delivery_fee = 30.00;
  const appliedDiscount = discount ? parseFloat(discount) : 0;
  const total_amount = Math.max(0, subtotal + tax + delivery_fee - appliedDiscount);

  const initialPaymentStatus = payment_method === 'COD' ? 'Pending' : 'Processing';
  const initialOrderStatus = 'Pending';

  db.run(
    `INSERT INTO orders (user_id, username, subtotal, tax, delivery_fee, discount, total_amount, order_status, payment_status, delivery_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [user_id || null, orderUsername, subtotal, tax, delivery_fee, appliedDiscount, total_amount, initialOrderStatus, initialPaymentStatus, delivery_address || 'Default Address'],
    function(err) {
      if (err) return res.status(500).json({ success: false, message: 'Error creating order' });

      const orderId = this.lastID;

      const itemStmt = db.prepare('INSERT INTO order_items (order_id, food_item_id, food_name, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?, ?)');
      items.forEach(item => {
        const foodName = item.name || item.food_name || item.n;
        const price = item.price || item.p;
        const qty = item.quantity || 1;
        const itemSubtotal = price * qty;
        itemStmt.run(orderId, item.id || null, foodName, qty, price, itemSubtotal);
      });
      itemStmt.finalize();

      const txnId = 'TXN_' + Math.random().toString(36).substring(2, 10).toUpperCase();
      db.run(
        'INSERT INTO payments (order_id, payment_method, transaction_id, amount, payment_status) VALUES (?, ?, ?, ?, ?)',
        [orderId, payment_method || 'COD', txnId, total_amount, initialPaymentStatus]
      );

      createNotification(orderUsername, `Order Placed #${orderId} 📦`, `Your order of ₹${total_amount.toFixed(2)} has been placed.`);

      sendOrderConfirmationEmail({
        username: orderUsername,
        orderId,
        items,
        subtotal,
        tax,
        delivery_fee,
        total_amount,
        payment_method: payment_method || 'COD',
        payment_status: initialPaymentStatus,
        delivery_address
      });

      res.json({
        success: true,
        message: 'Order placed successfully!',
        orderId,
        total_amount,
        payment_status: initialPaymentStatus,
        transaction_id: txnId
      });
    }
  );
});

app.get('/api/orders/my-orders', (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ success: false, message: 'Username required' });

  db.all('SELECT * FROM orders WHERE username = ? ORDER BY created_at DESC', [username], (err, orders) => {
    if (err) return res.status(500).json({ success: false, message: 'Error fetching orders' });
    res.json({ success: true, orders });
  });
});

app.get('/api/orders/:id', (req, res) => {
  const orderId = req.params.id;

  db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
    if (err || !order) return res.status(404).json({ success: false, message: 'Order not found' });

    db.all('SELECT * FROM order_items WHERE order_id = ?', [orderId], (err, items) => {
      db.get('SELECT * FROM payments WHERE order_id = ?', [orderId], (err, payment) => {
        order.items = items || [];
        order.payment = payment || null;
        res.json({ success: true, order });
      });
    });
  });
});

app.post('/api/orders/:id/cancel', (req, res) => {
  const orderId = req.params.id;
  db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
    if (err || !order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.order_status === 'Delivered' || order.order_status === 'Out for Delivery') {
      return res.status(400).json({ success: false, message: 'Order cannot be cancelled at this stage' });
    }

    db.run("UPDATE orders SET order_status = 'Cancelled', payment_status = 'Refunded' WHERE id = ?", [orderId], (err) => {
      if (err) return res.status(500).json({ success: false, message: 'Error cancelling order' });
      db.run("UPDATE payments SET payment_status = 'Refunded' WHERE order_id = ?", [orderId]);
      createNotification(order.username, `Order Cancelled #${orderId} ❌`, 'Your order has been cancelled.');
      res.json({ success: true, message: 'Order cancelled successfully!' });
    });
  });
});

app.post('/api/payments/process', (req, res) => {
  const { orderId, payment_method, status } = req.body;
  const paymentStatus = status || 'Paid';

  db.run('UPDATE payments SET payment_status = ?, paid_at = CURRENT_TIMESTAMP WHERE order_id = ?', [paymentStatus, orderId], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Payment processing failed' });
    db.run('UPDATE orders SET payment_status = ?, order_status = ? WHERE id = ?', [paymentStatus, paymentStatus === 'Paid' ? 'Confirmed' : 'Pending', orderId]);
    res.json({ success: true, message: `Payment ${paymentStatus}!`, payment_status: paymentStatus });
  });
});

app.get('/api/admin/orders', (req, res) => {
  db.all('SELECT * FROM orders ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Error fetching admin orders' });
    res.json({ success: true, orders: rows });
  });
});

app.put('/api/admin/orders/:id/status', (req, res) => {
  const { order_status, payment_status } = req.body;
  const orderId = req.params.id;

  db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
    if (err || !order) return res.status(404).json({ success: false, message: 'Order not found' });
    const newOrderStatus = order_status || order.order_status;
    const newPaymentStatus = payment_status || order.payment_status;

    db.run(
      'UPDATE orders SET order_status = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newOrderStatus, newPaymentStatus, orderId],
      (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Error updating order status' });
        db.run('UPDATE payments SET payment_status = ? WHERE order_id = ?', [newPaymentStatus, orderId]);
        createNotification(order.username, `Order Status Updated #${orderId} 🛵`, `Your order status is now: ${newOrderStatus}`);
        res.json({ success: true, message: 'Order status updated successfully!' });
      }
    );
  });
});


// ==========================================
// 5. REVIEWS & RATINGS
// ==========================================

app.post('/api/reviews', (req, res) => {
  const { username, food_item_id, order_id, rating, comment } = req.body;

  if (!username || !food_item_id || !rating) {
    return res.status(400).json({ success: false, message: 'Username, food item, and rating required' });
  }

  db.get(
    `SELECT o.id FROM orders o
     JOIN order_items oi ON o.id = oi.order_id
     WHERE o.username = ? AND (oi.food_item_id = ? OR oi.food_name = (SELECT name FROM food_items WHERE id = ?))
     AND o.order_status IN ('Delivered', 'Confirmed', 'Preparing', 'Ready')`,
    [username, food_item_id, food_item_id],
    (err, purchased) => {
      if (err) return res.status(500).json({ success: false, message: 'Database validation error' });
      if (!purchased) return res.status(403).json({ success: false, message: 'You can only review food items you have ordered!' });

      db.get('SELECT id FROM reviews WHERE username = ? AND food_item_id = ?', [username, food_item_id], (err, existing) => {
        if (existing) return res.status(400).json({ success: false, message: 'You have already reviewed this food item!' });

        db.run(
          'INSERT INTO reviews (username, food_item_id, order_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
          [username, food_item_id, order_id || purchased.id, rating, comment || ''],
          function(err) {
            if (err) return res.status(500).json({ success: false, message: 'Error saving review' });
            res.json({ success: true, message: 'Review submitted successfully!', reviewId: this.lastID });
          }
        );
      });
    }
  );
});

app.get('/api/admin/reviews', (req, res) => {
  db.all(
    `SELECT r.*, f.name as food_name
     FROM reviews r
     JOIN food_items f ON r.food_item_id = f.id
     ORDER BY r.created_at DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Error fetching admin reviews' });
      res.json({ success: true, reviews: rows });
    }
  );
});

app.delete('/api/admin/reviews/:id', (req, res) => {
  db.run('DELETE FROM reviews WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Error deleting review' });
    res.json({ success: true, message: 'Review deleted!' });
  });
});


// ==========================================
// 6. NOTIFICATIONS & ADMIN DASHBOARD
// ==========================================

app.get('/api/notifications', (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ success: false, message: 'Username required' });

  db.all('SELECT * FROM notifications WHERE username = ? ORDER BY created_at DESC LIMIT 20', [username], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Error fetching notifications' });
    const unreadCount = rows.filter(n => n.is_read === 0).length;
    res.json({ success: true, notifications: rows, unreadCount });
  });
});

app.put('/api/notifications/read-all', (req, res) => {
  const { username } = req.body;
  db.run('UPDATE notifications SET is_read = 1 WHERE username = ?', [username], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Error updating notifications' });
    res.json({ success: true, message: 'All notifications marked as read' });
  });
});

app.get('/api/admin/dashboard', (req, res) => {
  db.get('SELECT COUNT(*) as total_users FROM users', (err, uRow) => {
    db.get('SELECT COUNT(*) as total_food FROM food_items', (err, fRow) => {
      db.get('SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_revenue FROM orders', (err, oRow) => {
        db.get("SELECT COUNT(*) as pending_orders FROM orders WHERE order_status IN ('Pending', 'Confirmed', 'Preparing')", (err, pRow) => {
          db.get("SELECT COUNT(*) as completed_orders FROM orders WHERE order_status = 'Delivered'", (err, cRow) => {
            db.get("SELECT COUNT(*) as cancelled_orders FROM orders WHERE order_status = 'Cancelled'", (err, xRow) => {
              db.get("SELECT COALESCE(AVG(rating), 4.8) as avg_rating FROM reviews", (err, rRow) => {
                res.json({
                  success: true,
                  stats: {
                    total_users: uRow ? uRow.total_users : 0,
                    total_food: fRow ? fRow.total_food : 0,
                    total_orders: oRow ? oRow.total_orders : 0,
                    total_revenue: oRow ? oRow.total_revenue : 0,
                    pending_orders: pRow ? pRow.pending_orders : 0,
                    completed_orders: cRow ? cRow.completed_orders : 0,
                    cancelled_orders: xRow ? xRow.cancelled_orders : 0,
                    avg_rating: rRow ? parseFloat(rRow.avg_rating).toFixed(1) : '4.8'
                  }
                });
              });
            });
          });
        });
      });
    });
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Food Court Production System running on http://localhost:${PORT}`);
});
