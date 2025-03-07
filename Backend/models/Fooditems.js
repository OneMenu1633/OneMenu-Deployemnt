const mongoose = require('mongoose');

const fooditemsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    price: { type: Number, required: true },
    rating: { type: Number, required: true },
    image: { type: String, required: true },
    quantity: { type: Number, required: true },
    approxTime: { type: Number, required: true },
  },
  { collection: 'fooditems', timestamps: true }
);

const Fooditems = mongoose.model('Fooditems', fooditemsSchema);
module.exports = Fooditems;
