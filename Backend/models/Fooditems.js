const mongoose = require('mongoose');

const fooditemsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    price: { type: Number, required: true },
    rating: { type: Number, required: true },
    image: { type: String, required: true },
    quantity: { type: String, required: true },
    approxTime: { type: String, required: true },
    isAvailable: { type: Boolean, default: true },
  },
  { collection: 'fooditems', timestamps: true }
);

const Fooditems = mongoose.model('Fooditems', fooditemsSchema);
module.exports = Fooditems;
