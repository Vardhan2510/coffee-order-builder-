const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data folder and orders.json exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(ORDERS_FILE)) {
  const initialOrders = [
    {
      id: "COF-1001",
      customerName: "Barista Special",
      drink: "latte",
      size: "large",
      milk: "oat",
      extras: ["caramel", "whipped"],
      pricing: {
        drink: 3.80,
        size: 1.00,
        milk: 0.00,
        extras: [
          { key: "caramel", label: "Caramel Syrup", price: 0.60 },
          { key: "whipped", label: "Whipped Cream", price: 0.50 }
        ],
        subtotal: 5.90,
        tax: 0.47,
        total: 6.37
      },
      status: "completed",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      estimatedSeconds: 20
    }
  ];
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(initialOrders, null, 2), 'utf-8');
}

// Menu Definition & Metadata
const MENU = {
  drinks: {
    espresso: { label: "Espresso", price: 2.50, color: "#1e0c04", prepTimeSec: 10 },
    latte: { label: "Latte", price: 3.80, color: "#7b4f2e", prepTimeSec: 18 },
    cappuccino: { label: "Cappuccino", price: 3.60, color: "#b07442", prepTimeSec: 18 },
    matcha: { label: "Matcha", price: 4.00, color: "#4a7c3f", prepTimeSec: 22 },
    chai: { label: "Chai", price: 3.40, color: "#b5812a", prepTimeSec: 15 }
  },
  sizes: {
    small: { label: "Small", price: 0.00, height: "40%" },
    medium: { label: "Medium", price: 0.50, height: "65%" },
    large: { label: "Large", price: 1.00, height: "90%" }
  },
  milks: {
    regular: { label: "Regular Milk", price: 0.00 },
    oat: { label: "Oat Milk", price: 0.00 },
    almond: { label: "Almond Milk", price: 0.00 },
    soy: { label: "Soy Milk", price: 0.00 },
    none: { label: "No Milk", price: 0.00 }
  },
  extras: {
    extrashot: { label: "Extra Shot", price: 0.75, badge: "＋" },
    vanilla: { label: "Vanilla Syrup", price: 0.60, badge: "〜" },
    caramel: { label: "Caramel Syrup", price: 0.60, badge: "✦" },
    whipped: { label: "Whipped Cream", price: 0.50, badge: "☁" }
  },
  taxRate: 0.08 // 8% sales tax
};

// Helper Functions for JSON storage
function readOrders() {
  try {
    const raw = fs.readFileSync(ORDERS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading orders file:', err);
    return [];
  }
}

function writeOrders(orders) {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing orders file:', err);
  }
}

// Generate unique order code e.g. COF-7429
function generateOrderId() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `COF-${num}`;
}

// Order Status Progression Simulator
// Automatically moves status: received -> brewing -> ready -> completed
function simulateOrderProgression(orderId) {
  setTimeout(() => {
    updateOrderStatus(orderId, 'brewing');
  }, 4000);

  setTimeout(() => {
    updateOrderStatus(orderId, 'ready');
  }, 12000);

  setTimeout(() => {
    updateOrderStatus(orderId, 'completed');
  }, 28000);
}

function updateOrderStatus(orderId, newStatus) {
  const orders = readOrders();
  const order = orders.find(o => o.id === orderId);
  if (order && order.status !== 'cancelled') {
    order.status = newStatus;
    order.updatedAt = new Date().toISOString();
    writeOrders(orders);
  }
}

// -------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------

// 1. GET /api/menu - Menu catalog, prices & styling metadata
app.get('/api/menu', (req, res) => {
  res.json({
    success: true,
    data: MENU
  });
});

// 2. POST /api/orders - Create & validate a new coffee order
app.post('/api/orders', (req, res) => {
  const { drink, size, milk, extras = [], customerName } = req.body;

  // Validation
  if (!drink || !MENU.drinks[drink]) {
    return res.status(400).json({
      success: false,
      error: `Invalid or missing drink choice: ${drink}`
    });
  }

  if (!size || !MENU.sizes[size]) {
    return res.status(400).json({
      success: false,
      error: `Invalid or missing size: ${size}`
    });
  }

  if (!milk || !MENU.milks[milk]) {
    return res.status(400).json({
      success: false,
      error: `Invalid or missing milk choice: ${milk}`
    });
  }

  const validExtras = Array.isArray(extras)
    ? extras.filter(e => MENU.extras[e])
    : [];

  // Calculate pricing server-side
  const drinkPrice = MENU.drinks[drink].price;
  const sizePrice = MENU.sizes[size].price;
  const milkPrice = MENU.milks[milk].price;
  
  const extrasBreakdown = validExtras.map(key => ({
    key,
    label: MENU.extras[key].label,
    price: MENU.extras[key].price
  }));

  const extrasTotal = extrasBreakdown.reduce((sum, item) => sum + item.price, 0);
  const subtotal = drinkPrice + sizePrice + milkPrice + extrasTotal;
  const tax = Number((subtotal * MENU.taxRate).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));

  const newOrder = {
    id: generateOrderId(),
    customerName: customerName && customerName.trim() ? customerName.trim() : 'Guest',
    drink,
    drinkLabel: MENU.drinks[drink].label,
    size,
    sizeLabel: MENU.sizes[size].label,
    milk,
    milkLabel: MENU.milks[milk].label,
    extras: validExtras,
    pricing: {
      drink: drinkPrice,
      size: sizePrice,
      milk: milkPrice,
      extras: extrasBreakdown,
      subtotal: Number(subtotal.toFixed(2)),
      tax,
      total
    },
    status: 'received', // 'received' | 'brewing' | 'ready' | 'completed' | 'cancelled'
    createdAt: new Date().toISOString(),
    estimatedSeconds: (MENU.drinks[drink].prepTimeSec || 15) + (validExtras.length * 3)
  };

  const orders = readOrders();
  orders.unshift(newOrder); // Add to front of list
  writeOrders(orders);

  // Trigger automated status progression simulation
  simulateOrderProgression(newOrder.id);

  res.status(201).json({
    success: true,
    message: "Order placed successfully!",
    order: newOrder
  });
});

// 3. GET /api/orders - List recent orders
app.get('/api/orders', (req, res) => {
  const limit = parseInt(req.query.limit) || 15;
  const orders = readOrders();
  res.json({
    success: true,
    count: orders.length,
    orders: orders.slice(0, limit)
  });
});

// 4. GET /api/orders/:id - Get live tracking status for an order
app.get('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const orders = readOrders();
  const order = orders.find(o => o.id.toLowerCase() === id.toLowerCase());

  if (!order) {
    return res.status(404).json({
      success: false,
      error: `Order with ID ${id} not found.`
    });
  }

  res.json({
    success: true,
    order
  });
});

// 5. PATCH /api/orders/:id/status - Update order status (Barista controls)
app.patch('/api/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const allowedStatuses = ['received', 'brewing', 'ready', 'completed', 'cancelled'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`
    });
  }

  const orders = readOrders();
  const order = orders.find(o => o.id.toLowerCase() === id.toLowerCase());

  if (!order) {
    return res.status(404).json({
      success: false,
      error: `Order with ID ${id} not found.`
    });
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();
  writeOrders(orders);

  res.json({
    success: true,
    message: `Order status updated to '${status}'`,
    order
  });
});

// 6. DELETE /api/orders/:id - Cancel an order
app.delete('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const orders = readOrders();
  const index = orders.findIndex(o => o.id.toLowerCase() === id.toLowerCase());

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: `Order with ID ${id} not found.`
    });
  }

  const [removed] = orders.splice(index, 1);
  writeOrders(orders);

  res.json({
    success: true,
    message: `Order ${id} removed successfully.`,
    order: removed
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`☕ Coffee Order Builder server running on http://localhost:${PORT}`);
  console.log(`📡 API Endpoints ready: /api/menu, /api/orders`);
});
