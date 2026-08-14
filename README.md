# ☕ Coffee Order Builder - Full Stack Application

A full-stack interactive Coffee Ordering system featuring a responsive dynamic frontend with live visual cup rendering and an Express.js REST API backend with order persistence and automated barista status progression.

---

## 🚀 Quick Start

### 1. Start the Server
```bash
# Navigate to the project directory
cd C:\Users\ADMIN\.gemini\antigravity\scratch\coffee-order-app

# Install dependencies (if not already installed)
npm install

# Start the server
npm start
```

### 2. Open in Browser
Visit **[http://localhost:3000](http://localhost:3000)** in your web browser.

---

## 🛠️ API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/menu` | Returns drink catalog, sizes, milk choices, extras, prices, and color codes. |
| `POST` | `/api/orders` | Places a new order with server-side validation and price computation. |
| `GET` | `/api/orders` | Retrieves recent orders from persistent storage (`data/orders.json`). |
| `GET` | `/api/orders/:id` | Returns real-time status and item details for a specific order. |
| `PATCH` | `/api/orders/:id/status` | Updates order preparation status (`received`, `brewing`, `ready`, `completed`). |
| `DELETE` | `/api/orders/:id` | Cancels/removes an order from storage. |

---

## 📁 Project Structure

```
coffee-order-app/
├── package.json         # Project metadata and dependencies (express, cors)
├── server.js            # Express server, REST endpoints, simulated barista engine
├── data/
│   └── orders.json      # Persistent JSON database for orders
├── public/
│   ├── index.html       # UI with order builder, tracking widget, and drawer
│   ├── style.css        # Dark theme styling, animations, responsive layout
│   └── script.js        # Dynamic API sync, order submission, live tracking
└── README.md            # Documentation and instructions
```
