import prisma from "../config/prisma.config";
import ErrorHandler from "../utils/errorHandler";

const BASE_URL = "https://shipping-api.com/app/api/v1";
const PUBLIC_KEY = "ZkH7LvJCKMUAejwQIWq6";
const PRIVATE_KEY = "ylBn8YvuqAQOIZhi2oWm";

const getHeaders = () => ({
  "public-key": PUBLIC_KEY,
  "private-key": PRIVATE_KEY,
  "Content-Type": "application/json",
});

/**
 * Calculates available courier shipping rates for checkout
 */
export const getShippingRates = async (
  deliveryPincode: number,
  totalAmount: number,
  items: any[]
) => {
  try {
    // 1. Get warehouse list to find default warehouse pincode
    const whRes = await fetch(`${BASE_URL}/get-warehouses`, {
      method: "GET",
      headers: getHeaders(),
    });
    const whData = await whRes.json();
    let pickupPincode = 122001; // default fallback from Shipmozo docs
    if (whData.result === "1" && whData.data && whData.data.length > 0) {
      const defWarehouse = whData.data.find((w: any) => w.default === "YES") || whData.data[0];
      if (defWarehouse.pincode) {
        pickupPincode = Number(defWarehouse.pincode);
      }
    }

    // 2. Compute total quantity and total weight (250g per t-shirt)
    let totalQty = 0;
    if (Array.isArray(items)) {
      totalQty = items.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
    } else {
      totalQty = 1;
    }
    const weightGrams = Math.max(210, totalQty * 210);

    // Dimensions: Length 30, Width 25, Height 3 cm per shirt
    const dimensions = [
      {
        no_of_box: "1",
        length: "30",
        width: "25",
        height: String(Math.max(3, totalQty * 3)),
      }
    ];

    // 3. Query Rate-Calculator API
    const body = {
      order_id: "",
      pickup_pincode: pickupPincode,
      delivery_pincode: deliveryPincode,
      payment_type: "COD",
      shipment_type: "FORWARD",
      order_amount: totalAmount,
      type_of_package: "SPS",
      rov_type: "ROV_OWNER",
      cod_amount: String(totalAmount),
      weight: weightGrams,
      dimensions,
    };

    console.log("Shipmozo Rate-Calculator Request:", JSON.stringify(body));

    const rateRes = await fetch(`${BASE_URL}/rate-calculator`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    
    const rateData = await rateRes.json();
    console.log("Shipmozo Rate-Calculator Response:", JSON.stringify(rateData));

    if (rateData.result === "1" && rateData.data) {
      return rateData.data;
    }
    
    return [];
  } catch (err: any) {
    console.error("Error fetching shipping rates from Shipmozo:", err.message);
    return [];
  }
};

/**
 * Pushes the order to Shipmozo and assigns the selected/auto-assigned courier
 */
export const pushAndAssignOrder = async (
  orderId: number,
  weightGrams?: number,
  dimensions?: { length: string; width: string; height: string },
  courierId?: number
) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new ErrorHandler("Order not found", 404);
  }

  try {
    // 1. Get warehouse list to find default warehouse ID
    const whRes = await fetch(`${BASE_URL}/get-warehouses`, {
      method: "GET",
      headers: getHeaders(),
    });
    const whData = await whRes.json();
    let warehouseId = "";
    if (whData.result === "1" && whData.data && whData.data.length > 0) {
      const defWarehouse = whData.data.find((w: any) => w.default === "YES") || whData.data[0];
      warehouseId = String(defWarehouse.id);
    } else {
      console.log("No active warehouse found or profile under verification. Using default empty string.");
    }

    // 2. Format order date (YYYY-MM-DD)
    const orderDate = new Date(order.createdAt).toISOString().split("T")[0];

    // 3. Compute weight & dimensions
    let totalQty = 0;
    const items = order.items as any[];
    if (Array.isArray(items)) {
      totalQty = items.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
    } else {
      totalQty = 1;
    }
    const finalWeight = weightGrams || Math.max(210, totalQty * 210);
    const finalL = dimensions?.length || "30";
    const finalW = dimensions?.width || "25";
    const finalH = dimensions?.height || String(Math.max(3, totalQty * 3));

    // Format product detail
    const productDetail = (items || []).map((item: any) => ({
      name: item.title,
      sku_number: String(item.productId),
      quantity: item.quantity || 1,
      discount: "",
      hsn: "#123",
      unit_price: item.price,
      product_category: "Clothing",
    }));

    // 4. Push Order
    const pushBody = {
      order_id: String(order.id),
      order_date: orderDate,
      order_type: "NON ESSENTIALS",
      consignee_name: order.fullName || "Consignee",
      consignee_phone: Number(order.phone || "9999999999"),
      consignee_email: order.email || "",
      consignee_address_line_one: order.address || "",
      consignee_address_line_two: order.landmark || "",
      consignee_pin_code: Number(order.pincode || "110001"),
      consignee_city: order.city || "",
      consignee_state: order.state || "",
      product_detail: productDetail,
      payment_type: order.paymentMethod === "COD" ? "COD" : "PREPAID",
      cod_amount: order.paymentMethod === "COD" ? String(order.totalAmount) : "",
      weight: finalWeight,
      length: Number(finalL),
      width: Number(finalW),
      height: Number(finalH),
      warehouse_id: warehouseId,
    };

    console.log("Shipmozo Push Order Request:", JSON.stringify(pushBody));

    const pushRes = await fetch(`${BASE_URL}/push-order`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(pushBody),
    });

    const pushData = await pushRes.json();
    console.log("Shipmozo Push Order Response:", JSON.stringify(pushData));

    if (pushData.result !== "1") {
      throw new Error(pushData.message || "Failed to push order to Shipmozo");
    }

    const shipmozoOrderId = pushData.data?.reference_id || String(order.id);

    // 5. Assign Courier
    let chosenCourierId = courierId || order.courierId;
    let courierCompany = "";
    let awbNumber = "";

    if (chosenCourierId) {
      console.log(`Assigning selected courier ID: ${chosenCourierId}...`);
      const assignRes = await fetch(`${BASE_URL}/assign-courier`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          order_id: String(order.id),
          courier_id: Number(chosenCourierId),
        }),
      });
      const assignData = await assignRes.json();
      console.log("Shipmozo Assign Courier Response:", JSON.stringify(assignData));
      
      if (assignData.result === "1" && assignData.data) {
        courierCompany = assignData.data.courier || "";
        awbNumber = assignData.data.awb_number || "";
      }
    } else {
      console.log("Auto-assigning courier...");
      const autoRes = await fetch(`${BASE_URL}/auto-assign-order`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          order_id: String(order.id),
        }),
      });
      const autoData = await autoRes.json();
      console.log("Shipmozo Auto-Assign Response:", JSON.stringify(autoData));
      if (autoData.result === "1" && autoData.data) {
        courierCompany = autoData.data.courier_company || "";
        awbNumber = autoData.data.awb_number || "";
      }
    }

    // 6. Schedule Pickup if we don't have an AWB yet
    if (!awbNumber) {
      console.log("Scheduling pickup to obtain AWB...");
      const pickupRes = await fetch(`${BASE_URL}/schedule-pickup`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          order_id: String(order.id),
        }),
      });
      const pickupData = await pickupRes.json();
      console.log("Shipmozo Schedule Pickup Response:", JSON.stringify(pickupData));
      if (pickupData.result === "1" && pickupData.data) {
        awbNumber = pickupData.data.awb_number || "";
        if (pickupData.data.courier) {
          courierCompany = pickupData.data.courier;
        }
      }
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "SHIPPED",
        shipmentId: shipmozoOrderId,
        awbNumber: awbNumber || null,
        courierName: courierCompany || null,
        shipmozoStatus: "PUSHED",
        shipmozoError: null,
      },
    });

    return {
      success: true,
      data: updated,
    };
  } catch (err: any) {
    console.error("Failed to push and assign order on Shipmozo:", err.message);
    await prisma.order.update({
      where: { id: orderId },
      data: {
        shipmozoStatus: "FAILED",
        shipmozoError: err.message || "Unknown error",
      },
    });
    throw new ErrorHandler(err.message || "Failed to ship order via Shipmozo", 400);
  }
};

/**
 * Pushes the return request details to Shipmozo return panel
 */
export const pushReturn = async (orderId: number, returnAddress: string) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new ErrorHandler("Order not found", 404);
  }

  try {
    const orderDate = new Date(order.createdAt).toISOString().split("T")[0];
    const items = order.items as any[];
    
    let totalQty = 0;
    if (Array.isArray(items)) {
      totalQty = items.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
    } else {
      totalQty = 1;
    }
    const weightKg = Math.max(0.21, totalQty * 0.21); // return package weight in kg (210g per shirt)

    const productDetail = (items || []).map((item: any) => ({
      name: item.title,
      sku_number: String(item.productId),
      quantity: item.quantity || 1,
      discount: "",
      hsn: "#123",
      unit_price: item.price,
      product_category: "Clothing",
    }));

    // Best effort pincode parsing
    let pinCode = Number(order.pincode || "110001");
    let city = order.city || "";
    let state = order.state || "";
    let addressLineOne = returnAddress;

    const pinRegex = /\b\d{6}\b/;
    const pinMatch = returnAddress.match(pinRegex);
    if (pinMatch) {
      pinCode = Number(pinMatch[0]);
    }

    const returnBody = {
      order_id: String(order.id),
      order_date: orderDate,
      order_type: "ESSENTIALS",
      pickup_name: order.fullName || "Consignee",
      pickup_phone: Number(order.phone || "9999999999"),
      pickup_email: order.email || "",
      pickup_address_line_one: addressLineOne.substring(0, 100),
      pickup_pin_code: pinCode,
      pickup_city: city || "City",
      pickup_state: state || "State",
      product_detail: productDetail,
      payment_type: "PREPAID",
      weight: weightKg,
      length: 30,
      width: 25,
      height: Math.max(3, totalQty * 3),
      return_reason_id: 14, // Other
      customer_request: "REFUND",
      reason_comment: "Customer return requested",
    };

    console.log("Shipmozo Push Return Request:", JSON.stringify(returnBody));

    const returnRes = await fetch(`${BASE_URL}/push-return-order`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(returnBody),
    });

    const returnData = await returnRes.json();
    console.log("Shipmozo Push Return Response:", JSON.stringify(returnData));

    if (returnData.result !== "1") {
      throw new Error(returnData.message || "Failed to push return order to Shipmozo");
    }

    const returnShipmentId = returnData.data?.reference_id || String(order.id);

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "RETURN_PENDING",
        returnAddress,
        returnShipmentId,
      },
    });

    return {
      success: true,
      returnShipmentId,
    };
  } catch (err: any) {
    console.error("Failed to push return to Shipmozo:", err.message);
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "RETURN_PENDING",
        returnAddress,
        shipmozoError: `Return Push Failed: ${err.message}`,
      },
    });
    return {
      success: false,
      error: err.message,
    };
  }
};

/**
 * Cancels the order in Shipmozo portal
 */
export const cancelOrder = async (orderId: number) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || !order.awbNumber) {
    return { success: false, message: "Order has no AWB to cancel on Shipmozo" };
  }

  try {
    const cancelRes = await fetch(`${BASE_URL}/cancel-order`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        order_id: String(order.id),
        awb_number: Number(order.awbNumber),
      }),
    });
    const cancelData = await cancelRes.json();
    console.log("Shipmozo Cancel Order Response:", JSON.stringify(cancelData));
    
    return {
      success: cancelData.result === "1",
      message: cancelData.message,
    };
  } catch (err: any) {
    console.error("Failed to cancel order on Shipmozo:", err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Tracks the live delivery status of the AWB
 */
export const trackOrder = async (awbNumber: string) => {
  try {
    const trackRes = await fetch(`${BASE_URL}/track-order?awb_number=${awbNumber}`, {
      method: "GET",
      headers: getHeaders(),
    });
    const trackData = await trackRes.json();
    console.log("Shipmozo Track Order Response:", JSON.stringify(trackData));
    
    if (trackData.result === "1" && trackData.data) {
      return {
        success: true,
        data: trackData.data,
      };
    }
    return {
      success: false,
      message: trackData.message || "Failed to fetch tracking details",
    };
  } catch (err: any) {
    console.error("Failed to track order on Shipmozo:", err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Fetches the base64 shipping label image
 */
export const getShippingLabel = async (awbNumber: string) => {
  try {
    const labelRes = await fetch(`${BASE_URL}/get-order-label/${awbNumber}`, {
      method: "GET",
      headers: getHeaders(),
    });
    const labelData = await labelRes.json();
    console.log("Shipmozo Get Label Response:", JSON.stringify(labelData));
    
    if (labelData.result === "1" && labelData.data && labelData.data.length > 0) {
      return {
        success: true,
        label: labelData.data[0].label,
        createdAt: labelData.data[0].created_at,
      };
    }
    return {
      success: false,
      message: labelData.message || "Failed to fetch shipping label",
    };
  } catch (err: any) {
    console.error("Failed to get label from Shipmozo:", err.message);
    return { success: false, error: err.message };
  }
};
