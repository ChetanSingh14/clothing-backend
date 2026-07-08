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
          name: order.fullName || "Customer Name",
          address: order.address || "No Address Provided",
          address_2: order.landmark || "",
          city: order.city || "",
          state: order.state || "",
          pincode: order.pincode || "110001",
          phone: order.phone || "9999999999"
        },
        pickup: {
          warehouse_name: process.env.NIMBUSPOST_WAREHOUSE_NAME || "warehouse 1",
          name: "MDFK Clothing",
          address: process.env.NIMBUSPOST_WAREHOUSE_ADDRESS || "Warehouse Address",
          address_2: "",
          city: process.env.NIMBUSPOST_WAREHOUSE_CITY || "Delhi",
          state: process.env.NIMBUSPOST_WAREHOUSE_STATE || "Delhi",
          pincode: process.env.NIMBUSPOST_WAREHOUSE_PINCODE || "110001",
          phone: process.env.NIMBUSPOST_WAREHOUSE_PHONE || "9999999999"
        },
        order_items: items.map((item: any) => ({
          name: item.title || "Product",
          qty: item.quantity || "1",
          price: item.price || "0",
          sku: `SKU-${item.id || 'GENERIC'}`
        }))
      };

      console.log(`[NimbusPost Ship] Package: ${totalQty} items, ${packageWeight}g, ${SHIRT_LENGTH_CM}x${SHIRT_BREADTH_CM}x${packageHeight}cm`);

      // Pass courier_id if available (stored from shipping calculation step)
      if (order.nimbuspostCourierId) {
        payload.courier_id = Number(order.nimbuspostCourierId);
        console.log(`[NimbusPost Ship] Using stored courier_id: ${payload.courier_id}`);
      } else {
        // No stored courier — run a quick serviceability check to pick one
        console.log(`[NimbusPost Ship] No stored courier_id. Running serviceability to find one...`);
        const rates = await this.calculateShippingRate(
          order.pincode || "110001",
          order.paymentMethod || "COD",
          order.totalAmount || 1000
        );
        if (rates.courierId) {
          payload.courier_id = Number(rates.courierId);
          console.log(`[NimbusPost Ship] Resolved courier_id from serviceability: ${payload.courier_id}`);
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
          // Could retry here, but throwing for now
      }
      logger.error(`Nimbuspost Create Shipment Error: ${error.message}`);
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
        console.log(`[NimbusPost Calculate] Credentials not configured. Using fallback charges. Pincode: ${deliveryPincode}`);
        return { shippingFee: 50, codFee: paymentMethod === "COD" ? 50 : 0, rtoFee: 50, courierId: null };
      }

      const headers = await this.getAuthHeaders();
      const payload = {
        origin: process.env.NIMBUSPOST_WAREHOUSE_PINCODE || "110001",
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
        } else {
          console.log(`[NimbusPost Calculate] No courier partners returned in API data.`);
        }
      } else {
        console.log(`[NimbusPost Calculate] API request failed or returned false status. Response:`, response?.data);
      }
      
      console.log(`[NimbusPost Calculate] Using fallback charges (₹50 Shipping, ${paymentMethod === "COD" ? "₹50" : "₹0"} COD, ₹50 RTO)`);
      return { shippingFee: 50, codFee: paymentMethod === "COD" ? 50 : 0, rtoFee: 50, courierId: null };
    } catch (error: any) {
      console.log(`[NimbusPost Calculate Error] Failed to calculate rate: ${error.message}. Using fallbacks.`);
      return { shippingFee: 50, codFee: paymentMethod === "COD" ? 50 : 0, rtoFee: 50, courierId: null };
    }
  }
}

export default NimbuspostService.getInstance();
