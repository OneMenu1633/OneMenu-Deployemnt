const mongoose = require('mongoose');

const frankiesrollSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    price: { type: Number, required: true },
    rating: { type: Number, required: true },
    image: { type: String, required: true },
    quantity: { type: String, required: true },
    approxTime: { type: String, required: true },
    isAvailable: { type: Boolean, default: true },
  },
  { collection: 'frankies_Rolls', timestamps: true }
);

const FrankiesRolls = mongoose.model('FrankiesRolls', frankiesrollSchema);
module.exports = FrankiesRolls;
