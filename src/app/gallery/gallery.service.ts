import prisma from "../../common/config/prisma.config";
import { uploadToCloudinary } from "../../common/utils/cloudinary.utils";

export const getGalleryImagesService = async () => {
  const images = await prisma.galleryImage.findMany({
    orderBy: { createdAt: "desc" },
  });

  return {
    success: true,
    data: images,
  };
};

export const createGalleryImageService = async (data: { url: string }) => {
  let finalUrl = data.url;

  if (data.url && data.url.startsWith("data:image")) {
    try {
      finalUrl = await uploadToCloudinary(data.url, "gallery");
    } catch (err) {
      console.error("Failed to upload gallery image to Cloudinary:", err);
      throw new Error("Failed to upload image");
    }
  }

  const image = await prisma.galleryImage.create({
    data: { url: finalUrl },
  });

  return {
    success: true,
    message: "Image uploaded to gallery successfully",
    data: image,
  };
};

export const deleteGalleryImageService = async (id: number) => {
  await prisma.galleryImage.delete({
    where: { id },
  });

  return {
    success: true,
    message: "Image deleted from gallery successfully",
  };
};
