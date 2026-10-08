/**
 * Reusable Email Notification Service for Food Court
 * Formats and sends order confirmation & receipt emails.
 * Ready to connect to SMTP providers (e.g. Nodemailer/SendGrid/AWS SES).
 */

function sendOrderConfirmationEmail({ email, username, orderId, items, subtotal, tax, delivery_fee, total_amount, payment_method, payment_status, delivery_address }) {
  const recipient = email || `${username}@customer.foodcourt.com`;
  const itemsText = items.map(i => `- ${i.food_name || i.n} x${i.quantity || 1} (₹${(i.price || i.p) * (i.quantity || 1)})`).join('\n');

  const emailBody = `
============== 🍔 FOOD COURT ORDER CONFIRMATION ==============
Dear ${username},

Thank you for your order! Your food is being processed.

📦 Order ID: #${orderId}
📅 Date: ${new Date().toLocaleString()}
🚚 Delivery Address: ${delivery_address || 'Customer Address'}

--- ORDER ITEMS ---
${itemsText}

--- PAYMENT BREAKDOWN ---
Subtotal: ₹${subtotal.toFixed(2)}
Taxes & GST (5%): ₹${tax.toFixed(2)}
Delivery Charge: ₹${delivery_fee.toFixed(2)}
-----------------------------
TOTAL AMOUNT: ₹${total_amount.toFixed(2)}

💳 Payment Method: ${payment_method}
⚡ Payment Status: ${payment_status}

⏰ Expected Delivery Time: 30 - 45 Minutes

If you have any questions, reach out to foodcourt@gmail.com or +91 9876543210.
==============================================================
  `;

  console.log(`\n📧 [EMAIL SERVICE] Order Confirmation sent to ${recipient}:\n${emailBody}\n`);
  return true;
}

module.exports = {
  sendOrderConfirmationEmail
};
