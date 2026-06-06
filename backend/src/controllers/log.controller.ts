import { Response } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

// Get activity logs (Admin only)
export async function getActivityLogs(req: AuthenticatedRequest, res: Response) {
  try {
    const logs = await prisma.activityLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(logs);
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Get timeline activity logs (any authenticated role can access for their associated RFQ)
export async function getTimeline(req: AuthenticatedRequest, res: Response) {
  const { rfqId, quotationId, poId, invoiceId } = req.query;

  let targetRfqId = rfqId as string;

  try {
    if (!targetRfqId) {
      if (quotationId) {
        const q = await prisma.quotation.findUnique({ where: { id: quotationId as string } });
        if (q) targetRfqId = q.rfqId;
      } else if (poId) {
        const po = await prisma.purchaseOrder.findUnique({
          where: { id: poId as string },
          include: { quotation: true },
        });
        if (po?.quotation) targetRfqId = po.quotation.rfqId;
      } else if (invoiceId) {
        const inv = await prisma.invoice.findUnique({
          where: { id: invoiceId as string },
          include: { purchaseOrder: { include: { quotation: true } } },
        });
        if (inv?.purchaseOrder?.quotation) targetRfqId = inv.purchaseOrder.quotation.rfqId;
      }
    }

    if (!targetRfqId) {
      return res.status(200).json([]);
    }

    // Security check: VENDOR role must be assigned to the RFQ to view its timeline
    if (req.user?.roleName === "VENDOR") {
      if (!req.user.vendorId) {
        return res.status(400).json({ message: "Vendor profile not linked" });
      }
      const isAssigned = await prisma.rfqVendor.findUnique({
        where: {
          uq_rfq_vendor: {
            rfqId: targetRfqId,
            vendorId: req.user.vendorId,
          },
        },
      });
      if (!isAssigned) {
        return res.status(403).json({ message: "Forbidden: You are not assigned to this RFQ" });
      }
    }

    // 1. Fetch all associated entity IDs
    const quotations = await prisma.quotation.findMany({ where: { rfqId: targetRfqId } });
    const quotationIds = quotations.map((q) => q.id);

    const pos = await prisma.purchaseOrder.findMany({ where: { quotationId: { in: quotationIds } } });
    const poIds = pos.map((po) => po.id);

    const invoices = await prisma.invoice.findMany({ where: { purchaseOrderId: { in: poIds } } });
    const invoiceIds = invoices.map((inv) => inv.id);

    // 2. Fetch all logs matching these entities
    const logs = await prisma.activityLog.findMany({
      where: {
        OR: [
          { entityType: "RFQ", entityId: targetRfqId },
          { entityType: "QUOTATION", entityId: { in: quotationIds } },
          { entityType: "PO", entityId: { in: poIds } },
          { entityType: "INVOICE", entityId: { in: invoiceIds } },
        ],
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            role: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return res.status(200).json(logs);
  } catch (error) {
    console.error("Error fetching timeline logs:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

