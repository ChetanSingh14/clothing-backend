import { Router } from "express";
import { getMyProfile, updateProfile, adminUpdateUser } from "./user.controller";
import { authenticateToken, authorizeAdmin } from "../../common/middlewares/auth.middleware";

const router = Router();

router.get("/me", authenticateToken(), getMyProfile);
router.put("/profile", authenticateToken(), updateProfile);

// Admin customer directory operations
router.put("/admin/users/:id", authenticateToken(), authorizeAdmin, adminUpdateUser);

export const userRoutes = router;
export default router;
