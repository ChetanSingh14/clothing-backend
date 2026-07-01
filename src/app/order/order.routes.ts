import { Router } from "express";
import { createOrder, getAdminOrders, getMyOrders, updateOrderStatus } from "./order.controller";
import { authenticateToken, authorizeAdmin } from "../../common/middlewares/auth.middleware";

const router = Router();

router.post("/", authenticateToken(), createOrder);
router.get("/my-orders", authenticateToken(), getMyOrders);
router.put("/:id/cancel", authenticateToken(), updateOrderStatus);
router.get("/admin", authenticateToken(), authorizeAdmin, getAdminOrders);

export { router as orderRoutes };
