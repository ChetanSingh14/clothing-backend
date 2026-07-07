import { Router } from "express";
import { getMyProfile, updateProfile, adminUpdateUser, requestPhoneOtp, verifyPhoneOtp } from "./user.controller";
import { authenticateToken, authorizeAdmin } from "../../common/middlewares/auth.middleware";
import { uploadBase64Image, UploadRequest } from "../../common/middlewares/upload.middleware";

const router = Router();

router.get("/me", authenticateToken(), getMyProfile);
router.put("/profile", authenticateToken(), updateProfile);
router.post("/phone-otp", authenticateToken(), requestPhoneOtp);
router.post("/phone-verify", authenticateToken(), verifyPhoneOtp);

router.post(
  "/upload",
  authenticateToken(),
  uploadBase64Image,
  (req: UploadRequest, res: any) => {
    res.status(201).json({
      success: true,
      message: "Image uploaded successfully",
      url: req.fileUrl,
      optimizedUrl: req.optimizedUrl,
    });
  }
);

// Admin customer directory operations
router.put("/admin/users/:id", authenticateToken(), authorizeAdmin, adminUpdateUser);

export const userRoutes = router;
export default router;
