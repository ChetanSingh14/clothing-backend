import { Router } from "express";
import {
  getGalleryImages,
  createGalleryImage,
  deleteGalleryImage,
} from "./gallery.controller";
import { authenticateToken, authorizeAdmin } from "../../common/middlewares/auth.middleware";

const router = Router();

router.get("/", getGalleryImages);
router.post("/", authenticateToken(), authorizeAdmin, createGalleryImage);
router.delete("/:id", authenticateToken(), authorizeAdmin, deleteGalleryImage);

export default router;
