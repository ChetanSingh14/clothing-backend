import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/errorHandler";
import { logger } from "../utils/logger.utils";
import { uploadToCloudinary } from "../utils/cloudinary.utils";

export interface UploadRequest extends Request {
  fileUrl?: string;
  fileName?: string;
  optimizedUrl?: string;
}

export const uploadBase64Image = async (
  req: UploadRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { image } = req.body;
    if (!image) {
      return next(new ErrorHandler("No image data provided. Expected base64 string.", 400));
    }

    const { url, optimizedUrl } = await uploadToCloudinary(image, "products");
    req.fileUrl = url;
    req.optimizedUrl = optimizedUrl;

    next();
  } catch (error) {
    logger.error("Base64 upload middleware error:", error);
    next(error);
  }
};
