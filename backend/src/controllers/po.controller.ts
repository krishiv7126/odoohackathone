import { Response } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { createActivityLog } from "../services/log.service";
import { sendEmail } from "../services/email.service";

// Get PO listing
export async function getPOs(req: AuthenticatedRequest, res: Response) {
  try {
    const whereClause: any = {};

    // Role-based scoping: Vendor only sees POs sent to them
    if (req.user?.roleName === "VENDOR") {
      if (!req.user.vendorId) {
        return res.status(400).json({ message: "Vendor profile not linked" });
      }
      whereClause.vendorId = req.user.vendorId;
      whereClause.status = { in: ["SENT", "COMPLETED", "CANCELLED"] }; // Hide DRAFT from vendors
    }

    const pos = await prisma.purchaseOrder.findMany({
      where: whereClause,
      include: {
        vendor: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(pos);
  } catch (error) {
    console.error("Error fetching POs:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Get PO details by ID
export async function getPOById(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        poItems: true,
        quotation: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!po) {
      return res.status(404).json({ message: "Purchase Order not found" });
    }

    // Role scoping
    if (req.user?.roleName === "VENDOR" && req.user.vendorId !== po.vendorId) {
      return res.status(403).json({ message: "Forbidden: Access restricted to your own POs" });
    }

    return res.status(200).json(po);
  } catch (error) {
    console.error("Error fetching PO detail:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Send PO to Vendor (State: DRAFT -> SENT)
export async function sendPO(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
      },
    });

    if (!po) {
      return res.status(404).json({ message: "Purchase Order not found" });
    }

    if (po.status !== "DRAFT") {
      return res.status(400).json({ message: "Purchase Order has already been sent" });
    }

    const updatedPo = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: "SENT" },
    });

    // Automated Audit Log for PO Generated/Dispatched
    await createActivityLog(
      req.user!.userId,
      "PO_DISPATCHED",
      "PO",
      po.id,
      req.ip,
      `Purchase Order ${po.poNumber} dispatched to ${po.vendor.name} for grand total INR ${po.grandTotal.toFixed(2)}.`
    );

    // Send email alert to Vendor
    const emailSubject = `Purchase Order Issued: ${po.poNumber}`;
    const emailBody = `
      Dear ${po.vendor.contactName},

      We are pleased to issue a Purchase Order to you.

      PO Number: ${po.poNumber}
      Total Value: INR ${po.grandTotal.toFixed(2)}
      Delivery Date: ${new Date(po.deliveryDate).toLocaleDateString()}

      Please log in to your VendorBridge portal to accept this PO, download the official order details, and submit your invoice once items are shipped.

      Regards,
      Procurement Team
      VendorBridge ERP
    `;
    sendEmail(po.vendor.contactEmail, emailSubject, emailBody).catch((err) => {
      console.error(`Email sending failed for PO ${po.poNumber}:`, err);
    });

    return res.status(200).json(updatedPo);
  } catch (error) {
    console.error("Error sending PO:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
