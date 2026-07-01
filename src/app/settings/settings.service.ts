import prisma from "../../common/config/prisma.config";
import fs from "fs";
import path from "path";

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
      const matches = data.logoUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const fileExtension = matches[1].split("/")[1] || "png";
        const buffer = Buffer.from(matches[2], "base64");
        
        const uploadsDir = path.join(__dirname, "../../../public/uploads");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const fileName = `logo_${Date.now()}.${fileExtension}`;
        const filePath = path.join(uploadsDir, fileName);
        fs.writeFileSync(filePath, buffer);

        const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`;
        updateData.logoUrl = `${backendUrl}/uploads/${fileName}`;
      }
    } catch (err) {
      console.error("Failed to decode base64 logo:", err);
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
