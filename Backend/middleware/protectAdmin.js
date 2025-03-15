const Jwt = require('jsonwebtoken');
const userModel = require('../models/userModel'); // Adjust the path as needed

const protectAdminRoute = async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ success: false, message: "Not authorized, no token" });
    }

    try {
        const decoded = Jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;

        // Fetch user and check role
        const user = await userModel.findById(decoded.id);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Access denied. Only admins can access this route." });
        }

        next(); // Allow access to the route
    } catch (error) {
        return res.status(401).json({ success: false, message: "Not authorized, token failed" });
    }
};

module.exports = protectAdminRoute;