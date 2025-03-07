// routes/orderRoutes.js
const express = require('express');
const Order = require('../models/Order'); // Import the Order model
const router = express.Router();

// Create a new order
router.post('/', (req, res) => {
  const { orderId, paymentStatus, items, totalAmount, gst, date, customer } = req.body;

  const newOrder = new Order({
    orderId,
    paymentStatus,
    items,
    totalAmount,
    gst,
    date,
    customer,
  });

  newOrder
    .save()
    .then(() => {
      res.status(200).json({ message: 'Order saved successfully' });
    })
    .catch((error) => {
      res.status(500).json({ message: 'Failed to save order', error });
    });
});

// Get all orders
router.get('/', (req, res) => {
  Order.find()
    .sort({ date: -1 }) // Sort by date in descending order
    .then((orders) => {
      res.json(orders);
    })
    .catch((error) => {
      res.status(500).json({ message: 'Failed to fetch orders', error });
    });
});

// Update order status
router.put('/:orderId', (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  Order.findByIdAndUpdate(orderId, { paymentStatus: status }, { new: true })
    .then((updatedOrder) => {
      res.status(200).json(updatedOrder);
    })
    .catch((error) => {
      res.status(500).json({ message: 'Failed to update order status', error });
    });
});

module.exports = router;
