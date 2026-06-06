import { Response } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { createActivityLog } from "../services/log.service";

// Submit Quotation (Vendor only)
export async function submitQuotation(req: AuthenticatedRequest, res: Response) {
  const { rfqId, validityDate, notes, items } = req.body;

  if (!rfqId || !validityDate || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "rfqId, validityDate, and items are required" });
  }

  const vendorId = req.user?.vendorId;
  if (!vendorId) {
    return res.status(403).json({ message: "Forbidden: Only users linked to active Vendor profiles can submit quotations" });
  }

  try {
    const rfq = await prisma.rfq.findUnique({ where: { id: rfqId } });
    if (!rfq) {
      return res.status(404).json({ message: "RFQ not found" });
    }

    if (rfq.status !== "SENT") {
      return res.status(400).json({ message: "Can only submit quotations for active SENT RFQs" });
    }

    // Verify vendor is assigned to RFQ
    const assignment = await prisma.rfqVendor.findUnique({
      where: { uq_rfq_vendor: { rfqId, vendorId } },
    });

    if (!assignment) {
      return res.status(403).json({ message: "Forbidden: You are not assigned to submit a quotation for this RFQ" });
    }

    // Fetch vendor details to determine GST region (Intra-state vs Inter-state)
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    // Calculate subtotal
    let subtotal = 0;
    const itemsToCreate = [];

    for (const item of items) {
      const rfqItem = await prisma.rfqItem.findUnique({ where: { id: item.rfqItemId } });
      if (!rfqItem || rfqItem.rfqId !== rfqId) {
        return res.status(400).json({ message: `Invalid RFQ Item ID: ${item.rfqItemId}` });
      }

      const qty = Number(rfqItem.quantity);
      const unitPrice = Number(item.unitPrice);
      const totalPrice = unitPrice * qty;
      subtotal += totalPrice;

      itemsToCreate.push({
        rfqItemId: item.rfqItemId,
        unitPrice,
        totalPrice,
        leadTimeDays: Number(item.leadTimeDays || 7),
        notes: item.notes || null,
      });
    }

    // India GST Logic
    // Organization's Maharashtra state code is "27"
    // GSTIN's first 2 digits represent state code.
    const companyStateCode = "27";
    const vendorStateCode = vendor.taxId.substring(0, 2);

    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    const standardGstRate = 0.18; // 18% standard rate

    if (vendorStateCode === companyStateCode) {
      // Intra-state: CGST (9%) + SGST (9%)
      cgst = subtotal * (standardGstRate / 2);
      sgst = subtotal * (standardGstRate / 2);
    } else {
      // Inter-state: IGST (18%)
      igst = subtotal * standardGstRate;
    }

    const grandTotal = subtotal + cgst + sgst + igst;

    // Generate unique Quotation Number
    const count = await prisma.quotation.count();
    const quotationNumber = `QT-2026-${String(count + 1).padStart(4, "0")}`;

    const quotation = await prisma.quotation.create({
      data: {
        rfqId,
        vendorId,
        quotationNumber,
        status: "SUBMITTED",
        subtotal,
        cgst,
        sgst,
        igst,
        grandTotal,
        validityDate: new Date(validityDate),
        notes,
        quotationItems: {
          create: itemsToCreate,
        },
      },
      include: {
        quotationItems: true,
      },
    });

    // Update assignment status
    await prisma.rfqVendor.update({
      where: { uq_rfq_vendor: { rfqId, vendorId } },
      data: { status: "SUBMITTED" },
    });

    // Automated Audit Log for Quotation Submitted
    await createActivityLog(
      req.user!.userId,
      "QUOTATION_SUBMITTED",
      "QUOTATION",
      quotation.id,
      req.ip,
      `Quotation ${quotationNumber} submitted by ${vendor.name} for RFQ ${rfq.rfqNumber}. Grand Total: INR ${grandTotal.toFixed(2)}`
    );

    return res.status(201).json(quotation);
  } catch (error) {
    console.error("Error submitting quotation:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// List all quotations
export async function getQuotations(req: AuthenticatedRequest, res: Response) {
  const { rfqId } = req.query;

  try {
    const whereClause: any = {};

    if (rfqId) {
      whereClause.rfqId = rfqId as string;
    }

    // Role-based scoping: Vendor only sees their own quotations
    if (req.user?.roleName === "VENDOR") {
      if (!req.user.vendorId) {
        return res.status(400).json({ message: "Vendor profile not linked" });
      }
      whereClause.vendorId = req.user.vendorId;
    }

    const quotations = await prisma.quotation.findMany({
      where: whereClause,
      include: {
        rfq: true,
        vendor: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(quotations);
  } catch (error) {
    console.error("Error fetching quotations:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Get quotation details by ID
export async function getQuotationById(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        rfq: true,
        vendor: true,
        quotationItems: {
          include: {
            rfqItem: true,
          },
        },
      },
    });

    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    // Role scoping: Vendor can only see their own quotation
    if (req.user?.roleName === "VENDOR" && req.user.vendorId !== quotation.vendorId) {
      return res.status(403).json({ message: "Forbidden: Access restricted to your own quotations" });
    }

    return res.status(200).json(quotation);
  } catch (error) {
    console.error("Error fetching quotation details:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Compare quotations side-by-side for an RFQ (Procurement / Manager)
export async function getCompareQuotations(req: AuthenticatedRequest, res: Response) {
  const { rfqId } = req.params;

  try {
    const rfq = await prisma.rfq.findUnique({
      where: { id: rfqId },
      include: {
        rfqItems: true,
      },
    });

    if (!rfq) {
      return res.status(404).json({ message: "RFQ not found" });
    }

    const quotations = await prisma.quotation.findMany({
      where: {
        rfqId,
        status: { in: ["SUBMITTED", "UNDER_REVIEW", "APPROVED"] },
      },
      include: {
        vendor: true,
        quotationItems: true,
      },
    });

    return res.status(200).json({ rfq, quotations });
  } catch (error) {
    console.error("Error generating comparison data:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
