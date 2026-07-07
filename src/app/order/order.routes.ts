import { Router } from "express";
import { createOrder, getAdminOrders, getMyOrders, updateOrderStatus, updateAdminOrderStatus, returnOrder } from "./order.controller";
import { authenticateToken, authorizeAdmin } from "../../common/middlewares/auth.middleware";

const router = Router();

router.post("/", authenticateToken(), createOrder);
router.get("/my-orders", authenticateToken(), getMyOrders);
router.put("/:id/cancel", authenticateToken(), updateOrderStatus);
router.post("/:id/return", authenticateToken(), returnOrder);
router.get("/admin", authenticateToken(), authorizeAdmin, getAdminOrders);
router.put("/admin/:id/status", authenticateToken(), authorizeAdmin, updateAdminOrderStatus);

export { router as orderRoutes };
