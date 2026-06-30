import prisma from "../../common/config/prisma.config";
import ErrorHandler from "../../common/utils/errorHandler";

export const getWishlistService = async (userId: number) => {
  const wishlists = await prisma.wishlist.findMany({
    where: { userId },
    include: {
      product: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    success: true,
    data: wishlists.map((w) => w.product),
  };
};

export const toggleWishlistService = async (userId: number, productId: number) => {
  // Verify product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });
  if (!product) {
    throw new ErrorHandler("Product not found", 404);
  }

  // Check if already in wishlist
  const existing = await prisma.wishlist.findUnique({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
  });

  if (existing) {
    // Remove from wishlist
    await prisma.wishlist.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return {
      success: true,
      message: "Removed from wishlist",
      toggled: false,
    };
  } else {
    // Add to wishlist
    const created = await prisma.wishlist.create({
      data: {
        userId,
        productId,
      },
    });

    return {
      success: true,
      message: "Added to wishlist",
      toggled: true,
      data: created,
    };
  }
};
