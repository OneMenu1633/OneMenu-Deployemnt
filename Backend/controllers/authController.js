// Use require() instead of import
const bcrypt = require('bcrypt');
const Jwt = require("jsonwebtoken");
require('dotenv').config();
const userModel = require('../models/userModel'); 
const transporter = require('../Config/nodemailer.js');
const axios = require('axios'); // Ensure you import axios for making API calls

// Register function
module.exports.register = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.json({ success: false, message: 'Missing Details' });
    }

    try {
        const existingUser = await userModel.findOne({ email }); // Correct method usage
        if (existingUser) {
            return res.json({ success: false, message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new userModel({ name, email, password: hashedPassword });
        await user.save();

        const token = Jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        const mailOption = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: 'Welcome to OneMenu Account Successfully Created',
            text: `Your OneMenu account has been successfully created! You can now enjoy a seamless and automated canteen experience.

Registered Email: ${email}

Security Reminder:

Keep your account details confidential.
OneMenu will never ask for your password or OTP.
If you didn’t sign up for this account, contact us immediately.
Need Help?
Our support team is here for you! Reach us at:
onemenu.it@gmail.com

Welcome aboard! 

Best Regards,
The OneMenu Team

⚠ This is an automated email. Please do not reply.`

        }

        try {
            await transporter.sendMail(mailOption); // Ensure this is called on the correct object
            console.log('Email sent successfully');
        } catch (error) {
            console.error('Error sending email:', error.message);
        }

        return res.json({ success: true });

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

//////Role Based Access Here!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! 
// Login Function
module.exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.json({ success: false, message: "Email and password are required" });
    }

    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: "Invalid email" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({ success: false, message: "Invalid password" });
        }

        const token = Jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        // Return role-specific responses
        if (user.role === "admin") {
            return res.json({ success: true, token, role: "admin", redirectUrl: "/Home" });
        } else {
            return res.json({ success: true, token, role: "user", redirectUrl: "/home" });
        }
    } catch (error) {
        console.error("Login Error:", error);
        return res.json({ success: false, message: error.message });
    }
};

// Logout function
module.exports.logout = async (req, res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.json({ success: true, message: 'Logged out' });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// Send Verification OTP 
module.exports.sendVerifyOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: "Invalid email format" });
        }

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.isAccountVerified) {
            return res.status(400).json({ success: false, message: "Account already verified" });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));

        user.verifyOtp = otp; // ✅ Save OTP properly!
        user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000;

        await user.save();

        const mailOption = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: "Secure Your AIKTC OneMenu Account – OTP Inside!",
            text: `Thank you for choosing AIKTC OneMenu App! To secure your account, please verify your email by entering the One-Time Password (OTP) below within the next 24 hours:

OTP: ${otp}

Important Security Notice:

Never share your OTP with anyone, including AIKTC OneMenu staff.
We will never ask for your OTP via call, message, or email.
If you did not request this verification, please ignore this email. Your account will remain secure.
For any assistance, contact us at:
onemenu.it@gmail.com

Stay secure,
The AIKTC OneMenu App Team

⚠ This is an automated email. Replies to this message are not monitored.`,
        };

        await transporter.sendMail(mailOption);

        return res.status(200).json({ success: true, message: "Verification OTP sent to email" });

    } catch (error) {
        console.error("Error in sendVerifyOtp:", error.message);
        return res.status(500).json({
            success: false,
            message: "An error occurred while sending the OTP. Please try again later.",
        });
    }
};

// Verification OTP
module.exports.VerifyEmail = async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.json({ success: false, message: "Missing Details: name and OTP are required" });
    }

    try {
        // Fetch user by name instead of userId
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        console.log("Stored OTP:", user.verifyOtp);
        console.log("Entered OTP:", otp);
        console.log("OTP Expiry:", user.verifyOtpExpireAt, "Current Time:", Date.now());

        // Convert OTP values to strings to ensure correct comparison
        if (!user.verifyOtp || user.verifyOtp.toString().trim() !== otp.toString().trim()) {
            return res.json({ success: false, message: "Invalid OTP" });
        }

        // Ensure OTP has not expired
        if (Number(user.verifyOtpExpireAt) < Date.now()) {
            return res.json({ success: false, message: "OTP expired" });
        }

        user.isAccountVerified = true;
        user.verifyOtp = '';
        user.verifyOtpExpireAt = 0;

        await user.save();

        return res.json({ success: true, message: "Email verified successfully" });

    } catch (error) {
        console.error("Error verifying email:", error);
        return res.json({ success: false, message: error.message });
    }
};

//Check if user is authenticate
module.exports.isAuthenticate = async (req, res) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "") || req.cookies?.token;

        if (!token) {
            return res.status(401).json({ success: false, message: "No token provided" });
        }

        const decoded = Jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return res.status(401).json({ success: false, message: "Invalid token" });
        }

        const user = await userModel.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ success: false, message: "User not found" });
        }

        return res.json({ success: true, user });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Authentication failed", error: error.message });
    }
};

// Send Password Reset OTP
module.exports.sendResetOtp = async (req, res) => {
    const {email} = req.body;

    if(!email){
        return res.json({ success: false, message: "Email is required" });
    }
    try {
        // Corrected: Destructuring userId from req.body
        const user = await userModel.findOne({email});

        // Validate if userId exists
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        // Generate a 6-digit OTP
        const otp = String(Math.floor(100000 + Math.random() * 900000));

        // Update user with the OTP and expiry
        user.resetOtp = otp;
        user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000; // Valid for 24 hours

        // Save user changes to the database
        await user.save();

        // Define email options
        const mailOption = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: 'Password Reset OTP',
            text: `A request to reset your password has been received. Use the One-Time Password (OTP) below to proceed:

OTP: ${otp}

Important Security Notice:

This OTP is valid for 24 hours.
Do not share your OTP with anyone. AIKTC OneMenu will never ask for it.
If you did not request a password reset, please ignore this email.
For any assistance, contact us at:
onemenu.it@gmail.com

Stay secure,
The AIKTC OneMenu App Team

⚠ This is an automated email. Replies to this message are not monitored.`,
        };

        // Send the email
        await transporter.sendMail(mailOption);

        // Send success response
        res.json({ success: true, message: "Otp sent to your email" });
    } catch (error) {
        // Handle errors
        res.json({ success: false, message: error.message });
    }
};

// Resetpassword
module.exports.resetpassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    // Validate input fields
    if (!email || !otp || !newPassword) {
        return res.json({ success: false, message: "Email, OTP, and new password are required" });
    }

    try {
        // Find the user by email
        const user = await userModel.findOne({ email });

        // Check if user exists
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        // Validate the OTP
        if (!user.resetOtp || user.resetOtp !== otp) {
            return res.json({ success: false, message: "Invalid OTP" });
        }

        // Check if OTP has expired
        if (user.resetOtpExpireAt < Date.now()) {
            return res.json({ success: false, message: "OTP has expired" });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;

        // Clear the OTP fields
        user.resetOtp = '';
        user.resetOtpExpireAt = 0;

        // Save the updated user data
        await user.save();

        // Respond with success
        res.json({ success: true, message: "Password has been reset successfully" });
    } catch (error) {
        // Handle errors
        res.json({ success: false, message: error.message });
    }
};