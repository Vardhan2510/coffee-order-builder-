const order = {
  drink: "espresso",
  size: "medium",
  milk: "regular",
  extras: [],
  customerName: ""
};

let prices = {
  espresso: 2.50,
  latte: 3.80,
  cappuccino: 3.60,
  matcha: 4.00,
  chai: 3.40,
  small: 0.00,
  medium: 0.50,
  large: 1.00,
  extrashot: 0.75,
  vanilla: 0.60,
  caramel: 0.60,
  whipped: 0.50,
};

let drinkColours = {
  espresso: "#1e0c04",
  latte: "#7b4f2e",
  cappuccino: "#b07442",
  matcha: "#4a7c3f",
  chai: "#b5812a",
};

let sizeHeight = {
  small: "40%",
  medium: "65%",
  large: "90%",
};

const extraLabels = {
  extrashot: "Extra Shot",
  vanilla: "Vanilla Syrup",
  caramel: "Caramel Syrup",
  whipped: "Whipped Cream",
};

let activeOrderId = null;
let trackingInterval = null;
const cup = document.getElementById("cup");
const summary = document.getElementById("summary");
const serverStatus = document.getElementById("server-status");
const customerNameInput = document.getElementById("customer-name");
const btnPlaceOrder = document.getElementById("btn-place-order");
const orderSpinner = document.getElementById("order-spinner");
const trackerCard = document.getElementById("tracker-card");
const trackerOrderId = document.getElementById("tracker-order-id");
const trackerStatusPill = document.getElementById("tracker-status-pill");
const trackerProgressBar = document.getElementById("tracker-progress-bar");
const trackerCustomer = document.getElementById("tracker-customer");
const btnDismissTracker = document.getElementById("btn-dismiss-tracker");
const btnToggleHistory = document.getElementById("btn-toggle-history");
const historyBackdrop = document.getElementById("history-backdrop");
const btnCloseHistory = document.getElementById("btn-close-history");
const historyList = document.getElementById("history-list");
const historyCountBadge = document.getElementById("history-count");
const toastContainer = document.getElementById("toast-container");

async function initializeMenuFromBackend() {
  try {
    const res = await fetch('/api/menu');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    if (data.success && data.data) {
      const menu = data.data;
      Object.keys(menu.drinks).forEach(d => {
        prices[d] = menu.drinks[d].price;
        if (menu.drinks[d].color) drinkColours[d] = menu.drinks[d].color;
      });

      Object.keys(menu.sizes).forEach(s => {
        prices[s] = menu.sizes[s].price;
        if (menu.sizes[s].height) sizeHeight[s] = menu.sizes[s].height;
      });

      Object.keys(menu.extras).forEach(e => {
        prices[e] = menu.extras[e].price;
        extraLabels[e] = menu.extras[e].label;
      });

      setServerOnline(true);
      refreshOrderCount();
    }
  } catch (err) {
    console.warn("Backend /api/menu unavailable, using fallback menu defaults.", err);
    setServerOnline(false);
  } finally {
    updateCup();
    updateSummary();
  }
}

function setServerOnline(isOnline) {
  if (!serverStatus) return;
  const dot = serverStatus.querySelector('.status-dot');
  const text = serverStatus.querySelector('.status-text');
  if (isOnline) {
    dot.className = 'status-dot online';
    text.textContent = 'API Connected';
  } else {
    dot.className = 'status-dot offline';
    text.textContent = 'Offline Mode';
  }
}

function updateCup() {
  if (cup && drinkColours[order.drink]) {
    cup.style.setProperty("--fill-colour", drinkColours[order.drink]);
  }
  if (cup && sizeHeight[order.size]) {
    cup.style.setProperty("--fill-height", sizeHeight[order.size]);
  }

  ["extrashot", "vanilla", "caramel", "whipped"].forEach((extra) => {
    const badge = document.getElementById("badge-" + extra);
    if (badge) {
      badge.classList.toggle("visible", order.extras.includes(extra));
    }
  });
}

function updateSummary() {
  const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : "";
  const milkLabel =
    order.milk === "none" ? "No Milk" : cap(order.milk) + " Milk";

  let total = (prices[order.drink] || 0) + (prices[order.size] || 0);
  order.extras.forEach((e) => {
    total += prices[e] || 0;
  });

  const extraRows = order.extras
    .map(
      (e) => `
      <div class="summary-row">
        <span>${extraLabels[e] || cap(e)}</span>
        <span>+$${(prices[e] || 0).toFixed(2)}</span>
      </div>`,
    )
    .join("");

  summary.innerHTML = `
    <h3>Your Order</h3>
    <div class="summary-row">
      <span>${cap(order.drink)}</span>
      <span>$${(prices[order.drink] || 0).toFixed(2)}</span>
    </div>
    <div class="summary-row">
      <span>${cap(order.size)}</span>
      <span>${(prices[order.size] || 0) > 0 ? "+$" + prices[order.size].toFixed(2) : "—"}</span>
    </div>
    <div class="summary-row">
      <span>${milkLabel}</span>
      <span>—</span>
    </div>
    ${extraRows}
    <hr class="summary-divider" />
    <div class="summary-total">
      <span>Total</span>
      <span>$${total.toFixed(2)}</span>
    </div>
  `;
}

document.querySelectorAll('input[name="drink"]').forEach((input) => {
  input.addEventListener("change", function () {
    order.drink = this.value;
    updateCup();
    updateSummary();
  });
});

document.querySelectorAll('input[name="size"]').forEach((input) => {
  input.addEventListener("change", function () {
    order.size = this.value;
    updateCup();
    updateSummary();
  });
});

document.querySelectorAll('input[name="milk"]').forEach((input) => {
  input.addEventListener("change", function () {
    order.milk = this.value;
    updateCup();
    updateSummary();
  });
});

document.querySelectorAll('input[name="extras"]').forEach((input) => {
  input.addEventListener("change", function () {
    if (this.checked) {
      if (!order.extras.includes(this.value)) {
        order.extras.push(this.value);
      }
    } else {
      const i = order.extras.indexOf(this.value);
      if (i > -1) order.extras.splice(i, 1);
    }
    updateCup();
    updateSummary();
  });
});

btnPlaceOrder.addEventListener("click", async () => {
  const customerName = customerNameInput.value.trim() || "Guest";  
  const payload = {
    drink: order.drink,
    size: order.size,
    milk: order.milk,
    extras: order.extras,
    customerName: customerName
  };

  btnPlaceOrder.disabled = true;
  orderSpinner.classList.remove("hidden");
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to place order.');
    }

    const createdOrder = result.order;
    showToast(`☕ Order #${createdOrder.id} placed! Total: $${createdOrder.pricing.total.toFixed(2)}`, 'success');
    startTrackingOrder(createdOrder);
    refreshOrderCount();

  } catch (err) {
    console.error("Order submission failed:", err);
    showToast(`Error: ${err.message || 'Could not connect to server.'}`, 'error');
  } finally {
    btnPlaceOrder.disabled = false;
    orderSpinner.classList.add("hidden");
  }
});

function startTrackingOrder(orderData) {
  activeOrderId = orderData.id;
  trackerCard.classList.remove("hidden");
  trackerOrderId.textContent = `#${orderData.id}`;
  trackerCustomer.textContent = `Customer: ${orderData.customerName || 'Guest'}`;
  
  renderTrackerStatus(orderData.status);
  if (trackingInterval) clearInterval(trackingInterval);
  trackingInterval = setInterval(async () => {
    if (!activeOrderId) return;
    try {
      const res = await fetch(`/api/orders/${activeOrderId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.order) {
        renderTrackerStatus(data.order.status);
        if (data.order.status === 'completed' || data.order.status === 'cancelled') {
          clearInterval(trackingInterval);
        }
      }
    } catch (e) {
      console.warn("Status polling error:", e);
    }
  }, 2500);
}

function renderTrackerStatus(status) {
  const stepReceived = document.getElementById("step-received");
  const stepBrewing = document.getElementById("step-brewing");
  const stepReady = document.getElementById("step-ready");
  trackerStatusPill.className = `tracker-status-pill ${status}`;
  trackerStatusPill.textContent = status.toUpperCase();
  stepReceived.className = "step active";
  stepBrewing.className = "step";
  stepReady.className = "step";

  if (status === 'received') {
    trackerProgressBar.style.width = '33%';
  } else if (status === 'brewing') {
    trackerProgressBar.style.width = '66%';
    stepBrewing.classList.add("active");
  } else if (status === 'ready' || status === 'completed') {
    trackerProgressBar.style.width = '100%';
    stepBrewing.classList.add("active");
    stepReady.classList.add("active");
  }
}

btnDismissTracker.addEventListener("click", () => {
  trackerCard.classList.add("hidden");
  if (trackingInterval) clearInterval(trackingInterval);
  activeOrderId = null;
});

async function refreshOrderCount() {
  try {
    const res = await fetch('/api/orders');
    if (res.ok) {
      const data = await res.json();
      if (data.success && historyCountBadge) {
        historyCountBadge.textContent = data.count || 0;
      }
    }
  } catch (err) {
    // Ignore offline error
  }
}

async function loadHistory() {
  historyList.innerHTML = '<div class="loading-state">Loading order history...</div>';
  try {
    const res = await fetch('/api/orders');
    if (!res.ok) throw new Error("Could not fetch orders");
    const data = await res.json();

    if (!data.orders || data.orders.length === 0) {
      historyList.innerHTML = '<div class="empty-state">No past orders yet. Place your first one!</div>';
      return;
    }

    historyList.innerHTML = data.orders.map(o => {
      const timeStr = new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const extrasStr = o.extras && o.extras.length ? ` + ${o.extras.map(e => extraLabels[e] || e).join(', ')}` : '';
      return `
        <div class="history-card">
          <div class="history-card-header">
            <span class="history-id">#${o.id} (${o.customerName || 'Guest'})</span>
            <span class="history-time">${timeStr}</span>
          </div>
          <div class="history-desc">
            ${capitalize(o.size)} ${capitalize(o.drink)} (${o.milk === 'none' ? 'No Milk' : capitalize(o.milk) + ' Milk'})${extrasStr}
          </div>
          <div class="history-footer">
            <span class="history-total">$${(o.pricing?.total || 0).toFixed(2)}</span>
            <button class="btn-reorder" onclick="reorderItem('${o.drink}', '${o.size}', '${o.milk}', '${(o.extras || []).join(',')}')">
              ↻ Re-order
            </button>
          </div>
        </div>
      `;
    }).join("");

    if (historyCountBadge) historyCountBadge.textContent = data.orders.length;
  } catch (err) {
    historyList.innerHTML = `<div class="empty-state">Failed to load history: ${err.message}</div>`;
  }
}

function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

window.reorderItem = function(drink, size, milk, extrasCsv) {
  const extras = extrasCsv ? extrasCsv.split(',').filter(Boolean) : [];

  order.drink = drink;
  order.size = size;
  order.milk = milk;
  order.extras = extras;

  const drinkRadio = document.querySelector(`input[name="drink"][value="${drink}"]`);
  if (drinkRadio) drinkRadio.checked = true;

  const sizeRadio = document.querySelector(`input[name="size"][value="${size}"]`);
  if (sizeRadio) sizeRadio.checked = true;

  const milkRadio = document.querySelector(`input[name="milk"][value="${milk}"]`);
  if (milkRadio) milkRadio.checked = true;

  document.querySelectorAll('input[name="extras"]').forEach(cb => {
    cb.checked = extras.includes(cb.value);
  });

  updateCup();
  updateSummary();
  historyBackdrop.classList.add("hidden");
  showToast(`Loaded ${capitalize(size)} ${capitalize(drink)} recipe!`, 'success');
};

btnToggleHistory.addEventListener("click", () => {
  historyBackdrop.classList.remove("hidden");
  loadHistory();
});

btnCloseHistory.addEventListener("click", () => {
  historyBackdrop.classList.add("hidden");
});

historyBackdrop.addEventListener("click", (e) => {
  if (e.target === historyBackdrop) {
    historyBackdrop.classList.add("hidden");
  }
});

function showToast(message, type = 'success') {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

initializeMenuFromBackend();
