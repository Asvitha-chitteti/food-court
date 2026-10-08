const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

db.serialize(() => {
  // 1. Users Table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'customer',
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, () => {
    // Seed default Admin user if not exists
    db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, user) => {
      if (!err && !user) {
        const adminPassHash = bcrypt.hashSync('admin123', 10);
        db.run('INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)',
          ['admin', adminPassHash, 'admin', 'admin@foodcourt.com']);
        console.log('Admin account initialized: admin / admin123');
      }
    });
  });

  // 2. Categories Table
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT
    )
  `, () => {
    db.get('SELECT COUNT(*) as count FROM categories', (err, row) => {
      if (!err && row && row.count === 0) {
        const initialCategories = [
          { name: 'Veg', description: 'Vegetarian Specials' },
          { name: 'Non-Veg', description: 'Non-Vegetarian Specials' },
          { name: 'Egg', description: 'Egg Specials' },
          { name: 'Beverages', description: 'Soft Drinks & Beverages' },
          { name: 'Juices', description: 'Fresh Juices & Shakes' },
          { name: 'Desserts', description: 'Desserts & Ice Creams' }
        ];
        const stmt = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
        initialCategories.forEach(cat => stmt.run(cat.name, cat.description));
        stmt.finalize();
      }
    });
  });

  // 3. Food Items Table
  db.run(`
    CREATE TABLE IF NOT EXISTS food_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      image_url TEXT,
      category_id INTEGER,
      availability INTEGER DEFAULT 1,
      vegetarian INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories (id)
    )
  `, () => {
    // Seed initial food items if empty
    db.get('SELECT COUNT(*) as count FROM food_items', (err, row) => {
      if (!err && row && row.count === 0) {
        const initialFood = [
          // Veg
          { name: 'Idli', description: 'Soft steamed rice cakes served with sambar and chutney', price: 50, image_url: 'https://cdn.pixabay.com/photo/2017/06/16/11/38/breakfast-2408818_1280.jpg', category_id: 1, vegetarian: 1 },
          { name: 'Masala Dosa', description: 'Crispy rice crepe stuffed with spiced potato masala', price: 90, image_url: 'https://vismaifood.com/storage/app/uploads/public/8b4/19e/427/thumb__700_0_0_0_auto.jpg', category_id: 1, vegetarian: 1 },
          { name: 'Medu Vada', description: 'Crispy deep fried lentil donuts served with sambar', price: 40, image_url: 'https://instamart-media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,h_960,w_960//InstamartAssets/2/sambar_vada.webp?updatedAt=1730797766736', category_id: 1, vegetarian: 1 },
          { name: 'Puri Bhaji', description: 'Fluffy fried puris served with spiced potato bhaji', price: 70, image_url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?q=80&w=600&auto=format&fit=crop', category_id: 1, vegetarian: 1 },
          { name: 'Rava Dosa', description: 'Crispy semolina crepe with onions and green chillies', price: 80, image_url: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?q=80&w=600&auto=format&fit=crop', category_id: 1, vegetarian: 1 },
          { name: 'Mysore Bonda', description: 'Crispy golden fried flour fritters', price: 50, image_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=600&auto=format&fit=crop', category_id: 1, vegetarian: 1 },
          { name: 'Veg Biryani', description: 'Fragrant basmati rice cooked with garden vegetables and aromatic spices', price: 150, image_url: 'https://media.istockphoto.com/id/179085494/photo/indian-biryani.jpg?s=612x612&w=0&k=20&c=VJAUfiuavFYB7PXwisvUhLqWFJ20-9m087-czUJp9Fs=', category_id: 1, vegetarian: 1 },
          { name: 'Veg Pulao', description: 'Mildly spiced aromatic rice cooked with mixed vegetables', price: 130, image_url: 'https://www.funfoodfrolic.com/wp-content/uploads/2022/05/Vegetable-Pulao-2.jpg', category_id: 1, vegetarian: 1 },
          { name: 'Veg Fried Rice', description: 'Indo-Chinese style wok-tossed fried rice with vegetables', price: 120, image_url: 'https://flavorquotient.com/wp-content/uploads/2025/04/Veg-Fried-Rice-FQ-9-2-copy.webp', category_id: 1, vegetarian: 1 },
          { name: 'Paneer Butter Masala', description: 'Cottage cheese cubes in rich creamy tomato butter gravy', price: 180, image_url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?q=80&w=600&auto=format&fit=crop', category_id: 1, vegetarian: 1 },
          { name: 'Dal Makhani', description: 'Creamy slow-cooked black lentils and kidney beans', price: 140, image_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=600&auto=format&fit=crop', category_id: 1, vegetarian: 1 },
          { name: 'Kaju Curry', description: 'Roasted cashews cooked in rich spiced onion-tomato gravy', price: 190, image_url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?q=80&w=600&auto=format&fit=crop', category_id: 1, vegetarian: 1 },
          { name: 'Paneer Tikka', description: 'Marinated cottage cheese cubes grilled in tandoor', price: 160, image_url: 'https://maharajachaap.com/wp-content/uploads/2018/09/paneer-tikka.jpg', category_id: 1, vegetarian: 1 },
          { name: 'Gobi Manchurian', description: 'Crispy cauliflower florets tossed in tangy Manchurian sauce', price: 140, image_url: 'https://zaikastreet.com/wp-content/uploads/2025/09/Untitled-design-59-1.png', category_id: 1, vegetarian: 1 },
          { name: 'Veg Roll', description: 'Delicious vegetable filling wrapped in warm roti', price: 100, image_url: 'https://t3.ftcdn.net/jpg/15/86/80/16/360_F_1586801641_vdjFbf71WMHA29nEVWYE492Eadrt0Xka.jpg', category_id: 1, vegetarian: 1 },
          { name: 'Spring Rolls', description: 'Crispy fried rolls stuffed with seasoned vegetables', price: 120, image_url: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?q=80&w=600&auto=format&fit=crop', category_id: 1, vegetarian: 1 },
          { name: 'Mushroom 65', description: 'Deep fried button mushrooms tossed in hot spices', price: 150, image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=600&auto=format&fit=crop', category_id: 1, vegetarian: 1 },
          { name: 'Crispy Babycorn', description: 'Golden batter fried babycorn tossed with peppers', price: 140, image_url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?q=80&w=600&auto=format&fit=crop', category_id: 1, vegetarian: 1 },

          // Non-Veg
          { name: 'Chicken Biryani', description: 'Authentic dum biryani cooked with succulent chicken and aromatic basmati rice', price: 200, image_url: 'https://www.shutterstock.com/image-photo/traditional-chicken-biryani-served-brass-600nw-2622739739.jpg', category_id: 2, vegetarian: 0 },
          { name: 'Mutton Biryani', description: 'Rich and tender mutton dum biryani with rich spices', price: 280, image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTtZ2zpnEb1fR70GIgE1Spk1mGj-IMthUXRrw&s', category_id: 2, vegetarian: 0 },
          { name: 'Chicken Fried Rice', description: 'Wok tossed fried rice with tender chicken pieces and veggies', price: 160, image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRBccU4aMX2qz6DcyRdHF1VGjb6UBqMF644-w&s', category_id: 2, vegetarian: 0 },
          { name: 'Egg Fried Rice', description: 'Savory fried rice tossed with scrambled eggs and spring onions', price: 140, image_url: 'https://static.vecteezy.com/system/resources/previews/054/317/669/non_2x/delicious-chicken-fried-rice-asian-cuisine-food-photography-png.png', category_id: 2, vegetarian: 0 },
          { name: 'Prawn Biryani', description: 'Delicate prawns cooked in flavorful biryani masala rice', price: 200, image_url: 'https://c.ndtvimg.com/2020-01/n5beapg8_rice_625x300_23_January_20.jpg', category_id: 2, vegetarian: 0 },
          { name: 'Chicken Curry', description: 'Traditional South Indian style spicy chicken curry', price: 150, image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ9ulg3w0NqbnxNTxtewVnbWpO6yvn8KvrgXA&s', category_id: 2, vegetarian: 0 },
          { name: 'Butter Chicken', description: 'Tender chicken pieces cooked in smooth tomato butter gravy', price: 240, image_url: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?q=80&w=600&auto=format&fit=crop', category_id: 2, vegetarian: 0 },
          { name: 'Mutton Rogan Josh', description: 'Kashmiri style aromatic slow-cooked mutton curry', price: 320, image_url: 'https://images.unsplash.com/photo-1545247181-516773cae754?q=80&w=600&auto=format&fit=crop', category_id: 2, vegetarian: 0 },
          { name: 'Egg Biryani', description: 'Boiled eggs layered with fragrant spiced biryani rice', price: 160, image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=600&auto=format&fit=crop', category_id: 2, vegetarian: 0 },
          { name: 'Chicken 65', description: 'Spicy, deep-fried chicken starter coated in Andhra spices', price: 180, image_url: 'https://www.shutterstock.com/image-photo/chicken-65-spicy-deep-fried-600nw-1950502363.jpg', category_id: 2, vegetarian: 0 },
          { name: 'Chicken Lollipop', description: 'Crispy fried chicken winglets served with schezwan sauce', price: 200, image_url: 'https://www.indianhealthyrecipes.com/wp-content/uploads/2021/12/chicken-lollipop.jpg', category_id: 2, vegetarian: 0 },
          { name: 'Chicken Tikka', description: 'Juicy chicken chunks marinated in yogurt and spices, charcoal grilled', price: 220, image_url: 'https://flavorquotient.com/wp-content/uploads/2024/04/Chicken-Tikka-Kebab-FQ-4-3896.jpg', category_id: 2, vegetarian: 0 },
          { name: 'Fish Fry', description: 'Crispy masala coated pan fried fish fillet', price: 250, image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTu6ns-0A3tySsD-hgu9hEyJF7yedQ6DhTapA&s', category_id: 2, vegetarian: 0 },
          { name: 'Chicken Popcorn', description: 'Bite-sized crunchy chicken nuggets', price: 150, image_url: 'https://thumbs.dreamstime.com/b/popcorn-chicken-dish-consisting-small-bite-sized-pieces-have-been-breaded-fried-closeup-slate-table-230666188.jpg', category_id: 2, vegetarian: 0 },
          { name: 'Chicken Momos', description: 'Steamed dumplings filled with minced spiced chicken', price: 120, image_url: 'https://png.pngtree.com/png-vector/20250816/ourmid/pngtree-indian-street-style-momos-with-sauce-design-png-image_16994521.webp', category_id: 2, vegetarian: 0 },
          { name: 'Tandoori Chicken', description: 'Whole chicken legs marinated in yogurt spices and roasted in tandoor', price: 260, image_url: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?q=80&w=600&auto=format&fit=crop', category_id: 2, vegetarian: 0 },
          { name: 'Chilli Chicken', description: 'Indo-Chinese boneless chicken tossed with onions and green chillies', price: 210, image_url: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?q=80&w=600&auto=format&fit=crop', category_id: 2, vegetarian: 0 },
          { name: 'Apollo Fish', description: 'Spicy batter fried fish strips tossed in curry leaves masala', price: 260, image_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=600&auto=format&fit=crop', category_id: 2, vegetarian: 0 },

          // Egg
          { name: 'Omelette', description: 'Classic 2-egg fluffy omelette with onions and green chillies', price: 60, image_url: 'https://www.healthyfood.com/wp-content/uploads/2018/02/Basic-omelette.jpg', category_id: 3, vegetarian: 0 },
          { name: 'Egg Curry', description: 'Boiled eggs cooked in rich spicy onion-tomato gravy', price: 120, image_url: 'https://www.whiskaffair.com/wp-content/uploads/2020/04/Kerala-Style-Egg-Curry-2-3.jpg', category_id: 3, vegetarian: 0 },
          { name: 'Boiled Eggs', description: 'Two hard boiled eggs seasoned with pepper and salt', price: 40, image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQpyu1JZQpkWcBulUrC-m1YHeuCnTK9UJbO9A&s', category_id: 3, vegetarian: 0 },
          { name: 'Egg Bhurji', description: 'Spiced Indian style scrambled eggs with onions and coriander', price: 80, image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=600&auto=format&fit=crop', category_id: 3, vegetarian: 0 },
          { name: 'Egg Roast', description: 'Hard boiled eggs tossed in thick spicy Kerala style onion gravy', price: 110, image_url: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?q=80&w=600&auto=format&fit=crop', category_id: 3, vegetarian: 0 },

          // Beverages
          { name: 'Coco Cola', description: 'Chilled 500ml Coca Cola bottle', price: 40, image_url: 'https://c8.alamy.com/comp/2H1JR48/stuttgart-germany-january-17-2021-coca-cola-coca-cola-coke-zero-sugar-in-a-bottle-lemonade-soft-drink-on-ice-cubes-portrait-format-in-stuttgart-2H1JR48.jpg', category_id: 4, vegetarian: 1 },
          { name: 'Sprite', description: 'Refreshing 500ml lemon-lime Sprite bottle', price: 30, image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRgownpj0W-udzxsQXfC__AAKsqT5oeVyqAVQ&s', category_id: 4, vegetarian: 1 },
          { name: 'Thumbs Up', description: 'Strong charged 500ml Thumbs Up bottle', price: 30, image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQITQD5B4KUrFdIunpDLtestKdmJnCAaR2oyg&s', category_id: 4, vegetarian: 1 },
          { name: 'Fanta', description: 'Chilled 500ml orange Fanta bottle', price: 35, image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=600&auto=format&fit=crop', category_id: 4, vegetarian: 1 },
          { name: 'Pepsi', description: 'Refreshing chilled 500ml Pepsi bottle', price: 40, image_url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?q=80&w=600&auto=format&fit=crop', category_id: 4, vegetarian: 1 },

          // Juices
          { name: 'Mango Juice', description: 'Fresh sweet pulp mango juice', price: 60, image_url: 'https://vaya.in/recipes/wp-content/uploads/2018/02/mango-frooti.jpg', category_id: 5, vegetarian: 1 },
          { name: 'Grape Juice', description: 'Chilled fresh black grape juice', price: 50, image_url: 'https://img.freepik.com/premium-photo/refreshing-minimal-style-green-grape-juice-glass-ai-generated_804788-36672.jpg', category_id: 5, vegetarian: 1 },
          { name: 'Watermelon Juice', description: 'Freshly squeezed cooling watermelon juice', price: 40, image_url: 'https://media.istockphoto.com/id/485524950/tr/foto%C4%9Fraf/glass-of-fresh-watermelon-juice-on-wood.jpg?s=612x612&w=0&k=20&c=J_hN3T0DjhlDIAaEQ-eP4Al7oI3v133qWwmX0PvCrOw=', category_id: 5, vegetarian: 1 },
          { name: 'Orange Juice', description: 'Freshly squeezed pulp orange juice', price: 60, image_url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?q=80&w=600&auto=format&fit=crop', category_id: 5, vegetarian: 1 },
          { name: 'Chocolate Milkshake', description: 'Rich creamy chocolate thick shake topped with syrup', price: 90, image_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=600&auto=format&fit=crop', category_id: 5, vegetarian: 1 },

          // Desserts
          { name: 'Gulab Jamun', description: 'Warm soft khoya dumplings soaked in rose sugar syrup', price: 60, image_url: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?q=80&w=600&auto=format&fit=crop', category_id: 6, vegetarian: 1 },
          { name: 'Sizzling Brownie', description: 'Warm chocolate fudge brownie with vanilla ice cream on sizzling plate', price: 150, image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?q=80&w=600&auto=format&fit=crop', category_id: 6, vegetarian: 1 },
          { name: 'Vanilla Ice Cream', description: 'Double scoop classic Madagascar vanilla bean ice cream', price: 50, image_url: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?q=80&w=600&auto=format&fit=crop', category_id: 6, vegetarian: 1 },
          { name: 'Butterscotch Ice Cream', description: 'Creamy butterscotch ice cream studded with crunchy praline bits', price: 70, image_url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=600&auto=format&fit=crop', category_id: 6, vegetarian: 1 }
        ];

        const stmt = db.prepare('INSERT INTO food_items (name, description, price, image_url, category_id, vegetarian) VALUES (?, ?, ?, ?, ?, ?)');
        initialFood.forEach(item => {
          stmt.run(item.name, item.description, item.price, item.image_url, item.category_id, item.vegetarian);
        });
        stmt.finalize();
        console.log('Seeded relational food_items database.');
      }
    });
  });

  // 4. Orders Table
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT NOT NULL,
      subtotal REAL NOT NULL,
      tax REAL DEFAULT 0,
      delivery_fee REAL DEFAULT 30,
      discount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      order_status TEXT DEFAULT 'Pending',
      payment_status TEXT DEFAULT 'Pending',
      delivery_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // 5. Order Items Table
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      food_item_id INTEGER,
      food_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders (id),
      FOREIGN KEY (food_item_id) REFERENCES food_items (id)
    )
  `);

  // 6. Payments Table
  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      transaction_id TEXT,
      amount REAL NOT NULL,
      payment_status TEXT DEFAULT 'Pending',
      paid_at DATETIME,
      FOREIGN KEY (order_id) REFERENCES orders (id)
    )
  `);

  // 7. Reviews & Ratings Table
  db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT NOT NULL,
      food_item_id INTEGER NOT NULL,
      order_id INTEGER,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (food_item_id) REFERENCES food_items (id),
      FOREIGN KEY (order_id) REFERENCES orders (id)
    )
  `);

  // 8. Notifications Table
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      type TEXT DEFAULT 'info',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

module.exports = db;
