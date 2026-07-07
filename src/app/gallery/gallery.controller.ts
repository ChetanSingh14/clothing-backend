import { Request, Response } from "express";
import {
  getGalleryImagesService,
  createGalleryImageService,
  deleteGalleryImageService,
} from "./gallery.service";

export const getGalleryImages = async (req: Request, res: Response) => {
  try {
    const result = await getGalleryImagesService();
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createGalleryImage = async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: "Image URL or Base64 data is required" });
    }
    const result = await createGalleryImageService({ url });
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteGalleryImage = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }
    const result = await deleteGalleryImageService(id);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
