const express = require('express');
const router = express.Router();
const { getModelByStall } = require('./utils/getModelByStall');

router.post('/items/add-item', async (req, res) => {
  const { stall, title, price, rating, image, quantity, approxTime } = req.body;

  if (!stall || !title || !price || !rating || !image || !quantity || !approxTime) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const Model = getModelByStall(stall);
    if (!Model) {
      return res.status(400).json({ message: 'Invalid stall provided' });
    }

    const newItem = new Model({
      title,
      price,
      rating,
      image,
      quantity,
      approxTime,
    });

    await newItem.save();
    res.status(200).json({ message: 'Item added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add item', error: error.message });
  }
});


module.exports = router;
