const Fooditems = require('../../models/Fooditems');
const FrankiesRolls = require('../../models/FrankiesRolls');
const AnnaDishes = require('../../models/AnnaDishes');
const FreshJuice = require('../../models/FreshJuice');

// Function to get model based on the stall type
const getModelByStall = (stall) => {
  console.log("Received stall:", stall);  // Log the stall value

  switch (stall) {
    case 'foodItems': // Ensure exact match
      return Fooditems;
    case 'frankiesRolls': // Ensure exact match
      return FrankiesRolls;
    case 'annaDishes': // Ensure exact match
      return AnnaDishes;
    case 'freshJuice': // Ensure exact match
      return FreshJuice;
    default:
      console.log("Invalid stall type:", stall);  // Log when stall is invalid
      return null; // Return null if stall type is invalid
  }
};

module.exports = { getModelByStall };
