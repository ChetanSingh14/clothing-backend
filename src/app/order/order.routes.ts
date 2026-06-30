import { Router } from "express";
import { createOrder, getAdminOrders } from "./order.controller";
import { authenticateToken, authorizeAdmin } from "../../common/middlewares/auth.middleware";

const router = Router();

router.post("/", authenticateToken(), createOrder);
router.get("/admin", authenticateToken(), authorizeAdmin, getAdminOrders);

export { router as orderRoutes };
