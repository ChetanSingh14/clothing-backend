import prisma from "../../common/config/prisma.config";
import { uploadToCloudinary } from "../../common/utils/cloudinary.utils";

export const getSettingsService = async () => {
  let settings = await prisma.settings.findUnique({
    where: { id: 1 },
  });

  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        id: 1,
        companyName: "MDFK CLOTHING CO.",
        logoUrl: "/logo.jpg",
      },
    });
  }

  return {
    success: true,
    data: settings,
  };
};

export const updateSettingsService = async (data: { companyName?: string; logoUrl?: string }) => {
  const updateData: any = {};
  if (data.companyName !== undefined) {
    updateData.companyName = data.companyName;
  }

  // Handle base64 logo image upload if present
  if (data.logoUrl && data.logoUrl.startsWith("data:image")) {
    try {
      const { url } = await uploadToCloudinary(data.logoUrl, "settings");
      updateData.logoUrl = url;
    } catch (err) {
      console.error("Failed to upload logo to Cloudinary:", err);
    }
  } else if (data.logoUrl !== undefined) {
    updateData.logoUrl = data.logoUrl;
  }

  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: updateData,
    create: {
      id: 1,
      companyName: data.companyName || "MDFK CLOTHING CO.",
      logoUrl: updateData.logoUrl || "/logo.jpg",
    },
  });

  return {
    success: true,
    message: "Brand settings updated successfully",
    data: settings,
  };
};
