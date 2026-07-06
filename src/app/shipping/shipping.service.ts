import prisma from "../../common/config/prisma.config";
import ErrorHandler from "../../common/utils/errorHandler";
import { logger } from "../../common/utils/logger.utils";

// Address sanitizer helper as per Delhivery requirements (Step 5)
export const sanitizeAddress = (address: string): string => {
  if (!address) return "";
  return address.replace(/[&#;]/g, " ").trim();
};

// Phone number sanitizer helper for Delhivery (strictly 10-digit numeric string)
export const sanitizePhone = (phone: string): string => {
  if (!phone) return "";
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    cleaned = cleaned.substring(2);
  }
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.length > 10) {
    cleaned = cleaned.slice(-10);
  }
  return cleaned;
};

export const checkServiceabilityService = async (pincode: string) => {
  const baseUrl = process.env.DELHIVERY_BASE_URL;
  const apiToken = process.env.DELHIVERY_API_TOKEN;

  if (!baseUrl || !apiToken) {
    logger.error("Delhivery credentials missing in environment variables.");
    throw new ErrorHandler("Delhivery configuration missing on server", 500);
  }

  try {
    const url = `${baseUrl}/c/api/pin-codes/json/?filter_codes=${pincode}`;
    logger.info(`🔍 [Delhivery] Checking serviceability for pincode: ${pincode}`);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Token ${apiToken}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Delhivery serviceability request failed: ${response.status} - ${errorText}`);
      throw new ErrorHandler("Failed to verify pincode with Delhivery", response.status);
    }

    const data = await response.json();
    const deliveryCodes = data?.delivery_codes || [];

    if (deliveryCodes.length === 0) {
      return { serviceable: false, cod: "N" };
    }

    const postalCode = deliveryCodes[0]?.postal_code;
    const serviceable = postalCode?.pre_paid === "Y" || postalCode?.cod === "Y";
    const cod = postalCode?.cod || "N";

    return {
      serviceable,
      cod
    };
  } catch (error: any) {
    logger.error(`Error checking serviceability: ${error.message}`);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Error querying shipping serviceability", 500);
  }
};

export const generateManifestService = async (orderId: number) => {
  const baseUrl = process.env.DELHIVERY_BASE_URL;
  const apiToken = process.env.DELHIVERY_API_TOKEN;
  const pickupLocation = process.env.DELHIVERY_PICKUP_LOCATION || "Warehouse Primary";

  if (!baseUrl || !apiToken) {
    logger.error("Delhivery credentials missing in environment variables.");
    throw new ErrorHandler("Delhivery configuration missing on server", 500);
  }

  // Retrieve order details
  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });

  if (!order) {
    throw new ErrorHandler("Order not found", 404);
  }

  if (order.delhivery_waybill) {
    return {
      success: true,
      message: "Waybill already generated for this order",
      waybill: order.delhivery_waybill
    };
  }

  // Validate address details
  if (!order.address || !order.pincode || !order.phone) {
    throw new ErrorHandler("Incomplete shipping details on the order", 400);
  }

  // Calculate order weight in Grams (strictly integers, default to 500g per item if weight not present in system)
  let totalQuantity = 0;
  let itemsArray: any[] = [];
  try {
    itemsArray = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items as any[]);
  } catch (e) {
    itemsArray = Array.isArray(order.items) ? order.items : [];
  }

  itemsArray.forEach((item: any) => {
    totalQuantity += Number(item.quantity || 1);
  });

  // Calculate total weight (e.g. 500g per garment)
  const weightInGrams = Math.max(500, totalQuantity * 500); 

  // Format order date to Delhivery format: YYYY-MM-DD HH:MM:SS
  const formatDelhiveryDate = (date: Date) => {
    const pad = (num: number) => String(num).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  const orderDateFormatted = formatDelhiveryDate(new Date(order.createdAt));

  // Sanitize addresses (Step 5)
  const sanitizedAddress = sanitizeAddress(order.address);
  const sanitizedLandmark = order.landmark ? sanitizeAddress(order.landmark) : "";

  // Build the Delhivery CMU payload
  const payload = {
    shipments: [
      {
        order: `ORD-${order.id}`,
        waybill: "", // Let Delhivery auto-assign
        payment_mode: order.paymentMethod === "COD" ? "COD" : "Pre-paid",
        cod_amount: order.paymentMethod === "COD" ? order.totalAmount : 0,
        weight: weightInGrams,
        quantity: totalQuantity || 1,
        consignee: {
          name: order.fullName || `Customer-${order.userId}`,
          address: sanitizedAddress,
          address2: sanitizedLandmark,
          city: order.city || "",
          state: order.state || "",
          pincode: order.pincode,
          phone: sanitizePhone(order.phone)
        },
        pickup_location: pickupLocation,
        order_date: orderDateFormatted,
        package_type: "Package"
      }
    ]
  };

  try {
    logger.info(`📦 [Delhivery] Creating shipment manifest for Order #${order.id}`);

    // Data passed as application/x-www-form-urlencoded with data as stringified json inside
    const bodyParams = new URLSearchParams();
    bodyParams.append("format", "json");
    bodyParams.append("data", JSON.stringify(payload));

    const response = await fetch(`${baseUrl}/api/cmu/create.json`, {
      method: "POST",
      headers: {
        "Authorization": `Token ${apiToken}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: bodyParams.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Delhivery CMU manifest creation failed: ${response.status} - ${errorText}`);
      throw new ErrorHandler("Delhivery manifest creation request failed", response.status);
    }

    const result = await response.json();
    
    // Validate response
    if (result.success === false || !result.packages || result.packages.length === 0) {
      const errorMessage = result.rmk || "Unknown error from Delhivery manifestation API";
      logger.error(`Delhivery returned failure: ${JSON.stringify(result)}`);
      throw new ErrorHandler(`Delhivery failed: ${errorMessage}`, 400);
    }

    const packageInfo = result.packages[0];
    
    if (packageInfo.status === "Fail" || !packageInfo.waybill) {
      const pkgErrorMessage = packageInfo.remarks || "Failed to generate waybill for package";
      logger.error(`Delhivery package creation failed: ${JSON.stringify(packageInfo)}`);
      throw new ErrorHandler(`Delhivery Package Error: ${pkgErrorMessage}`, 400);
    }

    const waybill = String(packageInfo.waybill);
    logger.info(`✅ [Delhivery] Shipment manifest generated successfully. Waybill: ${waybill}`);

    // Save waybill to order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        delhivery_waybill: waybill,
        shipment_status: "pending_pickup"
      }
    });

    return {
      success: true,
      message: "Delhivery waybill generated and manifest created successfully",
      waybill
    };
  } catch (error: any) {
    logger.error(`Error generating Delhivery manifest: ${error.message}`);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Error contacting shipping carrier API", 500);
  }
};

export const calculateRateService = async (
  destinationPincode: string,
  weightInGrams: number,
  codAmount: number
) => {
  const baseUrl = process.env.DELHIVERY_BASE_URL || "https://track.delhivery.com";
  const apiToken = process.env.DELHIVERY_API_TOKEN;
  const originPincode = process.env.DELHIVERY_ORIGIN_PINCODE || "110001";

  if (!apiToken) {
    logger.warn("Delhivery credentials missing for rate calculation.");
    return {
      shippingFee: 90,
      codHandlingCharge: 50,
      totalAdditionalCharges: 140,
      isFallback: true
    };
  }

  // Build URLs for correct Invoice charges API (charges/.json)
  const prepaidUrl = `${baseUrl}/api/kinko/v1/invoice/charges/.json?md=E&cgm=${weightInGrams}&o_pin=${originPincode}&d_pin=${destinationPincode}&ss=Delivered&pt=Pre-paid`;
  const codUrl = `${baseUrl}/api/kinko/v1/invoice/charges/.json?md=E&cgm=${weightInGrams}&o_pin=${originPincode}&d_pin=${destinationPincode}&ss=Delivered&pt=COD`;

  logger.info(`🚚 [Delhivery API] Querying live invoice charges from ${originPincode} to ${destinationPincode} (Weight: ${weightInGrams}g)`);

  try {
    const headers = {
      "Authorization": `Token ${apiToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    };

    const [prepaidRes, codRes] = await Promise.all([
      fetch(prepaidUrl, { method: "GET", headers }),
      fetch(codUrl, { method: "GET", headers })
    ]);

    if (!prepaidRes.ok || !codRes.ok) {
      logger.warn(`Delhivery charges API returned non-OK status (Prepaid: ${prepaidRes.status}, COD: ${codRes.status}). Using local cost calculation fallback.`);
      const baseShipping = 90;
      const weightSurcharge = Math.max(0, Math.ceil((weightInGrams - 500) / 500)) * 20;
      const shippingFee = baseShipping + weightSurcharge;
      return {
        shippingFee,
        codHandlingCharge: 50,
        totalAdditionalCharges: shippingFee + 50,
        isFallback: true
      };
    }

    const prepaidResult = await prepaidRes.json();
    const codResult = await codRes.json();

    let shippingFee = 90;
    if (Array.isArray(prepaidResult) && prepaidResult[0] && typeof prepaidResult[0].total_amount === "number") {
      shippingFee = prepaidResult[0].total_amount;
    }

    let codTotal = shippingFee + 50;
    if (Array.isArray(codResult) && codResult[0] && typeof codResult[0].total_amount === "number") {
      codTotal = codResult[0].total_amount;
    }

    const codHandlingCharge = Math.max(0, codTotal - shippingFee);

    return {
      shippingFee: Number(shippingFee.toFixed(2)),
      codHandlingCharge: Number(codHandlingCharge.toFixed(2)),
      totalAdditionalCharges: Number(codTotal.toFixed(2)),
      isFallback: false
    };
  } catch (error: any) {
    logger.error(`Error querying Delhivery live invoice rates: ${error.message}. Using fallback.`);
    const baseShipping = 90;
    const weightSurcharge = Math.max(0, Math.ceil((weightInGrams - 500) / 500)) * 20;
    const shippingFee = baseShipping + weightSurcharge;
    return {
      shippingFee,
      codHandlingCharge: 50,
      totalAdditionalCharges: shippingFee + 50,
      isFallback: true
    };
  }
};

export const trackShipmentService = async (waybill: string) => {
  const baseUrl = process.env.DELHIVERY_BASE_URL || "https://track.delhivery.com";
  const apiToken = process.env.DELHIVERY_API_TOKEN;

  if (!apiToken) {
    throw new ErrorHandler("Delhivery configuration missing on server", 500);
  }

  const url = `${baseUrl}/api/v1/packages/json/?waybill=${waybill}`;
  logger.info(`🔍 [Delhivery API] Querying live tracking for waybill: ${waybill}`);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Token ${apiToken}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new ErrorHandler("Failed to query tracking info from Delhivery", response.status);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    logger.error(`Error querying Delhivery tracking: ${error.message}`);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Error contacting shipping carrier API", 500);
  }
};
