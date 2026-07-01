import { Router } from "express";
import {
  getProducts,
  getProductById,
  addProductReview,
  createProduct,
  updateProduct,
  deleteProduct,
  getAdminStats,
  getAdminUsers,
  getAdminReviews,
  deleteReview,
} from "./product.controller";
import { authenticateToken, authorizeAdmin } from "../../common/middlewares/auth.middleware";
import { uploadBase64Image, UploadRequest } from "../../common/middlewares/upload.middleware";

const router = Router();

// Public routes
router.get("/", getProducts);
router.get("/:id", getProductById);
router.post("/:id/reviews", addProductReview);

// Admin-restricted routes
router.post("/admin", authenticateToken(), authorizeAdmin, createProduct);
router.put("/admin/:id", authenticateToken(), authorizeAdmin, updateProduct);
router.delete("/admin/:id", authenticateToken(), authorizeAdmin, deleteProduct);
router.get("/admin/dashboard", authenticateToken(), authorizeAdmin, getAdminStats);
router.get("/admin/users", authenticateToken(), authorizeAdmin, getAdminUsers);
router.get("/admin/reviews", authenticateToken(), authorizeAdmin, getAdminReviews);
router.delete("/admin/reviews/:id", authenticateToken(), authorizeAdmin, deleteReview);

// Custom local base64 upload route for admin product uploads
router.post(
  "/admin/upload",
  authenticateToken(),
  authorizeAdmin,
  uploadBase64Image,
  (req: UploadRequest, res: any) => {
    res.status(201).json({
      success: true,
      message: "Image uploaded successfully",
      url: req.fileUrl,
    });
  }
);

export { router as productRoutes };
