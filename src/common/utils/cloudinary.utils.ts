import { v2 as cloudinary } from "cloudinary";
import { logger } from "./logger.utils";

export const uploadToCloudinary = async (
  fileDataUri: string,
  folder: string = "clothing"
): Promise<{ url: string; optimizedUrl: string }> => {
  try {
    const result = await cloudinary.uploader.upload(fileDataUri, {
      folder: folder,
      resource_type: "auto",
    });
    const optimizedUrl = result.secure_url.replace("/upload/", "/upload/f_auto,q_auto/");
    return { url: result.secure_url, optimizedUrl };
  } catch (error) {
    logger.error("Cloudinary upload error:", error);
    throw error;
  }
};
