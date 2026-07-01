import { v2 as cloudinary } from "cloudinary";
import { logger } from "./logger.utils";

export const uploadToCloudinary = async (
  fileDataUri: string,
  folder: string = "clothing"
): Promise<string> => {
  try {
    const result = await cloudinary.uploader.upload(fileDataUri, {
      folder: folder,
      resource_type: "auto",
    });
    return result.secure_url;
  } catch (error) {
    logger.error("Cloudinary upload error:", error);
    throw error;
  }
};
