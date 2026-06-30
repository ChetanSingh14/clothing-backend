import { Router } from "express";
import {
  getProducts,
  getProductById,
  addProductReview,
  createProduct,
  updateProduct,
  deleteProduct,
  getAdminStats,
} from "./product.controller";
import { authenticateToken, authorizeAdmin } from "../../common/middlewares/auth.middleware";
import fs from "fs";
import path from "path";
import ErrorHandler from "../../common/utils/errorHandler";

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

// Custom local base64 upload route for admin product uploads
router.post("/admin/upload", authenticateToken(), authorizeAdmin, (req, res, next) => {
  try {
    const { image } = req.body;
    if (!image) {
      return next(new ErrorHandler("No image data provided. Expected base64 string.", 400));
    }

    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return next(new ErrorHandler("Invalid image data format. Must be base64 data URI.", 400));
    }

    const fileType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");
    
    // Check extension
    const ext = fileType.split("/")[1] || "png";
    const fileName = `img_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
    
    const uploadDir = path.join(__dirname, "../../../public/uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    fs.writeFileSync(path.join(uploadDir, fileName), buffer);

    const port = process.env.PORT || 4000;
    const fileUrl = `http://localhost:${port}/uploads/${fileName}`;

    res.status(201).json({
      success: true,
      message: "Image uploaded successfully",
      url: fileUrl,
    });
  } catch (error) {
    next(error);
  }
});

export { router as productRoutes };
