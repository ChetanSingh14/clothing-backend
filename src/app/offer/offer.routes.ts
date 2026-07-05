import { Router } from "express";
import { claimOffer, getOfferStatus } from "./offer.controller";
import { authenticateToken } from "../../common/middlewares/auth.middleware";

const router = Router();

// Claim the QR offer (must be logged in)
router.post("/claim", authenticateToken(), claimOffer);

// Check offer status (must be logged in)
router.get("/status", authenticateToken(), getOfferStatus);

export { router as offerRoutes };
