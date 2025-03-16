const mongoose = require('mongoose');

const annadishesSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    price: { type: Number, required: true },
    rating: { type: Number, required: true },
    image: { type: String, required: true },
    quantity: { type: String, required: true },
    approxTime: { type: String, required: true },
    isAvailable: { type: Boolean, default: true },
  },
  { collection: 'AnnaDishes', timestamps: true }
);

const AnnaDishes = mongoose.model('AnnaDishes', annadishesSchema);
module.exports = AnnaDishes;
