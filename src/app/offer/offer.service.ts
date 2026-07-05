import prisma from "../../common/config/prisma.config";
import ErrorHandler from "../../common/utils/errorHandler";

/**
 * Claim the QR scan offer — one time per user
 * Generates a random ₹30-40 discount
 */
export const claimOfferService = async (userId: number) => {
  // Check if user has already claimed
  const existing = await prisma.offerClaim.findUnique({
    where: { userId },
  });

  if (existing) {
    if (existing.isUsed) {
      throw new ErrorHandler("You have already used this offer on a previous order.", 400);
    }
    // Already claimed but not used — return it
    return {
      success: true,
      message: "Offer already claimed! Use it on your next order.",
      data: {
        discountAmount: existing.discountAmount,
        isUsed: existing.isUsed,
        claimedAt: existing.createdAt,
      },
    };
  }

  // Generate random discount ₹30-40
  const discountAmount = Math.floor(Math.random() * 11) + 30;

  const claim = await prisma.offerClaim.create({
    data: {
      userId,
      discountAmount,
    },
  });

  return {
    success: true,
    message: `Congratulations! You got ₹${discountAmount} off on your next order!`,
    data: {
      discountAmount: claim.discountAmount,
      isUsed: claim.isUsed,
      claimedAt: claim.createdAt,
    },
  };
};

/**
 * Check offer status for logged-in user
 */
export const getOfferStatusService = async (userId: number) => {
  const claim = await prisma.offerClaim.findUnique({
    where: { userId },
  });

  if (!claim) {
    return {
      success: true,
      data: { hasClaimed: false, hasOffer: false },
    };
  }

  return {
    success: true,
    data: {
      hasClaimed: true,
      hasOffer: !claim.isUsed, // Has active (unused) offer
      discountAmount: claim.discountAmount,
      isUsed: claim.isUsed,
      usedAt: claim.usedAt,
      claimedAt: claim.createdAt,
    },
  };
};

/**
 * Use the offer during checkout — mark as used
 * Returns discount amount, called internally from order service
 */
export const useOfferService = async (userId: number) => {
  const claim = await prisma.offerClaim.findUnique({
    where: { userId },
  });

  if (!claim || claim.isUsed) {
    return null; // No active offer
  }

  await prisma.offerClaim.update({
    where: { userId },
    data: {
      isUsed: true,
      usedAt: new Date(),
    },
  });

  return claim.discountAmount;
};
