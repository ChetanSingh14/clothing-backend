import axios from "axios";
import ErrorHandler from "../utils/errorHandler";
import { logger } from "../utils/logger.utils";
import dotenv from "dotenv";

dotenv.config();

const NIMBUSPOST_BASE_URL = "https://api.nimbuspost.com/v1";

class NimbuspostService {
  private static instance: NimbuspostService;
  private token: string | null = null;

  private constructor() {}

  public static getInstance(): NimbuspostService {
    if (!NimbuspostService.instance) {
      NimbuspostService.instance = new NimbuspostService();
    }
    return NimbuspostService.instance;
  }

  private async login(): Promise<string> {
    try {
      const email = process.env.NIMBUSPOST_EMAIL;
      const password = process.env.NIMBUSPOST_PASSWORD;

      if (!email || !password) {
        throw new ErrorHandler("Nimbuspost credentials not configured", 500);
      }

      const response = await axios.post(`${NIMBUSPOST_BASE_URL}/users/login`, {
        email,
        password,
      });

      if (response.data.status === true && response.data.data) {
         const token = response.data.data;
         this.token = token;
         return token;
      } else {
        throw new ErrorHandler("Failed to authenticate with Nimbuspost", 500);
      }
    } catch (error: any) {
      logger.error(`Nimbuspost Login Error: ${error.message}`);
      throw new ErrorHandler(error.response?.data?.message || "Failed to authenticate with Nimbuspost", 500);
    }
  }

  private async getAuthHeaders(): Promise<{ Authorization: string, "Content-Type": string }> {
    if (!this.token) {
      await this.login();
    }
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  public async createShipment(order: any, items: any[]): Promise<any> {
    try {
      let headers = await this.getAuthHeaders();

      // Per-shirt estimated dimensions
      const SHIRT_WEIGHT_G = 280;
      const SHIRT_LENGTH_CM = 33;
      const SHIRT_BREADTH_CM = 25;
      const SHIRT_HEIGHT_CM = 3;

      // Calculate total quantity from items
      const totalQty = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 1), 0);
      const packageWeight = SHIRT_WEIGHT_G * totalQty;
      const packageHeight = SHIRT_HEIGHT_CM * totalQty;
      
      if (!order.fullName) throw new ErrorHandler("Consignee name is required", 400);
      if (!order.address) throw new ErrorHandler("Consignee address is required", 400);
      if (!order.pincode) throw new ErrorHandler("Consignee pincode is required", 400);
      if (!order.phone) throw new ErrorHandler("Consignee phone number is required", 400);

      const warehouseName = process.env.NIMBUSPOST_WAREHOUSE_NAME;
      const warehouseAddress = process.env.NIMBUSPOST_WAREHOUSE_ADDRESS;
      const warehouseCity = process.env.NIMBUSPOST_WAREHOUSE_CITY;
      const warehouseState = process.env.NIMBUSPOST_WAREHOUSE_STATE;
      const warehousePincode = process.env.NIMBUSPOST_WAREHOUSE_PINCODE;
      const warehousePhone = process.env.NIMBUSPOST_WAREHOUSE_PHONE;

      if (!warehouseName || !warehouseAddress || !warehouseCity || !warehouseState || !warehousePincode || !warehousePhone) {
        throw new ErrorHandler("Nimbuspost warehouse configuration is incomplete", 500);
      }

      const orderItems = items.map((item: any) => {
        if (!item.title) throw new ErrorHandler("Item title is required", 400);
        if (!item.quantity) throw new ErrorHandler("Item quantity is required", 400);
        if (!item.price) throw new ErrorHandler("Item price is required", 400);
        return {
          name: item.title,
          qty: item.quantity,
          price: item.price,
          sku: `SKU-${item.id || 'GENERIC'}`
        };
      });

      const payload: any = {
        order_number: `#${order.id}`,
        shipping_charges: 0,
        discount: 0,
        cod_charges: 0,
        payment_type: order.paymentMethod === "COD" ? "cod" : "prepaid",
        order_amount: order.totalAmount,
        package_weight: packageWeight,
        package_length: SHIRT_LENGTH_CM,
        package_breadth: SHIRT_BREADTH_CM,
        package_height: packageHeight,
        consignee: {
          name: order.fullName,
          address: order.address,
          address_2: order.landmark || "",
          city: order.city || "",
          state: order.state || "",
          pincode: order.pincode,
          phone: order.phone
        },
        pickup: {
          warehouse_name: warehouseName,
          name: "MDFK Clothing",
          address: warehouseAddress,
          address_2: "",
          city: warehouseCity,
          state: warehouseState,
          pincode: warehousePincode,
          phone: warehousePhone
        },
        order_items: orderItems
      };

      console.log(`[NimbusPost Ship] Package: ${totalQty} items, ${packageWeight}g, ${SHIRT_LENGTH_CM}x${SHIRT_BREADTH_CM}x${packageHeight}cm`);

      // Pass courier_id if available (stored from shipping calculation step)
      if (order.nimbuspostCourierId) {
        payload.courier_id = Number(order.nimbuspostCourierId);
        console.log(`[NimbusPost Ship] Using stored courier_id: ${payload.courier_id}`);
      } else {
        // No stored courier — run a quick serviceability check to pick one
        console.log(`[NimbusPost Ship] No stored courier_id. Running serviceability to find one...`);
        if (!order.paymentMethod) throw new ErrorHandler("Order payment method is required", 400);
        if (!order.totalAmount) throw new ErrorHandler("Order total amount is required", 400);

        const rates = await this.calculateShippingRate(
          order.pincode,
          order.paymentMethod,
          Number(order.totalAmount),
          totalQty
        );
        if (rates.courierId) {
          payload.courier_id = Number(rates.courierId);
          console.log(`[NimbusPost Ship] Resolved courier_id from serviceability: ${payload.courier_id}`);
        } else {
          throw new ErrorHandler("Failed to resolve courier ID for shipment", 400);
        }
      }

      let response = await axios.post(`${NIMBUSPOST_BASE_URL}/shipments`, payload, { headers });
      
      // If unauthorized, retry login once
      if (response.data.status === false && response.data.message === "Unauthorized") {
         await this.login();
         headers = await this.getAuthHeaders();
         response = await axios.post(`${NIMBUSPOST_BASE_URL}/shipments`, payload, { headers });
      }

      if (response.data.status === true) {
        return response.data.data;
      } else {
        throw new ErrorHandler(response.data.message || "Failed to create shipment", 500);
      }
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
          // Token expired, retry once
          this.token = null;
      }
      logger.error(`Nimbuspost Create Shipment Error: ${error.message}`);
      if (error instanceof ErrorHandler) throw error;
      throw new ErrorHandler(error.response?.data?.message || error.message || "Failed to create shipment", 500);
    }
  }

  public async trackShipment(awb: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.post(`${NIMBUSPOST_BASE_URL}/shipments/track/bulk`, {
          awb: [awb]
      }, { headers });

      if (response.data.status === true && response.data.data && response.data.data.length > 0) {
        return response.data.data[0];
      } else {
        throw new ErrorHandler("Record not found", 404);
      }
    } catch (error: any) {
      logger.error(`Nimbuspost Track Shipment Error: ${error.message}`);
      throw new ErrorHandler(error.response?.data?.message || "Failed to track shipment", 500);
    }
  }

  public async cancelShipment(awb: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      // Assuming cancel endpoint is /shipments/cancel according to some patterns, 
      // User doc just says POST Cancel Shipment, Cancel Shipment : { "status": false, "message": "Unable to cancel" }
      const response = await axios.post(`${NIMBUSPOST_BASE_URL}/shipments/cancel`, {
          awb: awb
      }, { headers });

      if (response.data.status === true) {
        return response.data;
      } else {
        throw new ErrorHandler(response.data.message || "Unable to cancel", 400);
      }
    } catch (error: any) {
      logger.error(`Nimbuspost Cancel Shipment Error: ${error.message}`);
      throw new ErrorHandler(error.response?.data?.message || "Unable to cancel", 500);
    }
  }
  public async calculateShippingRate(deliveryPincode: string, paymentMethod: string, orderAmount: number = 1000, totalQuantity: number = 1): Promise<{ shippingFee: number, codFee: number, rtoFee: number, courierId: number | null }> {
    try {
      // Per-shirt estimated dimensions
      const SHIRT_WEIGHT_G = 280;
      const SHIRT_LENGTH_CM = 33;
      const SHIRT_BREADTH_CM = 25;
      const SHIRT_HEIGHT_CM = 3;

      const packageWeight = SHIRT_WEIGHT_G * Math.max(1, totalQuantity);
      const packageHeight = SHIRT_HEIGHT_CM * Math.max(1, totalQuantity);

      const email = process.env.NIMBUSPOST_EMAIL;
      const password = process.env.NIMBUSPOST_PASSWORD;
      if (!email || !password) {
        throw new ErrorHandler("Nimbuspost credentials not configured", 500);
      }

      const originPincode = process.env.NIMBUSPOST_WAREHOUSE_PINCODE;
      if (!originPincode) {
        throw new ErrorHandler("Nimbuspost warehouse pincode is not configured", 500);
      }

      const headers = await this.getAuthHeaders();
      const payload = {
        origin: originPincode,
        destination: deliveryPincode,
        package_weight: packageWeight,
        package_length: SHIRT_LENGTH_CM,
        package_breadth: SHIRT_BREADTH_CM,
        package_height: packageHeight,
        payment_type: paymentMethod === "COD" ? "cod" : "prepaid",
        order_amount: orderAmount,
      };

      console.log(`[NimbusPost Calculate] Package: ${totalQuantity} items, ${packageWeight}g, ${SHIRT_LENGTH_CM}x${SHIRT_BREADTH_CM}x${packageHeight}cm`);
      console.log(`[NimbusPost Calculate] Requesting serviceability for Pincode: ${deliveryPincode}, Payment: ${paymentMethod}`);
      const response = await axios.post(`${NIMBUSPOST_BASE_URL}/courier/serviceability`, payload, { headers });
      
      if (response.data.status === true && response.data.data) {
        let courierList = response.data.data;
        if (courierList.data && Array.isArray(courierList.data)) {
          courierList = courierList.data;
        }
        
        if (Array.isArray(courierList) && courierList.length > 0) {
          console.log(`[NimbusPost Calculate] Sample courier structure:`, JSON.stringify(courierList[0], null, 2));
          console.log(`[NimbusPost Calculate] Found ${courierList.length} courier options.`);

          // Filter for forward couriers (exclude reverse)
          const forwardCouriers = courierList.filter((c: any) => 
            !c.reverse && 
            !c.reverse_qc && 
            !(c.name || "").toLowerCase().includes("reverse")
          );

          console.log(`[NimbusPost Calculate] Found ${forwardCouriers.length} forward courier options:`);
          
          let cheapestCourier: any = null;
          let cheapestTotal = Infinity;

          forwardCouriers.forEach((c: any) => {
            const freight = Number(c.freight_charges ?? c.rate ?? c.freight_charge ?? c.charge ?? c.rate_amount ?? c.shipping_charge ?? 0);
            const cod = Number(c.cod_charges ?? c.cod_charge ?? c.cod ?? 0);
            const rto = freight; // RTO is typically equal to forward freight charges
            const cId = c.courier_id ?? c.id ?? null;
            
            // Total evaluated cost = delivery freight + COD fee + RTO fee
            const total = freight + (paymentMethod === "COD" ? cod : 0) + rto;
            
            console.log(`  - Courier: ${c.name || 'Unknown'} (ID: ${cId}), Freight: ₹${freight}, COD Fee: ₹${cod}, RTO Fee: ₹${rto}, Evaluation Total: ₹${total}`);
            
            if (freight > 0 && total < cheapestTotal) {
              cheapestTotal = total;
              cheapestCourier = {
                shippingFee: Math.ceil(freight),
                codFee: paymentMethod === "COD" ? Math.ceil(cod) : 0,
                rtoFee: Math.ceil(rto),
                name: c.name,
                courierId: cId,
              };
            }
          });

          if (cheapestCourier) {
            console.log(`[NimbusPost Calculate] Selected Cheapest Option: ${cheapestCourier.name} (ID: ${cheapestCourier.courierId}, Shipping: ₹${cheapestCourier.shippingFee}, COD: ₹${cheapestCourier.codFee}, RTO: ₹${cheapestCourier.rtoFee}, Eval Total: ₹${cheapestTotal})`);
            return { shippingFee: cheapestCourier.shippingFee, codFee: cheapestCourier.codFee, rtoFee: cheapestCourier.rtoFee, courierId: cheapestCourier.courierId };
          }
        }
        throw new ErrorHandler("No shipping services available for this pincode", 400);
      } else {
        throw new ErrorHandler(response.data?.message || "Failed to calculate shipping rates", 400);
      }
    } catch (error: any) {
      logger.error(`[NimbusPost Calculate Error] Failed to calculate rate: ${error.message}`);
      if (error instanceof ErrorHandler) throw error;
      throw new ErrorHandler(error.response?.data?.message || error.message || "Failed to calculate shipping rate", error.response?.status || 500);
    }
  }
}

export default NimbuspostService.getInstance();
