import prisma from "../../common/config/prisma.config";
import { uploadToCloudinary } from "../../common/utils/cloudinary.utils";

export const getCinematicHeroImagesService = async () => {
  const images = await prisma.cinematicHeroImage.findMany({
    orderBy: { createdAt: "asc" },
  });

  return {
    success: true,
    data: images,
  };
};

export const createCinematicHeroImageService = async (data: { url: string, label: string }) => {
  let finalUrl = data.url;

  if (data.url && data.url.startsWith("data:image")) {
    try {
      finalUrl = await uploadToCloudinary(data.url, "cinematic-hero");
    } catch (err) {
      console.error("Failed to upload cinematic hero image to Cloudinary:", err);
      throw new Error("Failed to upload image");
    }
  }

  const image = await prisma.cinematicHeroImage.create({
    data: { 
      url: finalUrl,
      label: data.label
    },
  });

  return {
    success: true,
    message: "Image uploaded to cinematic hero successfully",
    data: image,
  };
};

export const deleteCinematicHeroImageService = async (id: number) => {
  await prisma.cinematicHeroImage.delete({
    where: { id },
  });

  return {
    success: true,
    message: "Image deleted from cinematic hero successfully",
  };
};
