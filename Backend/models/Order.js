// models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: String,
  paymentStatus: String,
  items: Array,
  totalAmount: Number,
  gst: Number,
  date: Date,
  customer: {
    name: String,
    email: String,
    contact: String,
  },
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
