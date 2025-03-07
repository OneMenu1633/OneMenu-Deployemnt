const Jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");

const userAuth = async (req, res, next) => {
    try {
        console.log("Cookies:", req.cookies); // Debugging
        console.log("Headers:", req.headers.authorization); // Debugging

        // Get token from cookies or Authorization header
        const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ success: false, message: "Not authenticated, login again" });
        }

        // Verify the token
        const tokenDecode = Jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user from database (excluding password for security)
        const user = await userModel.findById(tokenDecode.id).select("-password");

        if (!user) {
            return res.status(401).json({ success: false, message: "User not found, login again" });
        }

        // Attach user object to request
        req.user = user;
        console.log("Authenticated user:", req.user);

        next(); // Proceed to the next middleware/route
    } catch (error) {
        console.error("Authentication Error:", error);
        return res.status(401).json({ success: false, message: "Invalid token, login again" });
    }
};

module.exports = userAuth;
