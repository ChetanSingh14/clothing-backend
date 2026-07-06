import { Router } from "express";
import { submitContactForm } from "./contact.controller";

const router = Router();

router.post("/", submitContactForm);

export { router as contactRoutes };
