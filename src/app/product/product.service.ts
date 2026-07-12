import prisma from "../../common/config/prisma.config";
import ErrorHandler from "../../common/utils/errorHandler";

export const getProductsService = async (category?: string) => {
  const filter = category ? { category: { equals: category, mode: "insensitive" as const } } : {};
  const products = await prisma.product.findMany({
    where: filter,
    orderBy: { createdAt: "desc" },
  });
  return {
    success: true,
    data: products,
  };
};

export const getProductByIdService = async (productId: number) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      reviews: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!product) {
    throw new ErrorHandler("Product not found", 404);
  }

  return {
    success: true,
    data: product,
  };
};

export const addProductReviewService = async (
  productId: number,
  userName: string,
  rating: number,
  comment: string
) => {
  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new ErrorHandler("Product not found", 404);
  }

  if (rating < 1 || rating > 5) {
    throw new ErrorHandler("Rating must be between 1 and 5", 400);
  }

  // Create review
  const review = await prisma.review.create({
    data: {
      productId,
      userName,
      rating,
      comment,
    },
  });

  // Calculate new average rating
  const reviews = await prisma.review.findMany({
    where: { productId },
    select: { rating: true },
  });

  const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
  const avgRating = Number((totalRating / reviews.length).toFixed(1));

  // Update product average rating
  await prisma.product.update({
    where: { id: productId },
    data: { rating: avgRating },
  });

  return {
    success: true,
    message: "Review added successfully",
    data: review,
  };
};

export const createProductService = async (data: {
  title: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  colors: string[];
  sizes: string[];
  maleColors?: string[];
  femaleColors?: string[];
  maleSizes?: string[];
  femaleSizes?: string[];
}) => {
  const product = await prisma.product.create({
    data: {
      title: data.title,
      description: data.description,
      price: Number(data.price),
      category: data.category,
      images: data.images,
      colors: data.colors,
      sizes: data.sizes,
      maleColors: data.maleColors || [],
      femaleColors: data.femaleColors || [],
      maleSizes: data.maleSizes || [],
      femaleSizes: data.femaleSizes || [],
    },
  });

  return {
    success: true,
    message: "Product created successfully",
    data: product,
  };
};

export const updateProductService = async (
  productId: number,
  data: Partial<{
    title: string;
    description: string;
    price: number;
    category: string;
    images: string[];
    colors: string[];
    sizes: string[];
    maleColors?: string[];
    femaleColors?: string[];
    maleSizes?: string[];
    femaleSizes?: string[];
  }>
) => {
  // Check if exists
  const existing = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!existing) {
    throw new ErrorHandler("Product not found", 404);
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      ...data,
      ...(data.price !== undefined ? { price: Number(data.price) } : {}),
    },
  });

  return {
    success: true,
    message: "Product updated successfully",
    data: updated,
  };
};

export const deleteProductService = async (productId: number) => {
  const existing = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!existing) {
    throw new ErrorHandler("Product not found", 404);
  }

  await prisma.product.delete({
    where: { id: productId },
  });

  return {
    success: true,
    message: "Product deleted successfully",
  };
};

export const getAdminStatsService = async () => {
  const totalProducts = await prisma.product.count();
  const totalReviews = await prisma.review.count();
  const totalUsers = await prisma.user.count({ where: { deletedAt: null } });

  // Get categories count
  const categoriesQuery = await prisma.product.groupBy({
    by: ["category"],
  });
  const totalCategories = categoriesQuery.length;

  // Calculate average rating of all products
  const avgRatingQuery = await prisma.product.aggregate({
    _avg: {
      rating: true,
    },
  });
  const avgRating = avgRatingQuery._avg.rating ? Number(avgRatingQuery._avg.rating.toFixed(2)) : 0;

  // Calculate orders statistics
  const totalOrders = await prisma.order.count();
  const revenueQuery = await prisma.order.aggregate({
    _sum: {
      totalAmount: true,
      shippingCharges: true,
      codCharges: true,
    },
  });
  const totalAmountSum = revenueQuery._sum.totalAmount || 0;
  const shippingChargesSum = revenueQuery._sum.shippingCharges || 0;
  const codChargesSum = revenueQuery._sum.codCharges || 0;
  const totalRevenue = Number((totalAmountSum - shippingChargesSum - codChargesSum).toFixed(2));

  return {
    success: true,
    data: {
      totalProducts,
      totalReviews,
      totalUsers,
      totalCategories,
      averageRating: avgRating,
      totalOrders,
      totalRevenue,
    },
  };
};

export const getAdminUsersService = async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      password: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return {
    success: true,
    data: users,
  };
};

export const getAdminReviewsService = async () => {
  const reviews = await prisma.review.findMany({
    include: {
      product: {
        select: {
          title: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return {
    success: true,
    data: reviews,
  };
};

export const deleteReviewService = async (reviewId: number) => {
  const existing = await prisma.review.findUnique({
    where: { id: reviewId },
  });
  if (!existing) {
    throw new ErrorHandler("Review not found", 404);
  }

  const productId = existing.productId;

  // Delete the review
  await prisma.review.delete({
    where: { id: reviewId },
  });

  // Recalculate average rating of associated product
  const reviews = await prisma.review.findMany({
    where: { productId },
    select: { rating: true },
  });

  let avgRating = 5.0;
  if (reviews.length > 0) {
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    avgRating = Number((totalRating / reviews.length).toFixed(1));
  }

  await prisma.product.update({
    where: { id: productId },
    data: { rating: avgRating },
  });

  return {
    success: true,
    message: "Review deleted and rating updated successfully",
  };
};
