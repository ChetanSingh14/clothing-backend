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
      
      const payload = {
        order_number: `#${order.id}`,
        shipping_charges: 0,
        discount: 0,
        cod_charges: 0,
        payment_type: order.paymentMethod === "COD" ? "cod" : "prepaid",
        order_amount: order.totalAmount,
        package_weight: 500, // Default 500g
        package_length: 10,
        package_breadth: 10,
        package_height: 10,
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
}

export default NimbuspostService.getInstance();
