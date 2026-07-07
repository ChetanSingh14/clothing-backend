import { Router } from "express";
import {
  getCinematicHeroImages,
  createCinematicHeroImage,
  deleteCinematicHeroImage,
} from "./cinematic-hero.controller";
import { authenticateToken, authorizeAdmin } from "../../common/middlewares/auth.middleware";

const router = Router();

router.get("/", getCinematicHeroImages);
router.post("/", authenticateToken(), authorizeAdmin, createCinematicHeroImage);
router.delete("/:id", authenticateToken(), authorizeAdmin, deleteCinematicHeroImage);

export default router;
