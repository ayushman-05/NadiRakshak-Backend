const express = require("express");
const router = express.Router();
const storeController = require("../controllers/storeController");
const orderController = require("../controllers/orderController");
const multer = require("multer");
const { protect } = require("../middleware/authMiddleware");

// Configure multer for image upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // limit to 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Store item routes
router
  .route("/items")
  .get(storeController.getAllStoreItems)
  .post(protect, upload.single("image"), storeController.createStoreItem);

router
  .route("/items/:id")
  .get(storeController.getStoreItem)
  .patch(protect, upload.single("image"), storeController.updateStoreItem)
  .delete(
    protect,

    storeController.deleteStoreItem
  );

// Order routes
router
  .route("/orders")
  .get(protect, orderController.getUserOrders)
  .post(protect, orderController.createOrder);

router.route("/orders/:id").get(protect, orderController.getOrder);

// Admin-only routes
router.route("/admin/orders").get(
  protect,

  orderController.getAllOrders
);

router
  .route("/admin/orders/:id/status")
  .patch(protect, orderController.updateOrderStatus);

router
  .route("/admin/orders/:id/tracking")
  .patch(protect, orderController.addTrackingInfo);

module.exports = router;
