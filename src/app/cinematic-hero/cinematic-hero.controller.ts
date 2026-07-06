import { Request, Response } from "express";
import {
  getCinematicHeroImagesService,
  createCinematicHeroImageService,
  deleteCinematicHeroImageService,
} from "./cinematic-hero.service";

export const getCinematicHeroImages = async (req: Request, res: Response) => {
  try {
    const result = await getCinematicHeroImagesService();
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCinematicHeroImage = async (req: Request, res: Response) => {
  try {
    const { url, label } = req.body;
    if (!url || !label) {
      return res.status(400).json({ success: false, message: "Image URL and label are required" });
    }
    const result = await createCinematicHeroImageService({ url, label });
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCinematicHeroImage = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }
    const result = await deleteCinematicHeroImageService(id);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
