// 🔥 INIT
function init() {
  loadCart();

  // ✅ FIX: attach event after page loads
  let searchInput = document.getElementById("search");
  if (searchInput) {
    searchInput.addEventListener("keyup", searchFood);
  }
}
window.onload = function(){
  init();
  updateAuthUI();
    document.getElementById("home").style.display = "block";

  checkAuthPage(); // 🔥 THIS WAS MISSING
};

// 📂 SIDEBAR
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("active");
}

// 🛒 CART TOGGLE
function toggleCart() {
  document.getElementById("cartPanel").classList.toggle("active");
}

// 🔗 SCROLL
function goTo(id) {
  document.getElementById(id).scrollIntoView({
    behavior: "smooth"
  });
}


// ➕ ADD TO CART
function add(n, p) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart.push({ n, p });
  localStorage.setItem("cart", JSON.stringify(cart));

  loadCart();
  toggleCart(); // 👈 opens cart automatically
}


// 📦 LOAD CART
function loadCart() {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  let html = "<h2>Your Cart</h2>";
  let total = 0;

  cart.forEach((item, index) => {
    total += item.p;

    html += `
      <div style="margin-bottom:10px;">
        ${item.n} - ₹${item.p}
        <button onclick="removeItem(${index})" style="float:right;">❌</button>
      </div>
    `;
  });

  html += `<hr><h3>Total: ₹${total}</h3>`;

  // ✅ ADD THIS
  if(cart.length > 0){
    html += `<button onclick="placeOrder()" class="order-btn">Place Order</button>`;
  }

  document.getElementById("cartPanel").innerHTML =
    `<button class="close-cart" onclick="toggleCart()">Close ❌</button>` + html;
}


// ❌ REMOVE ITEM
function removeItem(index) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));

  loadCart();
}
function searchFood(){
  let input = document.getElementById("search").value.toLowerCase().trim();
  let cards = document.querySelectorAll(".card");
  let found = false;
  let firstMatch = null;

  cards.forEach(card => {
    let title = card.querySelector("h3");
    if(!title) return;

    let name = title.innerText.toLowerCase();

    if(name === input){  // ✅ exact match only
      card.classList.add("highlight");
      found = true;

      if(!firstMatch){
        firstMatch = card;
      }
    } else {
      card.classList.remove("highlight");
    }
  });

  if(firstMatch){
    firstMatch.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  let msg = document.getElementById("noResults");
  if(msg){
    msg.style.display = found ? "none" : "block";
  }
}
// 🌙 DARK MODE
function toggleDark() {
  document.body.classList.toggle("dark");
}


// 📩 CONTACT FORM (POPUP)
function sendMessage(event) {
  event.preventDefault();

  document.getElementById("contactPopup").style.display = "flex";

  // reset form
  event.target.reset();
}


// ❌ CLOSE CONTACT POPUP
function closeContactPopup() {
  document.getElementById("contactPopup").style.display = "none";
}


// 🍽 BOOK TABLE
function bookTable(event) {
  event.preventDefault();

  document.getElementById("bookingPopup").style.display = "flex";

  event.target.reset();
}


// ❌ CLOSE BOOKING POPUP
function closePopup() {
  document.getElementById("bookingPopup").style.display = "none";
}

// 🛍 PLACE ORDER
function placeOrder(){
  document.getElementById("paymentPopup").style.display = "flex";
}

// ❌ CLOSE PAYMENT
function closePayment(){
  document.getElementById("paymentPopup").style.display = "none";
}

// 💰 PAYMENT SELECT
function pay(method){

  if(method === "UPI"){
    // 🔥 open your link
    window.open("https://paytm.com/");
  }

  if(method === "Card"){
    alert("Card Payment Coming Soon 💳");
  }

  if(method === "COD"){
    alert("Order Placed with Cash on Delivery 🎉");
  }

  // ✅ clear cart after action
  localStorage.removeItem("cart");
  loadCart();
}
// 🔐 AUTH SYSTEM

function openSignup(){
  document.getElementById("signupPopup").style.display="flex";
}
function closeSignup(){
  document.getElementById("signupPopup").style.display="none";
}

function openLogin(){
  document.getElementById("loginPopup").style.display="flex";
}
function closeLogin(){
  document.getElementById("loginPopup").style.display="none";
}

// SIGNUP
// SHOW SUCCESS POPUP
function showSuccess(msg){
  document.getElementById("successText").innerText = msg;
  document.getElementById("successPopup").style.display = "flex";
}

function closeSuccess(){
  document.getElementById("successPopup").style.display = "none";
}

// SIGNUP
function signup(){
  let u = document.getElementById("suUser").value;
  let p = document.getElementById("suPass").value;

  if(u === "" || p === ""){
    showSuccess("❌ Fill all fields");
    return;
  }

  localStorage.setItem("user", u);
  localStorage.setItem("pass", p);
  localStorage.setItem("loggedIn", "true"); // 🔥 auto login

  closeSignup();
  updateAuthUI(); // 🔥 change navbar

  showSuccess("🎉 Account Created & Logged In!");
}

// LOGIN
function login(){
  let u = document.getElementById("liUser").value;
  let p = document.getElementById("liPass").value;

  let savedU = localStorage.getItem("user");
  let savedP = localStorage.getItem("pass");

  if(u === savedU && p === savedP){
    localStorage.setItem("loggedIn", "true");

    closeLogin();
    updateAuthUI(); // 🔥 change navbar

    showSuccess("✅ Login Successful");
  } else {
    showSuccess("❌ Invalid Credentials");
  }
}



// UPDATE BUTTON UI
function updateAuthUI(){
  let auth = document.getElementById("authSection");

  let isLoggedIn = localStorage.getItem("loggedIn");
  let user = localStorage.getItem("user");

  if(isLoggedIn === "true"){
    auth.innerHTML = `
      <span class="welcome">👋 Hi, ${user}</span>
      <button onclick="logout()">Logout</button>
    `;
  } else {
    auth.innerHTML = `
      <button onclick="openSignup()">Signup</button>
      <button onclick="openLogin()">Login</button>
    `;
  }
}
function logout(){
  localStorage.removeItem("loggedIn");

  checkAuthPage(); // 🔥 IMPORTANT
  updateAuthUI();
  showSuccess("👋 Logged Out");
}
// 🔐 AUTH PAGE CONTROL
function checkAuthPage(){
  let loggedIn = localStorage.getItem("loggedIn");

  if(loggedIn === "true"){
    document.getElementById("authPage").style.display = "none";
    document.getElementById("mainSite").style.display = "block";
  } else {
    document.getElementById("authPage").style.display = "flex";
    document.getElementById("mainSite").style.display = "none";
  }
}

// 🔑 LOGIN (FULL PAGE)
function authLogin(){
  let u = document.getElementById("authUser").value;
  let p = document.getElementById("authPass").value;

  let savedU = localStorage.getItem("user");
  let savedP = localStorage.getItem("pass");

  if(u === savedU && p === savedP){
    localStorage.setItem("loggedIn","true");

    checkAuthPage();
    updateAuthUI();
    showSuccess("✅ Login Successful");
  } else {
    alert("Invalid Login");
  }
}

// 🆕 SIGNUP (FULL PAGE)
function authSignup(){
  let u = document.getElementById("authUser").value;
  let p = document.getElementById("authPass").value;

  if(u === "" || p === ""){
    alert("Fill all fields");
    return;
  }

  localStorage.setItem("user",u);
  localStorage.setItem("pass",p);
  localStorage.setItem("loggedIn","true");

  checkAuthPage();
  updateAuthUI();
  showSuccess("🎉 Account Created!");
}