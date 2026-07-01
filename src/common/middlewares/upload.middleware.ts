import { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import ErrorHandler from "../utils/errorHandler";
import { logger } from "../utils/logger.utils";

export interface UploadRequest extends Request {
  fileUrl?: string;
  fileName?: string;
}

export const uploadBase64Image = (req: UploadRequest, res: Response, next: NextFunction): void => {
  try {
    const { image } = req.body;
    if (!image) {
      return next(new ErrorHandler("No image data provided. Expected base64 string.", 400));
    }

    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return next(new ErrorHandler("Invalid image data format. Must be base64 data URI.", 400));
    }

    const fileType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");
    
    // Check extension
    let ext = fileType.split("/")[1] || "png";
    if (ext.includes("gltf-binary") || ext.includes("glb")) ext = "glb";
    const fileName = `file_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
    
    const uploadDir = path.join(__dirname, "../../../public/uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    fs.writeFileSync(path.join(uploadDir, fileName), buffer);

    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`;
    req.fileUrl = `${backendUrl}/uploads/${fileName}`;
    req.fileName = fileName;

    next();
  } catch (error) {
    logger.error("Base64 upload middleware error:", error);
    next(error);
  }
};
