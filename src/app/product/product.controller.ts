import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../../common/middlewares/auth.middleware";
import {
  getProductsService,
  getProductByIdService,
  addProductReviewService,
  createProductService,
  updateProductService,
  deleteProductService,
  getAdminStatsService,
  getAdminUsersService,
  getAdminReviewsService,
  deleteReviewService,
} from "./product.service";
import ErrorHandler, { catchAsyncError } from "../../common/utils/errorHandler";
import { logger } from "../../common/utils/logger.utils";

export const getProducts = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const category = req.query.category as string | undefined;
    const result = await getProductsService(category);
    res.status(200).json(result);
  }
);

export const getProductById = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      throw new ErrorHandler("Invalid product ID", 400);
    }
    const result = await getProductByIdService(id);
    res.status(200).json(result);
  }
);

export const addProductReview = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const productId = Number(req.params.id);
    const { userName, rating, comment } = req.body;

    if (isNaN(productId)) {
      throw new ErrorHandler("Invalid product ID", 400);
    }
    if (!userName || !rating || !comment) {
      throw new ErrorHandler("UserName, rating (1-5), and comment are required", 400);
    }

    const result = await addProductReviewService(productId, userName, Number(rating), comment);
    res.status(201).json(result);
  }
);

export const createProduct = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { title, description, price, category, images, colors, sizes } = req.body;

    if (!title || !description || price === undefined || !category) {
      throw new ErrorHandler("Title, description, price, and category are required", 400);
    }

    logger.info(`💼 [Admin] Creating new product: "${title}" by admin ${req.user?.email}`);

    const result = await createProductService({
      title,
      description,
      price: Number(price),
      category,
      images: Array.isArray(images) ? images : [],
      colors: Array.isArray(colors) ? colors : [],
      sizes: Array.isArray(sizes) ? sizes : [],
    });

    res.status(201).json(result);
  }
);

export const updateProduct = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      throw new ErrorHandler("Invalid product ID", 400);
    }

    logger.info(`💼 [Admin] Updating product ID ${id} by admin ${req.user?.email}`);

    const result = await updateProductService(id, req.body);
    res.status(200).json(result);
  }
);

export const deleteProduct = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      throw new ErrorHandler("Invalid product ID", 400);
    }

    logger.info(`💼 [Admin] Deleting product ID ${id} by admin ${req.user?.email}`);

    const result = await deleteProductService(id);
    res.status(200).json(result);
  }
);

export const getAdminStats = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    logger.info(`💼 [Admin] Retrieving store statistics by admin ${req.user?.email}`);
    const result = await getAdminStatsService();
    res.status(200).json(result);
  }
);

export const getAdminUsers = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    logger.info(`💼 [Admin] Retrieving user accounts list by admin ${req.user?.email}`);
    const result = await getAdminUsersService();
    res.status(200).json(result);
  }
);

export const getAdminReviews = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    logger.info(`💼 [Admin] Retrieving reviews logs by admin ${req.user?.email}`);
    const result = await getAdminReviewsService();
    res.status(200).json(result);
  }
);

export const deleteReview = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      throw new ErrorHandler("Invalid review ID", 400);
    }
    logger.info(`💼 [Admin] Deleting review ID ${id} by admin ${req.user?.email}`);
    const result = await deleteReviewService(id);
    res.status(200).json(result);
  }
);
