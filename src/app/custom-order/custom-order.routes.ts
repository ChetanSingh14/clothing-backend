import { Router } from "express";
import { createCustomOrder, getAdminCustomOrders, getMyCustomOrders, updateCustomOrderStatus } from "./custom-order.controller";
import { authenticateToken, authorizeAdmin } from "../../common/middlewares/auth.middleware";

const router = Router();

router.post("/", authenticateToken(), createCustomOrder);
router.get("/my-orders", authenticateToken(), getMyCustomOrders);
router.get("/admin", authenticateToken(), authorizeAdmin, getAdminCustomOrders);
router.put("/admin/:id/status", authenticateToken(), authorizeAdmin, updateCustomOrderStatus);

export { router as customOrderRoutes };
