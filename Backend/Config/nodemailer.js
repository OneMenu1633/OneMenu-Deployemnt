const nodemailer = require("nodemailer");
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Consider environment variables or secure vault for credentials
    }
});

transporter.verify((error, success) => {
  if (error) {
      console.error('Transporter error:', error.message);
  } else {
      console.log('Transporter is ready to send emails');
  }
});

// Export the transporter object
module.exports = transporter;