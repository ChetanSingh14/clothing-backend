import { Router } from "express";
import { checkServiceability, generateManifest, checkShippingRate, trackShipment, delhiveryWebhook } from "./shipping.controller";
import { authenticateToken, authorizeAdmin } from "../../common/middlewares/auth.middleware";

const router = Router();

// Pincode serviceability check during checkout (Public)
router.get("/serviceability", checkServiceability);

// Dynamic shipping cost calculation (Public)
router.get("/rate", checkShippingRate);

// Track package waybill status (Requires Auth)
router.get("/track/:waybill", authenticateToken(), trackShipment);

// Manifest waybill generation (Admin only)
router.post("/manifest", authenticateToken(), authorizeAdmin, generateManifest);

// Push Status Webhook (Public)
router.post("/webhook/delhivery", delhiveryWebhook);

export { router as shippingRoutes };
