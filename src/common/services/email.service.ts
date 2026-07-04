import { Resend } from "resend";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

// Cache logo base64 string in memory
let logoBase64 = "";
try {
  const logoPath = "/public/uploads/logo.jpeg";
  if (fs.existsSync(logoPath)) {
    logoBase64 = fs.readFileSync(logoPath).toString("base64");
  }
} catch (err) {
  console.error("Failed to read logo image:", err);
}


const resendApiKey = process.env.RESEND_API_KEY;

let resend: Resend | null = null;
if (resendApiKey) {
  resend = new Resend(resendApiKey);
} else {
  console.warn("RESEND_API_KEY is not set. Email service is disabled.");
}

export const sendWelcomeEmail = async (email: string, name: string) => {
  if (!resend) {
    console.warn("Resend client not initialized. Skipping email send to:", email);
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "MDFK Clothing <hello@mdfkclothing.com>",
      to: email,
      subject: "Welcome to MDFK Clothing!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Welcome to MDFK Clothing, ${name}!</h2>
          <p style="font-size: 16px; color: #555;">
            We are thrilled to have you here. Explore our latest collections and find the best fit for your style.
          </p>
          <p style="font-size: 16px; color: #555;">
            If you have any questions, feel free to reply to this email.
          </p>
          <br />
          <p style="font-size: 14px; color: #888;">
            Best regards,<br />
            MDFK Clothing Team
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Error sending welcome email:", error);
    } else {
      console.log("Welcome email sent successfully to", email, "ID:", data?.id);
    }
    
    return data;
  } catch (error) {
    console.error("Failed to send welcome email:", error);
  }
};

export const sendOrderConfirmationEmail = async (email: string, order: any) => {
  if (!resend) {
    console.warn("Resend client not initialized. Skipping order confirmation email to:", email);
    return;
  }

  try {
    const fullName = order.fullName || "Customer";
    const orderId = order.id;
    const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const paymentMethod = order.paymentMethod || "COD";
    const addressDetails = `${order.address || ""}, ${order.landmark ? order.landmark + ", " : ""}${order.city || ""}, ${order.state || ""} - ${order.pincode || ""}`;

    // Calculate items HTML
    let itemsHtml = "";
    let subtotal = 0;
    const itemsList = Array.isArray(order.items) ? order.items : [];
    
    for (const item of itemsList) {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 1;
      const totalItemPrice = price * qty;
      subtotal += totalItemPrice;

      itemsHtml += `
        <tr>
          <td style="padding: 15px 0; border-bottom: 1px solid #222222; vertical-align: middle;">
            <div style="font-size: 14px; font-weight: bold; color: #ffffff;">${item.title}</div>
            <div style="font-size: 12px; color: #888888; margin-top: 4px;">Color: ${item.color || "N/A"} | Size: ${item.size || "N/A"}</div>
          </td>
          <td align="center" style="padding: 15px 0; border-bottom: 1px solid #222222; font-size: 14px; color: #ffffff; vertical-align: middle;">
            ${qty}
          </td>
          <td align="right" style="padding: 15px 0; border-bottom: 1px solid #222222; font-size: 14px; color: #ffffff; vertical-align: middle; font-weight: bold;">
            $${totalItemPrice.toFixed(2)}
          </td>
        </tr>
      `;
    }

    const totalAmount = order.totalAmount || subtotal;

    const logoSrc = logoBase64 
      ? `data:image/png;base64,${logoBase64}` 
      : "https://mdfkclothing.com/logo.png";

    const { data, error } = await resend.emails.send({
      from: "MDFK Clothing <hello@mdfkclothing.com>",
      to: email,
      subject: `Order Confirmation #${orderId} - MDFK Clothing`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Order Confirmed</title>
        </head>
        <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 0;">
            <tr>
              <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#0f0f0f; border:1px solid #222222; padding:40px; text-align: left;">
                  
                  <!-- Logo -->
                  <tr>
                    <td align="center" style="padding-bottom:30px;">
                      <img src="${logoSrc}" width="80" style="display:block; max-height:80px;" alt="MDFK Logo" />
                    </td>
                  </tr>

                  <!-- Title -->
                  <tr>
                    <td align="center" style="padding-bottom: 20px;">
                      <h1 style="font-size:24px; font-weight:900; letter-spacing: 2px; text-transform: uppercase; margin:0; color:#ffffff;">Order Confirmed</h1>
                    </td>
                  </tr>

                  <!-- Message -->
                  <tr>
                    <td align="center" style="padding-bottom: 40px; border-bottom: 1px solid #222222;">
                      <p style="font-size:15px; color:#a0a0a0; line-height:1.6; margin:0;">
                        Hi ${fullName}, thank you for your order! We've received your details and are getting your items ready for shipment. Below is a summary of your order.
                      </p>
                    </td>
                  </tr>

                  <!-- Details Grid -->
                  <tr>
                    <td style="padding: 30px 0; border-bottom: 1px solid #222222;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="width: 50%; vertical-align: top; font-size: 14px; color: #888888; line-height: 1.6;">
                            <strong style="color: #ffffff; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; display: block; margin-bottom: 4px;">Order Date</strong>
                            ${orderDate}<br/><br/>
                            <strong style="color: #ffffff; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; display: block; margin-bottom: 4px;">Order Number</strong>
                            #${orderId}
                          </td>
                          <td style="width: 50%; vertical-align: top; font-size: 14px; color: #888888; line-height: 1.6;">
                            <strong style="color: #ffffff; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; display: block; margin-bottom: 4px;">Payment Method</strong>
                            ${paymentMethod}<br/><br/>
                            <strong style="color: #ffffff; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; display: block; margin-bottom: 4px;">Shipping Address</strong>
                            ${addressDetails}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Items Section -->
                  <tr>
                    <td style="padding-top: 30px;">
                      <h2 style="font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 20px 0; color: #ffffff;">Items Ordered</h2>
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                        <thead>
                          <tr>
                            <th align="left" style="padding-bottom: 10px; color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: normal; border-bottom: 1px solid #222222;">Item</th>
                            <th align="center" style="padding-bottom: 10px; color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: normal; border-bottom: 1px solid #222222;">Qty</th>
                            <th align="right" style="padding-bottom: 10px; color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: normal; border-bottom: 1px solid #222222;">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${itemsHtml}
                        </tbody>
                      </table>
                    </td>
                  </tr>

                  <!-- Totals -->
                  <tr>
                    <td style="padding: 20px 0; background-color: #141414; padding: 20px; border-radius: 4px; border: 1px solid #222222;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="font-size: 14px; color: #888888; padding: 5px 0;">Subtotal</td>
                          <td align="right" style="font-size: 14px; color: #ffffff; padding: 5px 0;">$${subtotal.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td style="font-size: 14px; color: #888888; padding: 5px 0;">Shipping</td>
                          <td align="right" style="font-size: 14px; color: #ffffff; padding: 5px 0;">Free</td>
                        </tr>
                        <tr>
                          <td style="font-size: 16px; font-weight: bold; color: #ffffff; padding: 15px 0 0 0; border-top: 1px solid #222222; margin-top: 10px;">Total</td>
                          <td align="right" style="font-size: 18px; font-weight: bold; color: #ffffff; padding: 15px 0 0 0; border-top: 1px solid #222222; margin-top: 10px;">$${Number(totalAmount).toFixed(2)}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Help / Support Footer -->
                  <tr>
                    <td align="center" style="padding-top: 40px; padding-bottom: 20px; border-bottom: 1px solid #222222;">
                      <p style="font-size:13px; color:#888888; line-height:1.6; margin:0;">
                        If you have any questions, feel free to reply directly to this email or contact support at <a href="mailto:support@mdfkclothing.com" style="color:#ffffff; text-decoration:underline;">support@mdfkclothing.com</a>.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td align="center" style="padding-top: 30px;">
                      <p style="font-size:11px; color:#555555; margin:0; text-transform: uppercase; letter-spacing: 1px;">
                        &copy; 2026 MDFK CLOTHING CO. All rights reserved.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error sending order confirmation email:", error);
    } else {
      console.log("Order confirmation email sent successfully to", email, "ID:", data?.id);
    }

    return data;
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
  }
};

export const sendOrderDeliveredEmail = async (email: string, order: any) => {
  if (!resend) {
    console.warn("Resend client not initialized. Skipping order delivered email to:", email);
    return;
  }

  try {
    const fullName = order.fullName || "Customer";
    const orderId = order.id;
    const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const addressDetails = `${order.address || ""}, ${order.landmark ? order.landmark + ", " : ""}${order.city || ""}, ${order.state || ""} - ${order.pincode || ""}`;

    const logoSrc = logoBase64 
      ? `data:image/png;base64,${logoBase64}` 
      : "https://mdfkclothing.com/logo.png";

    const { data, error } = await resend.emails.send({
      from: "MDFK Clothing <hello@mdfkclothing.com>",
      to: email,
      subject: `Order Delivered #${orderId} - MDFK Clothing`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Order Delivered</title>
        </head>
        <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 0;">
            <tr>
              <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#0f0f0f; border:1px solid #222222; padding:40px; text-align: left;">
                  
                  <!-- Logo -->
                  <tr>
                    <td align="center" style="padding-bottom:30px;">
                      <img src="${logoSrc}" width="80" style="display:block; max-height:80px;" alt="MDFK Logo" />
                    </td>
                  </tr>

                  <!-- Title -->
                  <tr>
                    <td align="center" style="padding-bottom: 20px;">
                      <h1 style="font-size:24px; font-weight:900; letter-spacing: 2px; text-transform: uppercase; margin:0; color:#ffffff;">Order Delivered</h1>
                    </td>
                  </tr>

                  <!-- Message -->
                  <tr>
                    <td align="center" style="padding-bottom: 40px; border-bottom: 1px solid #222222;">
                      <p style="font-size:15px; color:#a0a0a0; line-height:1.6; margin:0;">
                        Hi ${fullName}, your order #${orderId} has been successfully delivered! We hope you love your new gear. Thank you for shopping with us.
                      </p>
                    </td>
                  </tr>

                  <!-- Details Grid -->
                  <tr>
                    <td style="padding: 30px 0; border-bottom: 1px solid #222222;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="width: 50%; vertical-align: top; font-size: 14px; color: #888888; line-height: 1.6;">
                            <strong style="color: #ffffff; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; display: block; margin-bottom: 4px;">Order Date</strong>
                            ${orderDate}<br/><br/>
                            <strong style="color: #ffffff; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; display: block; margin-bottom: 4px;">Order Number</strong>
                            #${orderId}
                          </td>
                          <td style="width: 50%; vertical-align: top; font-size: 14px; color: #888888; line-height: 1.6;">
                            <strong style="color: #ffffff; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; display: block; margin-bottom: 4px;">Delivered To</strong>
                            ${fullName}<br/><br/>
                            <strong style="color: #ffffff; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; display: block; margin-bottom: 4px;">Delivery Address</strong>
                            ${addressDetails}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Call to Action -->
                  <tr>
                    <td align="center" style="padding: 40px 0; border-bottom: 1px solid #222222;">
                      <p style="font-size:14px; color:#888888; margin-bottom:20px;">We value your opinion. Let us know how we did!</p>
                      <a href="https://mdfkclothing.com/orders" style="background-color:#ffffff; color:#0a0a0a; text-decoration:none; padding:12px 30px; font-size:13px; font-weight:bold; letter-spacing:1px; text-transform:uppercase; border-radius:4px; display:inline-block;">Review Your Items</a>
                    </td>
                  </tr>

                  <!-- Help / Support Footer -->
                  <tr>
                    <td align="center" style="padding-top: 40px; padding-bottom: 20px; border-bottom: 1px solid #222222;">
                      <p style="font-size:13px; color:#888888; line-height:1.6; margin:0;">
                        If you have any questions, feel free to reply directly to this email or contact support at <a href="mailto:support@mdfkclothing.com" style="color:#ffffff; text-decoration:underline;">support@mdfkclothing.com</a>.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td align="center" style="padding-top: 30px;">
                      <p style="font-size:11px; color:#555555; margin:0; text-transform: uppercase; letter-spacing: 1px;">
                        &copy; 2026 MDFK CLOTHING CO. All rights reserved.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error sending order delivered email:", error);
    } else {
      console.log("Order delivered email sent successfully to", email, "ID:", data?.id);
    }

    return data;
  } catch (error) {
    console.error("Failed to send order delivered email:", error);
  }
};

export const sendOrderInvoiceEmail = async (email: string, order: any) => {
  if (!resend) {
    console.warn("Resend client not initialized. Skipping order invoice email to:", email);
    return;
  }

  try {
    const fullName = order.fullName || "Customer";
    const orderId = order.id;
    const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const paymentMethod = order.paymentMethod || "COD";
    const addressDetails = `${order.address || ""}, ${order.landmark ? order.landmark + ", " : ""}${order.city || ""}, ${order.state || ""} - ${order.pincode || ""}`;

    // Calculate items HTML
    let itemsHtml = "";
    let subtotal = 0;
    const itemsList = Array.isArray(order.items) ? order.items : [];
    
    for (const item of itemsList) {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 1;
      const totalItemPrice = price * qty;
      subtotal += totalItemPrice;

      itemsHtml += `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #1a1a1a; vertical-align: top;">
            <div style="font-size: 13px; font-weight: bold; color: #ffffff;">${item.title}</div>
            <div style="font-size: 11px; color: #888888; margin-top: 2px;">Color: ${item.color || "N/A"} | Size: ${item.size || "N/A"}</div>
          </td>
          <td align="center" style="padding: 12px 0; border-bottom: 1px solid #1a1a1a; font-size: 13px; color: #ffffff; vertical-align: top;">
            ${qty}
          </td>
          <td align="right" style="padding: 12px 0; border-bottom: 1px solid #1a1a1a; font-size: 13px; color: #ffffff; vertical-align: top; font-weight: bold;">
            $${price.toFixed(2)}
          </td>
          <td align="right" style="padding: 12px 0; border-bottom: 1px solid #1a1a1a; font-size: 13px; color: #ffffff; vertical-align: top; font-weight: bold;">
            $${totalItemPrice.toFixed(2)}
          </td>
        </tr>
      `;
    }

    const totalAmount = order.totalAmount || subtotal;
    const taxAmount = totalAmount * 0.18; // 18% tax included in total
    const subtotalBeforeTax = totalAmount - taxAmount;

    const logoSrc = logoBase64 
      ? `data:image/png;base64,${logoBase64}` 
      : "https://mdfkclothing.com/logo.png";

    const { data, error } = await resend.emails.send({
      from: "MDFK Clothing <hello@mdfkclothing.com>",
      to: email,
      subject: `Invoice for Order #${orderId} - MDFK Clothing`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Tax Invoice</title>
        </head>
        <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 0;">
            <tr>
              <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#0f0f0f; border:1px solid #222222; padding:40px; text-align: left;">
                  
                  <!-- Logo & Invoice Header -->
                  <tr>
                    <td style="padding-bottom:30px; border-bottom: 1px solid #222222;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="vertical-align: middle;">
                            <img src="${logoSrc}" width="60" style="display:block; max-height:60px;" alt="MDFK Logo" />
                          </td>
                          <td align="right" style="vertical-align: middle; color: #ffffff;">
                            <h1 style="font-size: 20px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin: 0;">TAX INVOICE</h1>
                            <p style="font-size: 12px; color: #888888; margin: 5px 0 0 0;">Invoice Number: INV-2026-${orderId}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Billing Info Grid -->
                  <tr>
                    <td style="padding: 30px 0; border-bottom: 1px solid #222222;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="width: 50%; vertical-align: top; font-size: 13px; color: #888888; line-height: 1.6;">
                            <strong style="color: #ffffff; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; display: block; margin-bottom: 4px;">Company Details</strong>
                            <strong>MDFK CLOTHING CO.</strong><br/>
                            123 Streetwear Ave,<br/>
                            Fashion District, NY 10001<br/>
                            support@mdfkclothing.com
                          </td>
                          <td style="width: 50%; vertical-align: top; font-size: 13px; color: #888888; line-height: 1.6;">
                            <strong style="color: #ffffff; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; display: block; margin-bottom: 4px;">Billed To</strong>
                            <strong>${fullName}</strong><br/>
                            ${addressDetails}<br/>
                            Email: ${email}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Invoice Meta -->
                  <tr>
                    <td style="padding: 20px 0; border-bottom: 1px solid #222222; background-color: #141414; padding: 20px; border-radius: 4px; border: 1px solid #222222; margin-top: 20px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="font-size: 12px; color: #888888;"><strong>Invoice Date:</strong> ${orderDate}</td>
                          <td style="font-size: 12px; color: #888888;"><strong>Order ID:</strong> #${orderId}</td>
                          <td style="font-size: 12px; color: #888888;" align="right"><strong>Payment:</strong> ${paymentMethod}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Line Items -->
                  <tr>
                    <td style="padding-top: 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                        <thead>
                          <tr>
                            <th align="left" style="padding-bottom: 10px; color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: normal; border-bottom: 1px solid #222222;">Item</th>
                            <th align="center" style="padding-bottom: 10px; color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: normal; border-bottom: 1px solid #222222;">Qty</th>
                            <th align="right" style="padding-bottom: 10px; color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: normal; border-bottom: 1px solid #222222;">Rate</th>
                            <th align="right" style="padding-bottom: 10px; color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: normal; border-bottom: 1px solid #222222;">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${itemsHtml}
                        </tbody>
                      </table>
                    </td>
                  </tr>

                  <!-- Totals -->
                  <tr>
                    <td style="padding: 20px 0; border-top: 1px solid #222222;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="font-size: 13px; color: #888888; padding: 4px 0;">Subtotal (Before Tax)</td>
                          <td align="right" style="font-size: 13px; color: #ffffff; padding: 4px 0;">$${subtotalBeforeTax.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td style="font-size: 13px; color: #888888; padding: 4px 0;">Tax (GST/VAT 18% Incl.)</td>
                          <td align="right" style="font-size: 13px; color: #ffffff; padding: 4px 0;">$${taxAmount.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td style="font-size: 13px; color: #888888; padding: 4px 0;">Shipping & Handling</td>
                          <td align="right" style="font-size: 13px; color: #ffffff; padding: 4px 0;">$0.00</td>
                        </tr>
                        <tr>
                          <td style="font-size: 15px; font-weight: bold; color: #ffffff; padding: 15px 0 0 0; border-top: 1px solid #222222; margin-top: 10px;">Total (Paid)</td>
                          <td align="right" style="font-size: 17px; font-weight: bold; color: #ffffff; padding: 15px 0 0 0; border-top: 1px solid #222222; margin-top: 10px;">$${Number(totalAmount).toFixed(2)}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td align="center" style="padding-top: 40px; border-top: 1px solid #222222;">
                      <p style="font-size:11px; color:#555555; margin:0; text-transform: uppercase; letter-spacing: 1px;">
                        Thank you for your business! &copy; 2026 MDFK CLOTHING CO.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error sending order invoice email:", error);
    } else {
      console.log("Order invoice email sent successfully to", email, "ID:", data?.id);
    }

    return data;
  } catch (error) {
    console.error("Failed to send order invoice email:", error);
  }
};
