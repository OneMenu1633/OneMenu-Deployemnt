const nodemailer = require("nodemailer");
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'onemenu.it@gmail.com',
        pass: 'euwo vymq gdxb jsmf' // Consider environment variables or secure vault for credentials
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