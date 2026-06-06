import { Response } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { createActivityLog } from "../services/log.service";
import { generateInvoicePdf } from "../services/pdf.service";
import { sendEmail } from "../services/email.service";
import path from "path";
import fs from "fs";

// Create Invoice from PO (Vendor only)
export async function createInvoice(req: AuthenticatedRequest, res: Response) {
  const { purchaseOrderId, dueDate } = req.body;

  if (!purchaseOrderId || !dueDate) {
    return res.status(400).json({ message: "purchaseOrderId and dueDate are required" });
  }

  const vendorId = req.user?.vendorId;
  if (!vendorId) {
    return res.status(403).json({ message: "Forbidden: Only users linked to active Vendor profiles can create invoices" });
  }

  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { poItems: true },
    });

    if (!po) {
      return res.status(404).json({ message: "Purchase Order not found" });
    }

    if (po.vendorId !== vendorId) {
      return res.status(403).json({ message: "Forbidden: You can only invoice Purchase Orders issued to your company" });
    }

    if (po.status !== "SENT") {
      return res.status(400).json({ message: "Can only invoice Purchase Orders in SENT status" });
    }

    // Generate unique Invoice Number
    const count = await prisma.invoice.count();
    const invoiceNumber = `INV-2026-${String(count + 1).padStart(4, "0")}`;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        purchaseOrderId: po.id,
        vendorId,
        status: "DRAFT",
        subtotal: po.subtotal,
        cgst: po.cgst,
        sgst: po.sgst,
        igst: po.igst,
        grandTotal: po.grandTotal,
        dueDate: new Date(dueDate),
        invoiceItems: {
          create: po.poItems.map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            uom: item.uom,
          })),
        },
      },
      include: { invoiceItems: true },
    });

    // Update PO status to COMPLETED
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: "COMPLETED" },
    });

    // Automated Audit Log for Invoice Generated
    await createActivityLog(
      req.user!.userId,
      "INVOICE_GENERATED",
      "INVOICE",
      invoice.id,
      req.ip,
      `Invoice ${invoiceNumber} created as DRAFT by vendor for PO ${po.poNumber}. Grand Total: INR ${po.grandTotal.toFixed(2)}`
    );

    return res.status(201).json(invoice);
  } catch (error) {
    console.error("Error creating invoice:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// List Invoices (scoped by role)
export async function getInvoices(req: AuthenticatedRequest, res: Response) {
  try {
    const whereClause: any = {};

    // Scoping for Vendor
    if (req.user?.roleName === "VENDOR") {
      if (!req.user.vendorId) {
        return res.status(400).json({ message: "Vendor profile not linked" });
      }
      whereClause.vendorId = req.user.vendorId;
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        vendor: true,
        purchaseOrder: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(invoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Get Invoice by ID
export async function getInvoiceById(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        vendor: true,
        purchaseOrder: true,
        invoiceItems: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // Security check
    if (req.user?.roleName === "VENDOR" && req.user.vendorId !== invoice.vendorId) {
      return res.status(403).json({ message: "Forbidden: Access restricted to your own invoices" });
    }

    return res.status(200).json(invoice);
  } catch (error) {
    console.error("Error fetching invoice details:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Compile PDF & Email Invoice (Vendor or Officer)
export async function sendInvoicePdf(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        vendor: true,
        purchaseOrder: true,
        invoiceItems: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // Role check: Vendor can only send their own
    if (req.user?.roleName === "VENDOR" && req.user.vendorId !== invoice.vendorId) {
      return res.status(403).json({ message: "Forbidden: You can only process your own invoices" });
    }

    // Compile invoice data for PDF generator
    const invoicePdfData = {
      vendorName: invoice.vendor.name,
      poNumber: invoice.purchaseOrder.poNumber,
      subtotal: Number(invoice.subtotal),
      cgst: Number(invoice.cgst),
      sgst: Number(invoice.sgst),
      igst: Number(invoice.igst),
      grandTotal: Number(invoice.grandTotal),
      dueDate: invoice.dueDate,
      items: invoice.invoiceItems.map((item) => ({
        productName: item.productName,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        uom: item.uom,
      })),
    };

    // 1. Generate PDF (Handles its own fallback to activity log if failed, returns null or path)
    const pdfUrl = await generateInvoicePdf(invoice.invoiceNumber, invoicePdfData);

    // 2. Update status to SENT and save PDF url
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: "SENT",
        pdfUrl: pdfUrl || invoice.pdfUrl, // keep existing or set generated path
      },
    });

    // Automated Audit Log for Invoice Sent
    await createActivityLog(
      req.user!.userId,
      "INVOICE_SENT",
      "INVOICE",
      invoice.id,
      req.ip,
      `Invoice ${invoice.invoiceNumber} status set to SENT. PDF URL: ${pdfUrl || "Fallback logged"}.`
    );

    // 3. Dispatch Email with PDF attachment (if PDF exists)
    const emailSubject = `Tax Invoice Issued: ${invoice.invoiceNumber}`;
    const emailBody = `
      Dear Accounts Team,

      Please find attached the tax invoice for our recent shipment.

      Invoice Number: ${invoice.invoiceNumber}
      PO Reference: ${invoice.purchaseOrder.poNumber}
      Total Amount Due: INR ${invoice.grandTotal.toFixed(2)}
      Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}

      We declare that all particulars are true and correct.

      Regards,
      Billing Department
      ${invoice.vendor.name}
    `;

    const attachments: any[] = [];
    if (pdfUrl) {
      const absolutePdfPath = path.join(__dirname, "../../../", pdfUrl);
      if (fs.existsSync(absolutePdfPath)) {
        attachments.push({
          filename: path.basename(absolutePdfPath),
          path: absolutePdfPath,
        });
      }
    }

    // Dispatch email (Handles SMTP fallback to activity log if not configured or failed)
    sendEmail(invoice.vendor.contactEmail, emailSubject, emailBody, attachments).catch((err) => {
      console.error(`Email dispatch failed for invoice ${invoice.invoiceNumber}:`, err);
    });

    return res.status(200).json({
      message: "Invoice compiled and dispatched successfully",
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error("Error sending invoice PDF:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
