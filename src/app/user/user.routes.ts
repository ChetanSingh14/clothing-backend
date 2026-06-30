import { Router } from "express";
import { getMyProfile, updateProfile } from "./user.controller";
import { authenticateToken } from "../../common/middlewares/auth.middleware";

const router = Router();

router.get("/me", authenticateToken(), getMyProfile);
router.put("/profile", authenticateToken(), updateProfile);

export const userRoutes = router;
export default router;
