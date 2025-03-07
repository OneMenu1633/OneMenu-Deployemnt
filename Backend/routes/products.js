const express = require("express");
const mongoose = require("mongoose");

const app = express();

// Example models
const Fooditems = require('../models/Fooditems'); // Ensure this path is correct
const FrankiesRolls = require('../models/FrankiesRolls'); // Ensure this path is correct
const AnnaDishes = require('../models/AnnaDishes'); // Ensure this path is correct
const FreshJuice = require('../models/FreshJuice'); // Ensure this path is correct

// Route: Get all menus
app.get("/products/menuss", async (req, res) => {
  try {
    // Fetch data from all collections
    const foodItems = await Fooditems.find();
    const frankiesRolls = await FrankiesRolls.find();
    const annaDishes = await AnnaDishes.find();
    const freshJuice = await FreshJuice.find();

    // Structure the data in the desired format
    const menus = {
      foodItems,
      frankiesRolls,
      annaDishes,
      freshJuice
    };

    res.status(200).json(menus); // Return the menus data
  } catch (error) {
    console.error("Error fetching menus:", error);
    res.status(500).json({ message: "Server error while fetching menus" });
  }
});
