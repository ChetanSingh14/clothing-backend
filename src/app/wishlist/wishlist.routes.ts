import { Router } from "express";
import { getWishlist, toggleWishlist } from "./wishlist.controller";
import { authenticateToken } from "../../common/middlewares/auth.middleware";

const router = Router();

router.get("/", authenticateToken(), getWishlist);
router.post("/:productId", authenticateToken(), toggleWishlist);

export { router as wishlistRoutes };
