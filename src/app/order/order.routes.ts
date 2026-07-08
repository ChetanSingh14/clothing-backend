import { Router } from "express";
import { 
  createOrder, 
  getAdminOrders, 
  getMyOrders, 
  updateOrderStatus, 
  updateAdminOrderStatus, 
  returnOrder, 
  nimbusShipOrder, 
  nimbusCancelOrder, 
  nimbusTrackOrder, 
  calculateShipping,
  getAdminExchangeOrders,
  updateAdminExchangeOrderStatus,
  nimbusShipExchangeOrder,
  nimbusCancelExchangeOrder,
  nimbusTrackExchangeOrder
} from "./order.controller";
import { authenticateToken, authorizeAdmin } from "../../common/middlewares/auth.middleware";

const router = Router();

router.post("/", authenticateToken(), createOrder);
router.post("/calculate-shipping", authenticateToken(), calculateShipping);
router.get("/my-orders", authenticateToken(), getMyOrders);
router.put("/:id/cancel", authenticateToken(), updateOrderStatus);
router.post("/:id/return", authenticateToken(), returnOrder);
router.get("/admin", authenticateToken(), authorizeAdmin, getAdminOrders);
router.put("/admin/:id/status", authenticateToken(), authorizeAdmin, updateAdminOrderStatus);
router.post("/admin/:id/nimbus-ship", authenticateToken(), authorizeAdmin, nimbusShipOrder);
router.post("/admin/:id/nimbus-cancel", authenticateToken(), authorizeAdmin, nimbusCancelOrder);

// Exchange Order Admin routes
router.get("/admin/exchanges", authenticateToken(), authorizeAdmin, getAdminExchangeOrders);
router.put("/admin/exchanges/:id/status", authenticateToken(), authorizeAdmin, updateAdminExchangeOrderStatus);
router.post("/admin/exchanges/:id/nimbus-ship", authenticateToken(), authorizeAdmin, nimbusShipExchangeOrder);
router.post("/admin/exchanges/:id/nimbus-cancel", authenticateToken(), authorizeAdmin, nimbusCancelExchangeOrder);
router.get("/admin/exchanges/:id/nimbus-track", authenticateToken(), authorizeAdmin, nimbusTrackExchangeOrder);

router.get("/:id/nimbus-track", authenticateToken(), nimbusTrackOrder);

export { router as orderRoutes };
