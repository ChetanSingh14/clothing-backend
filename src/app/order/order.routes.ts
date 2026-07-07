import { Router } from "express";
import { 
  createOrder, 
  getAdminOrders, 
  getMyOrders, 
  updateOrderStatus, 
  updateAdminOrderStatus, 
  returnOrder, 
  calculateRates, 
  adminGetRates, 
  adminShipOrder, 
  trackShipment, 
  adminGetLabel, 
  shipmozoWebhook 
} from "./order.controller";
import { authenticateToken, authorizeAdmin } from "../../common/middlewares/auth.middleware";

const router = Router();

router.post("/", authenticateToken(), createOrder);
router.get("/my-orders", authenticateToken(), getMyOrders);
router.put("/:id/cancel", authenticateToken(), updateOrderStatus);
router.post("/:id/return", authenticateToken(), returnOrder);
router.post("/shipping-rates", authenticateToken(), calculateRates);
router.post("/webhook/shipmozo", shipmozoWebhook); // public webhook, exempt from authentication
router.get("/:id/track", authenticateToken(), trackShipment);

router.get("/admin", authenticateToken(), authorizeAdmin, getAdminOrders);
router.put("/admin/:id/status", authenticateToken(), authorizeAdmin, updateAdminOrderStatus);
router.get("/admin/:id/rates", authenticateToken(), authorizeAdmin, adminGetRates);
router.post("/admin/:id/ship", authenticateToken(), authorizeAdmin, adminShipOrder);
router.get("/admin/:id/label", authenticateToken(), authorizeAdmin, adminGetLabel);

export { router as orderRoutes };
