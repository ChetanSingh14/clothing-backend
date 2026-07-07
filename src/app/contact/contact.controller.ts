import { Request, Response, NextFunction } from "express";
import { catchAsyncError } from "../../common/utils/errorHandler";
import { sendContactEmail } from "../../common/services/email.service";

export const submitContactForm = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { firstName, lastName, email, message } = req.body;
    if (!firstName || !lastName || !email || !message) {
      res.status(400).json({ success: false, message: "All fields are required" });
      return;
    }

    await sendContactEmail({ firstName, lastName, email, message });

    res.status(200).json({
      success: true,
      message: "Message sent successfully",
    });
  }
);
