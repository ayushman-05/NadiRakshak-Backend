const express = require("express");
const router = express.Router();
const storeController = require("../controllers/storeController");
const orderController = require("../controllers/orderController");
const multer = require("multer");
const { protect } = require("../middleware/authMiddleware");
const { restrictToAdmin } = require("../middleware/adminMiddleware");

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
  .get(storeController.getAllStoreItems);

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

router.get(
  "/orders/status/:status",
  protect,
  orderController.getOrdersByStatus
);
// Admin-only routes
router
  .route("/admin/items")
  .post(
    protect,
    restrictToAdmin,
    upload.single("image"),
    storeController.createStoreItem
  );
router.route("/admin/orders").get(
  protect,restrictToAdmin,
  orderController.getAllOrders
);

router
  .route("/admin/orders/:id/status")
  .patch(protect, restrictToAdmin, orderController.updateOrderStatus);

router
  .route("/admin/orders/:id/tracking")
  .patch(protect, restrictToAdmin, orderController.addTrackingInfo);

module.exports = router;
