const userModel = require('../models/userModel');

module.exports.getUserData = async (req, res) => {
    try {
        // Get email from req.user (this should be set by authentication middleware)
        const email = req.user?.email;

        if (!email) {
            return res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
        }

        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.json({
            success: true,
            userData: {
                name: user.name,
                email: user.email,
                isAccountVerified: user.isAccountVerified,
            },
        });
    } catch (error) {
        console.error("Error in getUserData:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

 