// 🌐 BACKEND API CONFIG
const API_BASE = 'http://localhost:5000/api';

let currentUser = null;
let currentRating = 5;
let currentReviewFoodId = null;
let currentReviewOrderId = null;
let editingFoodId = null;
let appliedDiscountAmount = 0;
let currentCustomizingFood = null;

// 🔥 INIT
function init() {
  loadCart();
  loadWishlist();
  checkAuthSession();

  let searchInput = document.getElementById("search");
  if (searchInput) {
    searchInput.addEventListener("keyup", filterFoodItems);
  }

  fetchNotifications();
  setInterval(fetchNotifications, 15000);
}

window.onload = function() {
  init();
  updateAuthUI();
  document.getElementById("home").style.display = "block";
  checkAuthPage();
};

function toggleSidebar() { document.getElementById("sidebar").classList.toggle("active"); }
function toggleCart() { document.getElementById("cartPanel").classList.toggle("active"); }

function goTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

// 🔐 AUTH & SESSION
function checkAuthSession() {
  const savedLoggedIn = localStorage.getItem("loggedIn");
  const savedUser = localStorage.getItem("user");
  const savedRole = localStorage.getItem("role") || "customer";

  if (savedLoggedIn === "true" && savedUser) {
    currentUser = { username: savedUser, role: savedRole };
  } else {
    currentUser = null;
  }
}

function updateAuthUI() {
  const authSec = document.getElementById("authSection");
  const adminLink = document.getElementById("adminNavLink");
  const sidebarAdminBtn = document.getElementById("sidebarAdminBtn");

  if (currentUser) {
    authSec.innerHTML = `
      <span class="welcome" style="cursor:pointer;" onclick="openProfileModal()">👋 Hi, ${currentUser.username}</span>
      <button onclick="logout()">Logout</button>
    `;

    if (currentUser.role === "admin") {
      if (adminLink) adminLink.style.display = "inline-block";
      if (sidebarAdminBtn) sidebarAdminBtn.style.display = "block";
    } else {
      if (adminLink) adminLink.style.display = "none";
      if (sidebarAdminBtn) sidebarAdminBtn.style.display = "none";
    }
  } else {
    authSec.innerHTML = `
      <button onclick="openSignup()">Signup</button>
      <button onclick="openLogin()">Login</button>
    `;
    if (adminLink) adminLink.style.display = "none";
    if (sidebarAdminBtn) sidebarAdminBtn.style.display = "none";
  }
}

function checkAuthPage() {
  const loggedIn = localStorage.getItem("loggedIn");
  if (loggedIn === "true") {
    document.getElementById("authPage").style.display = "none";
    document.getElementById("mainSite").style.display = "block";
  } else {
    document.getElementById("authPage").style.display = "flex";
    document.getElementById("mainSite").style.display = "none";
  }
}

function openSignup() { document.getElementById("signupPopup").style.display = "flex"; }
function closeSignup() { document.getElementById("signupPopup").style.display = "none"; }
function openLogin() { document.getElementById("loginPopup").style.display = "flex"; }
function closeLogin() { document.getElementById("loginPopup").style.display = "none"; }

function showSuccess(msg) {
  document.getElementById("successText").innerText = msg;
  document.getElementById("successPopup").style.display = "flex";
}
function closeSuccess() { document.getElementById("successPopup").style.display = "none"; }

async function signup() {
  const u = document.getElementById("suUser").value.trim();
  const p = document.getElementById("suPass").value.trim();

  if (!u || !p) return showSuccess("❌ Please fill all fields");

  try {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p })
    });
    const data = await res.json();
    if (!data.success) return showSuccess("❌ " + (data.message || "Signup failed"));
    currentUser = { username: u, role: data.role || "customer" };
  } catch (err) {
    currentUser = { username: u, role: "customer" };
  }

  localStorage.setItem("user", u);
  localStorage.setItem("pass", p);
  localStorage.setItem("role", currentUser.role);
  localStorage.setItem("loggedIn", "true");

  closeSignup();
  updateAuthUI();
  checkAuthPage();
  showSuccess("🎉 Account Created & Logged In!");
}

async function login() {
  const u = document.getElementById("liUser").value.trim();
  const p = document.getElementById("liPass").value.trim();
  if (!u || !p) return showSuccess("❌ Please fill all fields");

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p })
    });
    const data = await res.json();

    if (data.success && data.user) {
      currentUser = { username: data.user.username, role: data.user.role };
      localStorage.setItem("user", data.user.username);
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("loggedIn", "true");

      closeLogin();
      updateAuthUI();
      checkAuthPage();
      showSuccess(`✅ Welcome back, ${data.user.username}!`);
      return;
    }
  } catch (err) {}

  const savedU = localStorage.getItem("user");
  const savedP = localStorage.getItem("pass");

  if (u === savedU && p === savedP) {
    currentUser = { username: u, role: localStorage.getItem("role") || "customer" };
    localStorage.setItem("loggedIn", "true");
    closeLogin();
    updateAuthUI();
    checkAuthPage();
    showSuccess("✅ Login Successful");
  } else {
    showSuccess("❌ Invalid Credentials");
  }
}

async function authLogin() {
  const u = document.getElementById("authUser").value.trim();
  const p = document.getElementById("authPass").value.trim();
  document.getElementById("liUser").value = u;
  document.getElementById("liPass").value = p;
  await login();
}

async function authSignup() {
  const u = document.getElementById("authUser").value.trim();
  const p = document.getElementById("authPass").value.trim();
  document.getElementById("suUser").value = u;
  document.getElementById("suPass").value = p;
  await signup();
}

function logout() {
  localStorage.removeItem("loggedIn");
  currentUser = null;
  checkAuthPage();
  updateAuthUI();
  showSuccess("👋 Logged Out");
}


// 🛒 CART MANAGEMENT
function add(n, p) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  const existing = cart.find(item => item.n === n);
  if (existing) {
    existing.quantity = (existing.quantity || 1) + 1;
  } else {
    cart.push({ n, p, quantity: 1 });
  }
  localStorage.setItem("cart", JSON.stringify(cart));

  loadCart();
  toggleCart();
}

function loadCart() {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  let html = "<h2>Your Cart</h2>";
  let total = 0;
  let totalQty = 0;

  cart.forEach((item, index) => {
    const qty = item.quantity || 1;
    const itemTotal = item.p * qty;
    total += itemTotal;
    totalQty += qty;

    html += `
      <div style="margin-bottom:12px; background:#f8fafc; padding:10px; border-radius:10px; border:1px solid #e2e8f0;">
        <div style="font-weight:600;">${item.n}</div>
        <div style="font-size:13px; color:#64748b;">
          ₹${item.p} x ${qty} = <strong>₹${itemTotal}</strong>
          <button onclick="removeItem(${index})" style="float:right; border:none; background:none; cursor:pointer;">❌</button>
        </div>
      </div>
    `;
  });

  html += `<hr style="margin:15px 0;"><div style="display:flex; justify-content:space-between; font-weight:700; font-size:18px;"><span>Total:</span><span>₹${total}</span></div>`;

  if (cart.length > 0) {
    html += `<button onclick="openCheckoutModal()" class="order-btn">Proceed to Checkout 💳</button>`;
  } else {
    html += `<p style="text-align:center; color:#64748b; margin-top:20px;">Your cart is empty 🍽️</p>`;
  }

  document.getElementById("cartPanel").innerHTML =
    `<button class="close-cart" onclick="toggleCart()">Close ❌</button>` + html;

  const badge = document.getElementById("cartCountBadge");
  if (badge) badge.innerText = totalQty;
}

function removeItem(index) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  loadCart();
}


// ❤️ WISHLIST SYSTEM
function toggleWishlist(name, price) {
  let list = JSON.parse(localStorage.getItem("wishlist")) || [];
  const idx = list.findIndex(i => i.name === name);
  if (idx > -1) {
    list.splice(idx, 1);
    showSuccess(`Removed ${name} from Wishlist`);
  } else {
    list.push({ name, price });
    showSuccess(`❤️ Added ${name} to Wishlist`);
  }
  localStorage.setItem("wishlist", JSON.stringify(list));
  loadWishlist();
}

function loadWishlist() {
  let list = JSON.parse(localStorage.getItem("wishlist")) || [];
  const badge = document.getElementById("wishlistBadge");
  if (badge) badge.innerText = list.length;

  let html = '';
  if (list.length === 0) {
    html = '<p style="text-align:center; color:#64748b; padding:20px;">Your Wishlist is empty ❤️</p>';
  } else {
    list.forEach((item, index) => {
      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:10px; border-radius:12px; margin-bottom:8px; border:1px solid #e2e8f0;">
          <div><strong>${item.name}</strong> - ₹${item.price}</div>
          <div>
            <button onclick="add('${item.name}', ${item.price})" style="padding:4px 10px; background:#ff5200; color:white; border:none; border-radius:12px; cursor:pointer;">+ Add</button>
          </div>
        </div>
      `;
    });
  }
  document.getElementById("wishlistItemsList").innerHTML = html;
}

function toggleWishlistModal() {
  loadWishlist();
  const el = document.getElementById("wishlistModal");
  el.style.display = el.style.display === "flex" ? "none" : "flex";
}


// 🧂 FOOD CUSTOMIZATION
function openCustomizationModal(name, price) {
  currentCustomizingFood = { name, price };
  document.getElementById("custFoodName").innerText = name;
  document.getElementById("customizationModal").style.display = "flex";
}

function closeCustomizationModal() {
  document.getElementById("customizationModal").style.display = "none";
}

function confirmCustomizedAdd() {
  if (!currentCustomizingFood) return;
  const spice = document.getElementById("custSpice").value;
  const cheese = document.getElementById("addCheese").checked;
  const sauce = document.getElementById("addSauce").checked;

  let extra = 0;
  let customStr = ` (${spice}`;
  if (cheese) { extra += 30; customStr += `, Extra Cheese`; }
  if (sauce) { extra += 15; customStr += `, Extra Sauce`; }
  customStr += `)`;

  const finalName = currentCustomizingFood.name + customStr;
  const finalPrice = currentCustomizingFood.price + extra;

  add(finalName, finalPrice);
  closeCustomizationModal();
}


// 💳 CHECKOUT, COUPONS & ADDRESS
function openCheckoutModal() {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  if (cart.length === 0) return showSuccess("❌ Your cart is empty");

  appliedDiscountAmount = 0;
  document.getElementById("couponMsgText").innerText = "";
  document.getElementById("discountRow").style.display = "none";

  updateCheckoutCalculations();
  document.getElementById("checkoutModal").style.display = "flex";
}

function updateCheckoutCalculations() {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  let subtotal = 0;
  let itemsHtml = '';
  cart.forEach(item => {
    const qty = item.quantity || 1;
    const itemTotal = item.p * qty;
    subtotal += itemTotal;
    itemsHtml += `<div class="summary-line"><span>${item.n} x${qty}</span><span>₹${itemTotal.toFixed(2)}</span></div>`;
  });

  const tax = subtotal * 0.05;
  const delivery = 30.00;
  const total = Math.max(0, subtotal + tax + delivery - appliedDiscountAmount);

  document.getElementById("checkoutItemsList").innerHTML = itemsHtml;
  document.getElementById("coSubtotal").innerText = `₹${subtotal.toFixed(2)}`;
  document.getElementById("coTax").innerText = `₹${tax.toFixed(2)}`;
  document.getElementById("coDelivery").innerText = `₹${delivery.toFixed(2)}`;
  document.getElementById("coTotal").innerText = `₹${total.toFixed(2)}`;

  if (appliedDiscountAmount > 0) {
    document.getElementById("discountRow").style.display = "flex";
    document.getElementById("coDiscount").innerText = `-₹${appliedDiscountAmount.toFixed(2)}`;
  }
}

async function applyCouponCode() {
  const code = document.getElementById("couponCodeInput").value.trim();
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  let subtotal = 0;
  cart.forEach(item => subtotal += item.p * (item.quantity || 1));

  try {
    const res = await fetch(`${API_BASE}/coupons/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, subtotal })
    });
    const data = await res.json();
    if (data.success) {
      appliedDiscountAmount = data.discount;
      document.getElementById("couponMsgText").style.color = "#10b981";
      document.getElementById("couponMsgText").innerText = data.message;
      updateCheckoutCalculations();
    } else {
      document.getElementById("couponMsgText").style.color = "#ef4444";
      document.getElementById("couponMsgText").innerText = data.message;
    }
  } catch (err) {
    if (code.toUpperCase() === "FOOD50") {
      appliedDiscountAmount = 50;
      updateCheckoutCalculations();
      document.getElementById("couponMsgText").innerText = "Coupon FOOD50 Applied!";
    }
  }
}

function useSavedAddress(val) {
  const area = document.getElementById("coAddress");
  if (val === "Home") area.value = "123 Food Street, Andhra Pradesh";
  else if (val === "Work") area.value = "Tech Park, Hitech City, Hyderabad";
  else area.value = "";
}

function closeCheckoutModal() { document.getElementById("checkoutModal").style.display = "none"; }

async function submitCheckoutOrder() {
  const address = document.getElementById("coAddress").value.trim();
  const paymentMethod = document.getElementById("coPaymentMethod").value;
  const scheduleTime = document.getElementById("coScheduleTime").value;
  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  if (!address) return showSuccess("❌ Please enter a delivery address");
  const username = currentUser ? currentUser.username : "Guest";

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        items: cart,
        payment_method: paymentMethod,
        delivery_address: address,
        discount: appliedDiscountAmount,
        delivery_schedule: scheduleTime
      })
    });

    const data = await res.json();
    if (data.success) {
      localStorage.removeItem("cart");
      loadCart();
      closeCheckoutModal();
      toggleCart();
      openOrderTrackingModal(data.orderId);
      showSuccess(`🎉 Order #${data.orderId} Placed!`);
    } else {
      showSuccess("❌ " + (data.message || "Failed to place order"));
    }
  } catch (err) {
    showSuccess("🎉 Order Placed!");
    localStorage.removeItem("cart");
    loadCart();
    closeCheckoutModal();
  }
}


// 📦 TRACKING, REORDER & PRINT INVOICE
async function openOrderTrackingModal(orderId) {
  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}`);
    const data = await res.json();

    if (data.success && data.order) {
      const order = data.order;
      const statuses = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered'];
      const currentIndex = statuses.indexOf(order.order_status);

      let stepsHtml = '<div style="display:flex; justify-content:space-between; margin:20px 0; font-size:12px; text-align:center;">';
      statuses.forEach((st, idx) => {
        const active = idx <= currentIndex ? 'color:#ff5200; font-weight:700;' : 'color:#cbd5e1;';
        stepsHtml += `<div style="${active}"><div>●</div><div>${st}</div></div>`;
      });
      stepsHtml += '</div>';

      let itemsHtml = order.items.map(i => `<div class="summary-line"><span>${i.food_name} x${i.quantity}</span><span>₹${i.subtotal}</span></div>`).join('');

      const html = `
        <div id="invoicePrintArea">
          <div style="background:#fff3ec; padding:12px; border-radius:12px; border:1px solid #ffd0b3; margin-bottom:15px;">
            <strong>Order ID:</strong> #${order.id}<br>
            <strong>Status:</strong> <span style="color:#ff5200; font-weight:700;">${order.order_status}</span> | 
            <strong>Payment:</strong> ${order.payment_status} (${order.payment_method})
          </div>
          ${stepsHtml}
          <h4>Order Itemized Breakdown:</h4>
          ${itemsHtml}
          <hr style="margin:10px 0;">
          <div class="summary-line total-line"><span>Total Paid:</span><span>₹${order.total_amount}</span></div>
          <p style="font-size:13px; color:#64748b; margin-top:10px;">🚚 Delivery Address: ${order.delivery_address}</p>
        </div>
      `;

      document.getElementById("trackingDetails").innerHTML = html;
      document.getElementById("orderTrackingModal").style.display = "flex";
    }
  } catch (err) {}
}

function closeTrackingModal() { document.getElementById("orderTrackingModal").style.display = "none"; }

function printOrderInvoice() { window.print(); }

async function openMyOrdersModal() {
  if (!currentUser) { openLogin(); return showSuccess("Please login to view orders"); }

  try {
    const res = await fetch(`${API_BASE}/orders/my-orders?username=${currentUser.username}`);
    const data = await res.json();

    if (data.success) {
      let html = '';
      if (data.orders.length === 0) {
        html = '<p style="text-align:center; color:#64748b; padding:20px;">No orders found yet.</p>';
      } else {
        data.orders.forEach(order => {
          html += `
            <div class="order-history-card">
              <div style="display:flex; justify-content:space-between; font-weight:700;">
                <span>Order #${order.id}</span>
                <span style="color:#ff5200;">${order.order_status}</span>
              </div>
              <div style="font-size:13px; color:#64748b;">
                Date: ${new Date(order.created_at).toLocaleDateString()} | Total: <strong>₹${order.total_amount}</strong>
              </div>
              <div style="display:flex; gap:8px; margin-top:8px;">
                <button class="main-btn" style="padding:6px; font-size:12px;" onclick="openOrderTrackingModal(${order.id})">Track Order 📦</button>
                <button class="secondary-btn" style="padding:6px; font-size:12px;" onclick="reorderItems(${order.id})">Reorder 🔄</button>
                ${order.order_status === 'Delivered' ? `<button class="secondary-btn" style="padding:6px; font-size:12px;" onclick="openReviewModal(${order.id}, 1)">Write Review ⭐</button>` : ''}
              </div>
            </div>
          `;
        });
      }
      document.getElementById("myOrdersList").innerHTML = html;
      document.getElementById("myOrdersModal").style.display = "flex";
    }
  } catch (err) {}
}

function closeMyOrdersModal() { document.getElementById("myOrdersModal").style.display = "none"; }

async function reorderItems(orderId) {
  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}`);
    const data = await res.json();
    if (data.success && data.order && data.order.items) {
      data.order.items.forEach(i => add(i.food_name, i.price));
      closeMyOrdersModal();
      showSuccess("🔄 Past items added to cart!");
    }
  } catch (err) {}
}


// 👤 CUSTOMER PROFILE
function openProfileModal() {
  if (!currentUser) return openLogin();
  const html = `
    <p><strong>Username:</strong> ${currentUser.username}</p>
    <p><strong>Account Role:</strong> ${currentUser.role}</p>
    <p><strong>Saved Addresses:</strong> 123 Food Street, AP</p>
    <p><strong>Status:</strong> Active Member ✅</p>
  `;
  document.getElementById("profileDetailsText").innerHTML = html;
  document.getElementById("profileModal").style.display = "flex";
}
function closeProfileModal() { document.getElementById("profileModal").style.display = "none"; }


// ⭐ REVIEWS, FILTERS & NOTIFICATIONS
function openReviewModal(orderId, foodId) {
  currentReviewOrderId = orderId;
  currentReviewFoodId = foodId;
  currentRating = 5;
  document.getElementById("ratingValueText").innerText = "Rating: 5 Stars";
  document.getElementById("writeReviewModal").style.display = "flex";
}
function closeReviewModal() { document.getElementById("writeReviewModal").style.display = "none"; }

function setRating(val) {
  currentRating = val;
  document.getElementById("ratingValueText").innerText = `Rating: ${val} Stars`;
}

async function submitReview() {
  const comment = document.getElementById("reviewComment").value.trim();
  if (!currentUser) return openLogin();

  try {
    const res = await fetch(`${API_BASE}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: currentUser.username,
        food_item_id: currentReviewFoodId || 1,
        order_id: currentReviewOrderId,
        rating: currentRating,
        comment
      })
    });
    const data = await res.json();
    if (data.success) {
      showSuccess("⭐ Thank you for your review!");
      closeReviewModal();
    } else {
      showSuccess("❌ " + data.message);
    }
  } catch (err) {}
}

function filterByTag(tag) {
  const buttons = document.querySelectorAll(".chip-btn");
  buttons.forEach(b => b.classList.remove("active"));
  event.target.classList.add("active");

  const cards = document.querySelectorAll(".card");
  cards.forEach(card => {
    const cardTag = card.getAttribute("data-tag");
    if (tag === "All" || cardTag === tag) {
      card.style.display = "flex";
    } else {
      card.style.display = "none";
    }
  });
}

async function filterFoodItems() {
  const search = document.getElementById("search").value.toLowerCase().trim();
  const cards = document.querySelectorAll(".card");
  cards.forEach(card => {
    const titleEl = card.querySelector("h3");
    if (!titleEl) return;
    const name = titleEl.innerText.toLowerCase();
    if (search === "" || name.includes(search)) card.style.display = "flex";
    else card.style.display = "none";
  });
}

function resetFilters() {
  document.getElementById("search").value = "";
  document.getElementById("filterCategory").value = "All";
  document.getElementById("filterVeg").value = "All";
  document.getElementById("filterSort").value = "default";
  filterFoodItems();
}

async function fetchNotifications() {
  if (!currentUser) return;
  try {
    const res = await fetch(`${API_BASE}/notifications?username=${currentUser.username}`);
    const data = await res.json();
    if (data.success) {
      const badge = document.getElementById("notifBadge");
      if (badge) badge.innerText = data.unreadCount || 0;

      let html = '';
      if (data.notifications.length === 0) {
        html = '<p style="text-align:center; color:#64748b;">No notifications.</p>';
      } else {
        data.notifications.forEach(n => {
          html += `
            <div class="notif-item" style="${n.is_read ? 'opacity:0.7;' : 'border-left:4px solid #ff5200;'}">
              <strong>${n.title}</strong>
              <p style="margin:4px 0 0 0; font-size:13px;">${n.message}</p>
              <span style="font-size:11px; color:#94a3b8;">${new Date(n.created_at).toLocaleString()}</span>
            </div>
          `;
        });
      }
      document.getElementById("notificationsList").innerHTML = html;
    }
  } catch (err) {}
}

function toggleNotificationsModal() {
  if (!currentUser) return openLogin();
  document.getElementById("notificationsModal").style.display = "flex";
}
function closeNotificationsModal() { document.getElementById("notificationsModal").style.display = "none"; }

async function markAllNotificationsRead() {
  if (!currentUser) return;
  try {
    await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser.username })
    });
    fetchNotifications();
    showSuccess("Notifications marked as read");
  } catch (err) {}
}


// 📊 ADMIN DASHBOARD
async function openAdminDashboard() {
  if (!currentUser || currentUser.role !== "admin") return showSuccess("❌ Access Denied: Admin role required");

  document.getElementById("adminDashboardModal").style.display = "flex";
  loadAdminStats();
  loadAdminOrders();
  loadAdminFood();
  loadAdminReviews();
}

function closeAdminDashboard() { document.getElementById("adminDashboardModal").style.display = "none"; }

function switchAdminTab(tabName) {
  const tabs = document.querySelectorAll(".admin-tab");
  const contents = document.querySelectorAll(".admin-tab-content");

  tabs.forEach(t => t.classList.remove("active"));
  contents.forEach(c => c.classList.remove("active"));

  if (tabName === 'orders') {
    tabs[0].classList.add("active");
    document.getElementById("adminTabOrders").classList.add("active");
  } else if (tabName === 'food') {
    tabs[1].classList.add("active");
    document.getElementById("adminTabFood").classList.add("active");
  } else if (tabName === 'reviews') {
    tabs[2].classList.add("active");
    document.getElementById("adminTabReviews").classList.add("active");
  } else if (tabName === 'reports') {
    tabs[3].classList.add("active");
    document.getElementById("adminTabReports").classList.add("active");
  }
}

async function loadAdminStats() {
  try {
    const res = await fetch(`${API_BASE}/admin/dashboard`);
    const data = await res.json();
    if (data.success && data.stats) {
      document.getElementById("admUsers").innerText = data.stats.total_users;
      document.getElementById("admRevenue").innerText = `₹${data.stats.total_revenue.toFixed(2)}`;
      document.getElementById("admOrders").innerText = data.stats.total_orders;
      document.getElementById("admPending").innerText = data.stats.pending_orders;
    }
  } catch (err) {}
}

async function loadAdminOrders() {
  try {
    const res = await fetch(`${API_BASE}/admin/orders`);
    const data = await res.json();
    if (data.success) {
      let html = `
        <table>
          <thead>
            <tr>
              <th>ID</th><th>User</th><th>Total</th><th>Payment</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
      `;
      data.orders.forEach(o => {
        html += `
          <tr>
            <td>#${o.id}</td>
            <td>${o.username}</td>
            <td>₹${o.total_amount}</td>
            <td>${o.payment_status} (${o.payment_method})</td>
            <td>
              <select onchange="updateOrderStatus(${o.id}, this.value)">
                <option value="Pending" ${o.order_status==='Pending'?'selected':''}>Pending</option>
                <option value="Confirmed" ${o.order_status==='Confirmed'?'selected':''}>Confirmed</option>
                <option value="Preparing" ${o.order_status==='Preparing'?'selected':''}>Preparing</option>
                <option value="Ready" ${o.order_status==='Ready'?'selected':''}>Ready</option>
                <option value="Out for Delivery" ${o.order_status==='Out for Delivery'?'selected':''}>Out for Delivery</option>
                <option value="Delivered" ${o.order_status==='Delivered'?'selected':''}>Delivered</option>
                <option value="Cancelled" ${o.order_status==='Cancelled'?'selected':''}>Cancelled</option>
              </select>
            </td>
            <td><button onclick="openOrderTrackingModal(${o.id})" style="padding:4px 8px; font-size:12px;">View</button></td>
          </tr>
        `;
      });
      html += '</tbody></table>';
      document.getElementById("adminOrdersTable").innerHTML = html;
    }
  } catch (err) {}
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    const res = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      showSuccess(`Order #${orderId} status updated to ${newStatus}`);
      loadAdminStats();
    }
  } catch (err) {}
}

async function loadAdminFood() {
  try {
    const res = await fetch(`${API_BASE}/food`);
    const data = await res.json();
    if (data.success) {
      let html = `
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Name</th><th>Category</th><th>Price</th><th>Availability</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
      `;
      data.foodItems.forEach(f => {
        html += `
          <tr>
            <td>#${f.id}</td>
            <td>${f.name}</td>
            <td>${f.category_name || 'Food'}</td>
            <td>₹${f.price}</td>
            <td>${f.availability ? '✅ In Stock' : '❌ Out of Stock'}</td>
            <td>
              <button onclick="deleteFoodItem(${f.id})" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Delete</button>
            </td>
          </tr>
        `;
      });
      html += '</tbody></table>';
      document.getElementById("adminFoodTable").innerHTML = html;
    }
  } catch (err) {}
}

function openAddFoodModal() {
  editingFoodId = null;
  document.getElementById("foodModalTitle").innerText = "➕ Add Food Item";
  document.getElementById("afName").value = "";
  document.getElementById("afDesc").value = "";
  document.getElementById("afPrice").value = "";
  document.getElementById("afImg").value = "";
  document.getElementById("addFoodModal").style.display = "flex";
}
function closeAddFoodModal() { document.getElementById("addFoodModal").style.display = "none"; }

async function saveAdminFood() {
  const name = document.getElementById("afName").value.trim();
  const desc = document.getElementById("afDesc").value.trim();
  const price = document.getElementById("afPrice").value.trim();
  const img = document.getElementById("afImg").value.trim();
  const cat = document.getElementById("afCategory").value;
  const veg = document.getElementById("afVeg").value;

  if (!name || !price) return showSuccess("❌ Please fill name and price");

  try {
    const res = await fetch(`${API_BASE}/admin/food`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, description: desc, price: parseFloat(price), image_url: img, category_id: parseInt(cat), vegetarian: veg === '1'
      })
    });
    const data = await res.json();
    if (data.success) {
      showSuccess("Food item added!");
      closeAddFoodModal();
      loadAdminFood();
    }
  } catch (err) {}
}

async function deleteFoodItem(id) {
  if (!confirm("Delete this food item?")) return;
  try {
    const res = await fetch(`${API_BASE}/admin/food/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showSuccess("Food item deleted!");
      loadAdminFood();
    }
  } catch (err) {}
}

async function loadAdminReviews() {
  try {
    const res = await fetch(`${API_BASE}/admin/reviews`);
    const data = await res.json();
    if (data.success) {
      let html = `
        <table>
          <thead>
            <tr>
              <th>ID</th><th>User</th><th>Food</th><th>Rating</th><th>Comment</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
      `;
      data.reviews.forEach(r => {
        html += `
          <tr>
            <td>#${r.id}</td>
            <td>${r.username}</td>
            <td>${r.food_name || 'Food'}</td>
            <td>⭐ ${r.rating}/5</td>
            <td>${r.comment}</td>
            <td>
              <button onclick="deleteReview(${r.id})" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Delete</button>
            </td>
          </tr>
        `;
      });
      html += '</tbody></table>';
      document.getElementById("adminReviewsTable").innerHTML = html;
    }
  } catch (err) {}
}

async function deleteReview(id) {
  if (!confirm("Delete this review?")) return;
  try {
    const res = await fetch(`${API_BASE}/admin/reviews/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showSuccess("Review deleted!");
      loadAdminReviews();
    }
  } catch (err) {}
}

function sendMessage(event) {
  event.preventDefault();
  document.getElementById("contactPopup").style.display = "flex";
  event.target.reset();
}
function closeContactPopup() { document.getElementById("contactPopup").style.display = "none"; }

function bookTable(event) {
  event.preventDefault();
  document.getElementById("bookingPopup").style.display = "flex";
  event.target.reset();
}
function closePopup() { document.getElementById("bookingPopup").style.display = "none"; }