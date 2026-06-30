import { Router } from "express";
import { getSettings, updateSettings } from "./settings.controller";
import { authenticateToken, authorizeAdmin } from "../../common/middlewares/auth.middleware";

const router = Router();

router.get("/", getSettings);
router.put("/", authenticateToken(), authorizeAdmin, updateSettings);

export { router as settingsRoutes };
