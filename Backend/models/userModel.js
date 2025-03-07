const mongoose = require('mongoose');

// Define the schema for the user
const userSchema = new mongoose.Schema({
  name: {type: String, required: true},
  email: {type: String, required: true, unique: true},
  password: {type: String, required: true},
  verifyOtp: {type: String, default: ''}, 
  verifyOtpExpireAt: {type: Number, default: 0},
  isAccountVerified: {type: Boolean, default: false},
  resetOtp: {type: String, default: ''},
  resetOtpExpireAt: {type: Number, default: 0},
})

const userModel = mongoose.model.user || mongoose.model('User', userSchema);

module.exports = userModel; // Use module.exports to export the model