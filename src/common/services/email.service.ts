import { Resend } from "resend";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

// Cache logo base64 string in memory
let logoBase64 = "";
try {
  let logoPath = "/public/uploads/logo.jpeg";
  if (!fs.existsSync(logoPath)) {
    logoPath = path.join(process.cwd(), "public/uploads/logo.jpeg");
  }
  if (!fs.existsSync(logoPath)) {
    logoPath = path.join(process.cwd(), "public/logo.jpeg");
  }
  if (!fs.existsSync(logoPath)) {
    logoPath = path.join(__dirname, "../../../public/uploads/logo.jpeg");
  }
  if (!fs.existsSync(logoPath)) {
    logoPath = path.join(__dirname, "../../../public/logo.jpeg");
  }
  
  if (fs.existsSync(logoPath)) {
    logoBase64 = fs.readFileSync(logoPath).toString("base64");
    console.log("✅ Email service: Successfully loaded logo image at", logoPath);
  } else {
    console.warn("Logo file not found at path:", logoPath);
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

// ==================== UPDATED LIGHTWEIGHT EMAILS ====================

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
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#ffffff;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:30px 0;">
            <tr>
              <td align="center">
                <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="background:#0f0f0f;border:1px solid #222;border-radius:8px;overflow:hidden;">
                  <tr>
                    <td align="center" style="padding:40px 30px;">
                      <h2 style="color:#ffffff;margin:0 0 20px 0;">Welcome to MDFK Clothing, ${name}!</h2>
                      <p style="font-size:16px;color:#ddd;line-height:1.6;">
                        We are thrilled to have you here. Explore our latest collections and find the best fit for your style.
                      </p>
                      <p style="font-size:16px;color:#ddd;line-height:1.6;margin-top:20px;">
                        If you have any questions, feel free to reply to this email.
                      </p>
                      <p style="margin-top:30px;color:#888;font-size:14px;">Best regards,<br>MDFK Clothing Team</p>
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

    if (error) console.error("Error sending welcome email:", error);
    else console.log("Welcome email sent successfully to", email, "ID:", data?.id);
    
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
    const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const paymentMethod = order.paymentMethod || "CARD";
    const addressDetails = `${order.address || ""}, ${order.landmark ? order.landmark + ", " : ""}${order.city || ""}, ${order.state || ""} - ${order.pincode || ""}`;

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
          <td style="padding:10px 0;border-bottom:1px solid #222;">
            <div style="font-weight:600;color:#fff;">${item.title}</div>
            <div style="font-size:13px;color:#888;">${item.color || "N/A"} | ${item.size || "N/A"}</div>
          </td>
          <td align="center" style="padding:10px 0;border-bottom:1px solid #222;color:#fff;">${qty}</td>
          <td align="right" style="padding:10px 0;border-bottom:1px solid #222;color:#fff;font-weight:600;">$${totalItemPrice.toFixed(2)}</td>
        </tr>
      `;
    }

    const totalAmount = order.totalAmount || subtotal;
    const logoSrc = logoBase64 ? `data:image/jpeg;base64,${logoBase64}` : "https://mdfkclothing.com/logo.png";

    const { data, error } = await resend.emails.send({
      from: "MDFK Clothing <hello@mdfkclothing.com>",
      to: email,
      subject: `Order Confirmation #${orderId} - MDFK Clothing`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><title>Order Confirmed</title></head>
        <body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#ffffff;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:20px 0;">
            <tr>
              <td align="center">
                <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="background:#0f0f0f;border:1px solid #222;border-radius:8px;overflow:hidden;">
                  <tr><td align="center" style="padding:25px 0 15px;"><img src="${logoSrc}" width="75" alt="MDFK Logo"/></td></tr>
                  <tr><td align="center" style="padding:0 30px 20px;"><h1 style="margin:0;font-size:26px;font-weight:900;letter-spacing:2px;color:#ffffff;">ORDER CONFIRMED</h1></td></tr>
                  <tr><td style="padding:0 30px 25px;border-bottom:1px solid #222;text-align:center;">
                    <p style="margin:0;font-size:15.5px;color:#ddd;line-height:1.5;">Hi ${fullName}, thank you for your order! We've received your details and are preparing your items for shipment.</p>
                  </td></tr>
                  <tr><td style="padding:25px 30px;border-bottom:1px solid #222;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:50%;padding-right:15px;vertical-align:top;font-size:14px;">
                          <strong style="color:#888;font-size:12px;text-transform:uppercase;">Order Date</strong><br>${orderDate}<br><br>
                          <strong style="color:#888;font-size:12px;text-transform:uppercase;">Order Number</strong><br>#${orderId}
                        </td>
                        <td style="width:50%;vertical-align:top;font-size:14px;">
                          <strong style="color:#888;font-size:12px;text-transform:uppercase;">Payment</strong><br>${paymentMethod}<br><br>
                          <strong style="color:#888;font-size:12px;text-transform:uppercase;">Shipping To</strong><br><span style="line-height:1.45;">${addressDetails}</span>
                        </td>
                      </tr>
                    </table>
                  </td></tr>
                  <tr><td style="padding:25px 30px 15px;">
                    <h2 style="margin:0 0 12px 0;font-size:15px;text-transform:uppercase;letter-spacing:1px;color:#fff;">Items Ordered</h2>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <thead><tr style="border-bottom:1px solid #333;">
                        <th align="left" style="padding-bottom:8px;color:#888;font-size:12px;text-transform:uppercase;">Item</th>
                        <th align="center" style="padding-bottom:8px;color:#888;font-size:12px;text-transform:uppercase;">Qty</th>
                        <th align="right" style="padding-bottom:8px;color:#888;font-size:12px;text-transform:uppercase;">Price</th>
                      </tr></thead>
                      <tbody>${itemsHtml}</tbody>
                    </table>
                  </td></tr>
                  <tr><td style="padding:0 30px 30px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;padding:18px;border-radius:6px;">
                      <tr><td style="color:#aaa;">Subtotal</td><td align="right" style="color:#fff;">$${subtotal.toFixed(2)}</td></tr>
                      <tr><td style="color:#aaa;">Shipping</td><td align="right" style="color:#fff;">Free</td></tr>
                      <tr style="border-top:1px solid #333;">
                        <td style="padding-top:12px;font-size:17px;font-weight:700;">Total</td>
                        <td align="right" style="padding-top:12px;font-size:19px;font-weight:700;color:#fff;">$${Number(totalAmount).toFixed(2)}</td>
                      </tr>
                    </table>
                  </td></tr>
                  <tr><td align="center" style="padding:20px 30px 30px;border-top:1px solid #222;">
                    <p style="margin:0;color:#777;font-size:14px;">Any questions? Just reply to this email.</p>
                    <p style="margin:12px 0 0 0;color:#555;font-size:11px;">© 2026 MDFK CLOTHING CO.</p>
                  </td></tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) console.error("Error sending order confirmation email:", error);
    else console.log("Order confirmation email sent successfully to", email);

  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
  }
};

export const sendOrderDeliveredEmail = async (email: string, order: any) => {
  if (!resend) return;

  try {
    const fullName = order.fullName || "Customer";
    const orderId = order.id;
    const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const addressDetails = `${order.address || ""}, ${order.landmark ? order.landmark + ", " : ""}${order.city || ""}, ${order.state || ""} - ${order.pincode || ""}`;

    const logoSrc = logoBase64 ? `data:image/jpeg;base64,${logoBase64}` : "https://mdfkclothing.com/logo.png";

    const { data, error } = await resend.emails.send({
      from: "MDFK Clothing <hello@mdfkclothing.com>",
      to: email,
      subject: `Order Delivered #${orderId} - MDFK Clothing`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><title>Order Delivered</title></head>
        <body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#ffffff;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:20px 0;">
            <tr><td align="center">
              <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="background:#0f0f0f;border:1px solid #222;border-radius:8px;overflow:hidden;">
                <tr><td align="center" style="padding:25px 0 15px;"><img src="${logoSrc}" width="75" alt="MDFK Logo"/></td></tr>
                <tr><td align="center" style="padding:0 30px 20px;"><h1 style="margin:0;font-size:26px;font-weight:900;letter-spacing:2px;color:#ffffff;">ORDER DELIVERED</h1></td></tr>
                <tr><td style="padding:0 30px 25px;border-bottom:1px solid #222;text-align:center;">
                  <p style="margin:0;font-size:15.5px;color:#ddd;line-height:1.5;">Hi ${fullName}, your order #${orderId} has been successfully delivered!<br>We hope you love your new gear.</p>
                </td></tr>
                <tr><td style="padding:25px 30px;border-bottom:1px solid #222;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:50%;padding-right:15px;vertical-align:top;font-size:14px;">
                        <strong style="color:#888;font-size:12px;text-transform:uppercase;">Order Date</strong><br>${orderDate}<br><br>
                        <strong style="color:#888;font-size:12px;text-transform:uppercase;">Order Number</strong><br>#${orderId}
                      </td>
                      <td style="width:50%;vertical-align:top;font-size:14px;">
                        <strong style="color:#888;font-size:12px;text-transform:uppercase;">Delivered To</strong><br>${fullName}<br><br>
                        <strong style="color:#888;font-size:12px;text-transform:uppercase;">Address</strong><br><span style="line-height:1.45;">${addressDetails}</span>
                      </td>
                    </tr>
                  </table>
                </td></tr>
                <tr><td align="center" style="padding:30px;">
                  <a href="https://mdfkclothing.com/orders" style="background:#ffffff;color:#0a0a0a;padding:12px 28px;font-weight:600;letter-spacing:1px;border-radius:4px;text-decoration:none;display:inline-block;">VIEW YOUR ORDERS</a>
                </td></tr>
                <tr><td align="center" style="padding:20px 30px 30px;border-top:1px solid #222;">
                  <p style="margin:0;color:#777;font-size:14px;">Thank you for shopping with us!</p>
                  <p style="margin:12px 0 0 0;color:#555;font-size:11px;">© 2026 MDFK CLOTHING CO.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) console.error("Error:", error);
    else console.log("✅ Delivered email sent to", email);

  } catch (error) {
    console.error("Failed to send delivered email:", error);
  }
};

export const sendOrderInvoiceEmail = async (email: string, order: any) => {
  if (!resend) return;

  try {
    const fullName = order.fullName || "Customer";
    const orderId = order.id;
    const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const paymentMethod = order.paymentMethod || "CARD";
    const addressDetails = `${order.address || ""}, ${order.landmark ? order.landmark + ", " : ""}${order.city || ""}, ${order.state || ""} - ${order.pincode || ""}`;

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
          <td style="padding:10px 0;border-bottom:1px solid #222;">
            <div style="font-weight:600;color:#fff;">${item.title}</div>
            <div style="font-size:13px;color:#888;">${item.color || "N/A"} | ${item.size || "N/A"}</div>
          </td>
          <td align="center" style="padding:10px 0;border-bottom:1px solid #222;color:#fff;">${qty}</td>
          <td align="right" style="padding:10px 0;border-bottom:1px solid #222;color:#fff;">$${price.toFixed(2)}</td>
          <td align="right" style="padding:10px 0;border-bottom:1px solid #222;color:#fff;font-weight:600;">$${totalItemPrice.toFixed(2)}</td>
        </tr>
      `;
    }

    const totalAmount = order.totalAmount || subtotal;
    const logoSrc = logoBase64 ? `data:image/jpeg;base64,${logoBase64}` : "https://mdfkclothing.com/logo.png";

    const { data, error } = await resend.emails.send({
      from: "MDFK Clothing <hello@mdfkclothing.com>",
      to: email,
      subject: `Invoice for Order #${orderId} - MDFK Clothing`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><title>Tax Invoice</title></head>
        <body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#ffffff;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:20px 0;">
            <tr><td align="center">
              <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="background:#0f0f0f;border:1px solid #222;border-radius:8px;overflow:hidden;">
                <tr><td style="padding:20px 30px;border-bottom:1px solid #222;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td><img src="${logoSrc}" width="60" alt="MDFK Logo"/></td>
                      <td align="right"><h1 style="margin:0;font-size:22px;font-weight:900;letter-spacing:2px;">TAX INVOICE</h1></td>
                    </tr>
                  </table>
                </td></tr>
                <tr><td style="padding:25px 30px;border-bottom:1px solid #222;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:50%;padding-right:20px;vertical-align:top;font-size:14px;">
                        <strong style="color:#888;font-size:12px;text-transform:uppercase;">Billed To</strong><br>${fullName}<br>${addressDetails}
                      </td>
                      <td style="width:50%;vertical-align:top;font-size:14px;">
                        <strong style="color:#888;font-size:12px;text-transform:uppercase;">Invoice Date</strong><br>${orderDate}<br><br>
                        <strong style="color:#888;font-size:12px;text-transform:uppercase;">Payment</strong><br>${paymentMethod}
                      </td>
                    </tr>
                  </table>
                </td></tr>
                <tr><td style="padding:20px 30px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <thead><tr style="border-bottom:1px solid #333;">
                      <th align="left" style="padding-bottom:8px;color:#888;font-size:12px;text-transform:uppercase;">Item</th>
                      <th align="center" style="padding-bottom:8px;color:#888;font-size:12px;text-transform:uppercase;">Qty</th>
                      <th align="right" style="padding-bottom:8px;color:#888;font-size:12px;text-transform:uppercase;">Rate</th>
                      <th align="right" style="padding-bottom:8px;color:#888;font-size:12px;text-transform:uppercase;">Amount</th>
                    </tr></thead>
                    <tbody>${itemsHtml}</tbody>
                  </table>
                </td></tr>
                <tr><td style="padding:0 30px 30px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;padding:18px;border-radius:6px;">
                    <tr><td style="color:#aaa;">Subtotal</td><td align="right" style="color:#fff;">$${subtotal.toFixed(2)}</td></tr>
                    <tr><td style="color:#aaa;">Shipping</td><td align="right" style="color:#fff;">$0.00</td></tr>
                    <tr style="border-top:1px solid #333;">
                      <td style="padding-top:12px;font-size:17px;font-weight:700;">Total Paid</td>
                      <td align="right" style="padding-top:12px;font-size:19px;font-weight:700;color:#fff;">$${Number(totalAmount).toFixed(2)}</td>
                    </tr>
                  </table>
                </td></tr>
                <tr><td align="center" style="padding:20px 30px 30px;border-top:1px solid #222;">
                  <p style="margin:0;color:#777;font-size:13px;">Thank you for your business!</p>
                  <p style="margin:10px 0 0 0;color:#555;font-size:11px;">© 2026 MDFK CLOTHING CO.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) console.error("Error:", error);
    else console.log("✅ Invoice email sent to", email);

  } catch (error) {
    console.error("Failed to send invoice email:", error);
  }
};

export const sendNewOrderAlertEmail = async (order: any) => {
  if (!resend) return;

  try {
    const fullName = order.fullName || "Customer";
    const orderId = order.id;
    const emailAddr = order.email || "No Email Provided";
    const phone = order.phone || "No Phone Provided";
    const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
    const paymentMethod = order.paymentMethod || "COD";
    const addressDetails = `${order.address || ""}, ${order.landmark ? order.landmark + ", " : ""}${order.city || ""}, ${order.state || ""} - ${order.pincode || ""}`;

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
          <td style="padding:12px 0;border-bottom:1px solid #eee;">
            <div style="font-weight:600;">${item.title}</div>
            <div style="font-size:13px;color:#666;">${item.color || "N/A"} | ${item.size || "N/A"}</div>
          </td>
          <td align="center" style="padding:12px 0;border-bottom:1px solid #eee;">${qty}</td>
          <td align="right" style="padding:12px 0;border-bottom:1px solid #eee;font-weight:600;">$${price.toFixed(2)}</td>
        </tr>
      `;
    }

    const totalAmount = order.totalAmount || subtotal;
    const logoSrc = logoBase64 ? `data:image/jpeg;base64,${logoBase64}` : "https://mdfkclothing.com/logo.png";

    const { data, error } = await resend.emails.send({
      from: "MDFK Clothing Alerts <hello@mdfkclothing.com>",
      to: ["clothing.mdfk@gmail.com", "siradhanachetan14@gmail.com"],
      subject: `New Booking Created #${orderId} - MDFK Clothing`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><title>New Order Alert</title></head>
        <body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#333;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
            <tr><td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #ddd;border-radius:6px;overflow:hidden;">
                <tr><td style="background:#0a0a0a;padding:20px 25px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td><img src="${logoSrc}" width="60" alt="MDFK Logo"/></td>
                      <td align="right" style="color:#fff;font-weight:bold;letter-spacing:1px;">NEW ORDER ALERT</td>
                    </tr>
                  </table>
                </td></tr>
                <tr><td style="padding:30px 25px;">
                  <p style="font-size:15px;color:#555;">Hello Admin, a new order has been placed.</p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border:1px solid #eee;border-radius:4px;padding:20px;margin:20px 0;">
                    <tr>
                      <td style="line-height:1.8;">
                        <strong>Order ID:</strong> #${orderId}<br>
                        <strong>Date:</strong> ${orderDate}<br>
                        <strong>Payment:</strong> ${paymentMethod}
                      </td>
                      <td style="line-height:1.8;padding-left:30px;">
                        <strong>Customer:</strong> ${fullName}<br>
                        <strong>Email:</strong> ${emailAddr}<br>
                        <strong>Phone:</strong> ${phone}
                      </td>
                    </tr>
                    <tr><td colspan="2" style="padding-top:15px;border-top:1px solid #eee;margin-top:15px;">
                      <strong>Address:</strong><br>${addressDetails}
                    </td></tr>
                  </table>
                  <h3 style="margin:20px 0 10px 0;">Items</h3>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                    <thead><tr style="border-bottom:1px solid #ddd;">
                      <th align="left" style="padding-bottom:8px;color:#666;">Item</th>
                      <th align="center" style="padding-bottom:8px;color:#666;">Qty</th>
                      <th align="right" style="padding-bottom:8px;color:#666;">Price</th>
                    </tr></thead>
                    <tbody>${itemsHtml}</tbody>
                  </table>
                  <table width="100%" style="background:#f0f0f0;padding:15px;border-radius:4px;">
                    <tr><td style="font-weight:bold;">Total Amount</td><td align="right" style="font-size:18px;font-weight:bold;">$${Number(totalAmount).toFixed(2)}</td></tr>
                  </table>
                </td></tr>
                <tr><td align="center" style="background:#0a0a0a;padding:20px;color:#888;font-size:11px;">© 2026 MDFK CLOTHING CO. Admin Alerts</td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) console.error("Error:", error);
    else console.log("New order alert sent. ID:", data?.id);

  } catch (error) {
    console.error("Failed to send new order alert email:", error);
  }
};

export const sendOtpEmail = async (email: string, otp: string, reason: string): Promise<void> => {
  if (!resend) {
    console.warn("Resend client not initialized. OTP log:", otp, "for", email);
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "MDFK Clothing Verification <hello@mdfkclothing.com>",
      to: email,
      subject: `Your OTP Code for MDFK Clothing`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:20px auto;padding:25px;border:1px solid #eee;border-radius:8px;background:#fff;">
          <h2 style="text-align:center;color:#111;">Verification Code</h2>
          <p style="text-align:center;font-size:15px;color:#555;">We received a request to verify your email for <strong>${reason}</strong>.</p>
          <div style="background:#f6f6f6;padding:20px;margin:25px 0;text-align:center;border-radius:6px;">
            <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#111;font-family:monospace;">${otp}</span>
          </div>
          <p style="text-align:center;font-size:13px;color:#888;">This code is valid for 10 minutes.</p>
          <p style="text-align:center;font-size:11px;color:#aaa;margin-top:25px;">MDFK Clothing Co.</p>
        </div>
      `
    });

    if (error) console.error("Error sending OTP:", error);
    else console.log(`OTP email sent to ${email}`);

  } catch (err) {
    console.error("Failed to send OTP email:", err);
  }
};

export const sendContactEmail = async (data: { firstName: string; lastName: string; email: string; message: string }) => {
  if (!resend) {
    console.warn("Resend client not initialized. Skipping contact email send to clothing.mdfk@gmail.com");
    return;
  }

  try {
    const { data: resData, error } = await resend.emails.send({
      from: "MDFK Contact Form <hello@mdfkclothing.com>",
      to: "clothing.mdfk@gmail.com",
      subject: `New Contact Form Message from ${data.firstName} ${data.lastName}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:20px auto;padding:25px;border:1px solid #eee;border-radius:8px;background:#fff;color:#333;">
          <h2 style="color:#111;border-bottom:1px solid #eee;padding-bottom:10px;">New Contact Message Received</h2>
          <p style="font-size:14px;line-height:1.6;margin:15px 0;">
            <strong>From:</strong> ${data.firstName} ${data.lastName}<br/>
            <strong>Email:</strong> <a href="mailto:${data.email}" style="color:#1a73e8;">${data.email}</a>
          </p>
          <div style="background:#f9f9f9;padding:20px;margin:20px 0;border-radius:6px;border-left:4px solid #111;">
            <p style="margin:0;font-size:14px;white-space:pre-wrap;line-height:1.6;">${data.message}</p>
          </div>
          <p style="font-size:11px;color:#aaa;margin-top:25px;border-top:1px solid #eee;padding-top:10px;">MDFK Clothing Contact Notification</p>
        </div>
      `
    });

    if (error) console.error("Error sending contact email:", error);
    else console.log("Contact form email sent successfully to clothing.mdfk@gmail.com, ID:", resData?.id);
    return resData;
  } catch (err) {
    console.error("Failed to send contact form email:", err);
  }
};