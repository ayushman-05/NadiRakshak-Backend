const jwt = require("jsonwebtoken");
const User = require("../models/userModal.js");

const protect = async (req, res, next) => {
  let token;

  try {
    // Check for Authorization header with Bearer token
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      // Extract token from header
      token = req.headers.authorization.split(" ")[1];

      try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        // Find user and attach to request, excluding password
        req.user = await User.findById(decoded.id).select("-password");

        // Proceed to next middleware
        next();
      } catch (verifyError) {
        // Specifically handle token expiration
        if (verifyError.name === "TokenExpiredError") {
          return res.status(401).json({
            message: "Access token expired",
            error: "TOKEN_EXPIRED",
          });
        }

        // Handle other token verification errors
        return res.status(401).json({
          message: "Invalid token",
          error: "INVALID_TOKEN",
        });
      }
    } else {
      // No token in Authorization header
      return res.status(401).json({
        message: "Not authorized, no token",
        error: "NO_TOKEN",
      });
    }
  } catch (error) {
    // Catch any unexpected server errors
    console.error("Unexpected authentication error:", error);
    return res.status(500).json({
      message: "Server authentication error",
      error: "SERVER_ERROR",
    });
  }
};

module.exports = { protect };
