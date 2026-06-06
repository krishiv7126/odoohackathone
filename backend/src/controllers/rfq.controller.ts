import { Response } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { createActivityLog } from "../services/log.service";
import { sendEmail } from "../services/email.service";

// Get RFQ listing (scoped by role)
export async function getRfqs(req: AuthenticatedRequest, res: Response) {
  const { status, search } = req.query;

  try {
    const whereClause: any = {};

    if (status) {
      whereClause.status = status as string;
    }

    if (search) {
      whereClause.OR = [
        { rfqNumber: { contains: search as string } },
        { title: { contains: search as string } },
      ];
    }

    // Role-based scoping: Vendor can only see RFQs assigned to them (and non-DRAFT)
    if (req.user?.roleName === "VENDOR") {
      if (!req.user.vendorId) {
        return res.status(400).json({ message: "Vendor profile not linked to user account" });
      }

      whereClause.status = { in: ["SENT", "CLOSED", "COMPLETED"] }; // Never show DRAFT to vendors
      whereClause.rfqVendors = {
        some: {
          vendorId: req.user.vendorId,
        },
      };
    }

    const rfqs = await prisma.rfq.findMany({
      where: whereClause,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            rfqItems: true,
            rfqVendors: true,
            quotations: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(rfqs);
  } catch (error) {
    console.error("Error fetching RFQs:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Get RFQ by ID
export async function getRfqById(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    const rfq = await prisma.rfq.findUnique({
      where: { id },
      include: {
        rfqItems: true,
        rfqAttachments: true,
        rfqVendors: {
          include: {
            vendor: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!rfq) {
      return res.status(404).json({ message: "RFQ not found" });
    }

    // Security check: Vendor must be assigned and RFQ must be published
    if (req.user?.roleName === "VENDOR") {
      if (!req.user.vendorId) {
        return res.status(400).json({ message: "Vendor profile not linked" });
      }

      const isAssigned = rfq.rfqVendors.some(rv => rv.vendorId === req.user?.vendorId);
      if (!isAssigned || rfq.status === "DRAFT") {
        return res.status(403).json({ message: "Forbidden: You are not assigned to this RFQ" });
      }

      // Mark the RFQ vendor assignment status as VIEWED if it was PENDING
      const currentAssignment = rfq.rfqVendors.find(rv => rv.vendorId === req.user?.vendorId);
      if (currentAssignment && currentAssignment.status === "PENDING") {
        await prisma.rfqVendor.update({
          where: { id: currentAssignment.id },
          data: { status: "VIEWED" },
        });
      }
    }

    return res.status(200).json(rfq);
  } catch (error) {
    console.error("Error fetching RFQ detail:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Create new RFQ in DRAFT state
export async function createRfq(req: AuthenticatedRequest, res: Response) {
  const { title, description, dueDate, items } = req.body;

  if (!title || !dueDate || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "RFQ Title, Due Date, and Line Items are required" });
  }

  try {
    // Generate unique RFQ Number (RFQ-YYYY-XXXX)
    const year = new Date().getFullYear();
    const count = await prisma.rfq.count();
    const sequence = String(count + 1).padStart(4, "0");
    const rfqNumber = `RFQ-${year}-${sequence}`;

    const rfq = await prisma.rfq.create({
      data: {
        rfqNumber,
        title,
        description,
        dueDate: new Date(dueDate),
        status: "DRAFT",
        createdById: req.user!.userId,
        rfqItems: {
          create: items.map((item: any) => ({
            productName: item.productName,
            description: item.description,
            quantity: Number(item.quantity),
            uom: item.uom,
            targetPrice: item.targetPrice ? Number(item.targetPrice) : null,
          })),
        },
      },
      include: { rfqItems: true },
    });

    // Automated Audit Log for RFQ Created
    await createActivityLog(
      req.user!.userId,
      "RFQ_CREATED",
      "RFQ",
      rfq.id,
      req.ip,
      `RFQ ${rfqNumber} ("${title}") created in DRAFT state.`
    );

    return res.status(201).json(rfq);
  } catch (error) {
    console.error("Error creating RFQ:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Assign vendors to RFQ
export async function assignVendors(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { vendorIds } = req.body; // Array of vendor UUIDs

  if (!vendorIds || !Array.isArray(vendorIds)) {
    return res.status(400).json({ message: "vendorIds must be an array" });
  }

  try {
    const rfq = await prisma.rfq.findUnique({ where: { id } });
    if (!rfq) {
      return res.status(404).json({ message: "RFQ not found" });
    }

    if (rfq.status !== "DRAFT") {
      return res.status(400).json({ message: "Can only assign vendors to DRAFT RFQs" });
    }

    // Delete existing assignments first (full overwrite)
    await prisma.rfqVendor.deleteMany({ where: { rfqId: id } });

    // Create new assignments
    const assignments = await Promise.all(
      vendorIds.map((vId) =>
        prisma.rfqVendor.create({
          data: {
            rfqId: id,
            vendorId: vId,
            status: "PENDING",
          },
        })
      )
    );

    return res.status(200).json({ message: "Vendors assigned successfully", assignments });
  } catch (error) {
    console.error("Error assigning vendors to RFQ:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Publish RFQ: state transitions from DRAFT -> SENT
export async function sendRfq(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    const rfq = await prisma.rfq.findUnique({
      where: { id },
      include: {
        rfqVendors: {
          include: { vendor: true },
        },
      },
    });

    if (!rfq) {
      return res.status(404).json({ message: "RFQ not found" });
    }

    if (rfq.status !== "DRAFT") {
      return res.status(400).json({ message: "RFQ has already been sent/closed" });
    }

    if (rfq.rfqVendors.length === 0) {
      return res.status(400).json({ message: "Cannot publish RFQ without assigning any vendors" });
    }

    // Transition status
    const updatedRfq = await prisma.rfq.update({
      where: { id },
      data: { status: "SENT" },
    });

    // Automated Audit Log for RFQ Sent
    await createActivityLog(
      req.user!.userId,
      "RFQ_SENT",
      "RFQ",
      rfq.id,
      req.ip,
      `RFQ ${rfq.rfqNumber} sent/broadcasted to ${rfq.rfqVendors.length} vendors.`
    );

    // Trigger emails to all assigned vendors
    for (const assignment of rfq.rfqVendors) {
      const emailSubject = `Request for Quotation: ${rfq.rfqNumber} - ${rfq.title}`;
      const emailBody = `
        Dear ${assignment.vendor.contactName},

        You have received a new Request for Quotation (RFQ) from VendorBridge ERP.

        RFQ Number: ${rfq.rfqNumber}
        Title: ${rfq.title}
        Due Date: ${new Date(rfq.dueDate).toLocaleDateString()}

        Please log in to your VendorBridge portal to submit your quotation before the due date.

        Regards,
        Procurement Team
        VendorBridge ERP
      `;
      // Send email service (asynchronously)
      sendEmail(assignment.vendor.contactEmail, emailSubject, emailBody).catch((err) => {
        console.error(`Email sending failed for ${assignment.vendor.name}:`, err);
      });
    }

    return res.status(200).json(updatedRfq);
  } catch (error) {
    console.error("Error publishing RFQ:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Upload attachment to RFQ
export async function uploadAttachment(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ message: "No file was uploaded" });
  }

  try {
    const rfq = await prisma.rfq.findUnique({ where: { id } });
    if (!rfq) {
      return res.status(404).json({ message: "RFQ not found" });
    }

    const attachment = await prisma.rfqAttachment.create({
      data: {
        rfqId: id,
        fileName: req.file.originalname,
        filePath: `/uploads/${req.file.filename}`,
        uploadedBy: req.user!.userId,
      },
    });

    return res.status(201).json(attachment);
  } catch (error) {
    console.error("Error uploading RFQ attachment:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
