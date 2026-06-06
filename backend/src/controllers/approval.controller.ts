import { Response } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { createActivityLog } from "../services/log.service";

// List pending approvals (Manager / Admin)
export async function getPendingApprovals(req: AuthenticatedRequest, res: Response) {
  try {
    const quotations = await prisma.quotation.findMany({
      where: { status: "SUBMITTED" },
      include: {
        rfq: true,
        vendor: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(quotations);
  } catch (error) {
    console.error("Error fetching pending approvals:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Process Approval (Manager / Admin)
export async function processApproval(req: AuthenticatedRequest, res: Response) {
  const { quotationId, status, comments } = req.body; // status: APPROVED or REJECTED

  if (!quotationId || !status || !["APPROVED", "REJECTED"].includes(status)) {
    return res.status(400).json({ message: "quotationId and status (APPROVED/REJECTED) are required" });
  }

  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        rfq: {
          include: { rfqItems: true },
        },
        quotationItems: {
          include: { rfqItem: true },
        },
        vendor: true,
      },
    });

    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    if (quotation.status !== "SUBMITTED" && quotation.status !== "UNDER_REVIEW") {
      return res.status(400).json({ message: "Quotation has already been processed" });
    }

    // Process approval inside database transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Approval Record
      const approval = await tx.approval.create({
        data: {
          quotationId: quotation.id,
          approverId: req.user!.userId,
          status,
          comments,
        },
      });

      if (status === "APPROVED") {
        // 2. Update Approved Quotation Status
        await tx.quotation.update({
          where: { id: quotation.id },
          data: { status: "APPROVED" },
        });

        // 3. Reject other quotations for same RFQ
        await tx.quotation.updateMany({
          where: {
            rfqId: quotation.rfqId,
            id: { not: quotation.id },
          },
          data: { status: "REJECTED" },
        });

        // 4. Set RFQ status to COMPLETED
        await tx.rfq.update({
          where: { id: quotation.rfqId },
          data: { status: "COMPLETED" },
        });

        // 5. Automatically generate PO in DRAFT state
        const year = new Date().getFullYear();
        const poCount = await tx.purchaseOrder.count();
        const poNumber = `PO-${year}-${String(poCount + 1).padStart(4, "0")}`;

        const po = await tx.purchaseOrder.create({
          data: {
            poNumber,
            quotationId: quotation.id,
            vendorId: quotation.vendorId,
            status: "DRAFT",
            subtotal: quotation.subtotal,
            cgst: quotation.cgst,
            sgst: quotation.sgst,
            igst: quotation.igst,
            grandTotal: quotation.grandTotal,
            deliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Default 14 days
            terms: "Standard Procurement Terms and Conditions. India GST applicable.",
            createdById: req.user!.userId,
            poItems: {
              create: quotation.quotationItems.map((qi) => ({
                productName: qi.rfqItem.productName,
                description: qi.rfqItem.description,
                quantity: qi.rfqItem.quantity,
                unitPrice: qi.unitPrice,
                totalPrice: qi.totalPrice,
                uom: qi.rfqItem.uom,
              })),
            },
          },
        });

        return { approval, po, quotationApproved: true };
      } else {
        // Just reject this quotation
        await tx.quotation.update({
          where: { id: quotation.id },
          data: { status: "REJECTED" },
        });

        return { approval, po: null, quotationApproved: false };
      }
    });

    // Automated Audit Log for Quotation Approved/Rejected
    await createActivityLog(
      req.user!.userId,
      status === "APPROVED" ? "QUOTATION_APPROVED" : "QUOTATION_REJECTED",
      "QUOTATION",
      quotation.id,
      req.ip,
      `Quotation ${quotation.quotationNumber} from ${quotation.vendor.name} has been ${status} by Manager. Details: ${comments || "No comments"}`
    );

    if (result.po) {
      // Log PO automatic creation
      await createActivityLog(
        req.user!.userId,
        "PO_GENERATED",
        "PO",
        result.po.id,
        req.ip,
        `Draft Purchase Order ${result.po.poNumber} generated automatically from approved quotation.`
      );
    }

    return res.status(200).json({
      message: `Quotation has been successfully ${status.toLowerCase()}`,
      approval: result.approval,
      po: result.po,
    });
  } catch (error) {
    console.error("Error processing approval:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
