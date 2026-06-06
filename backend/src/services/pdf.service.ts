import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";
import { createActivityLog } from "./log.service";

const uploadDir = path.join(__dirname, "../../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export async function generateInvoicePdf(
  invoiceNumber: string,
  invoiceData: {
    vendorName: string;
    poNumber: string;
    subtotal: number;
    cgst: number;
    sgst: number;
    igst: number;
    grandTotal: number;
    dueDate: Date;
    items: Array<{ productName: string; quantity: number; unitPrice: number; totalPrice: number; uom: string }>;
  }
): Promise<string | null> {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { width, height } = page.getSize();

    // Title
    page.drawText("TAX INVOICE", { x: 50, y: height - 60, size: 24, font: boldFont, color: rgb(0.1, 0.1, 0.4) });

    // Details
    page.drawText(`Invoice Number: ${invoiceNumber}`, { x: 50, y: height - 100, size: 12, font });
    page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: 50, y: height - 120, size: 12, font });
    page.drawText(`Due Date: ${new Date(invoiceData.dueDate).toLocaleDateString()}`, { x: 50, y: height - 140, size: 12, font });
    page.drawText(`PO Reference: ${invoiceData.poNumber}`, { x: 50, y: height - 160, size: 12, font });

    page.drawText("Bill From (Vendor):", { x: 350, y: height - 100, size: 12, font: boldFont });
    page.drawText(invoiceData.vendorName, { x: 350, y: height - 120, size: 12, font });

    // Items table header
    page.drawLine({ start: { x: 50, y: height - 200 }, end: { x: 550, y: height - 200 }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
    page.drawText("Item / Description", { x: 55, y: height - 220, size: 10, font: boldFont });
    page.drawText("Qty", { x: 300, y: height - 220, size: 10, font: boldFont });
    page.drawText("Unit Price (INR)", { x: 360, y: height - 220, size: 10, font: boldFont });
    page.drawText("Total Price (INR)", { x: 460, y: height - 220, size: 10, font: boldFont });
    page.drawLine({ start: { x: 50, y: height - 230 }, end: { x: 550, y: height - 230 }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });

    let currentY = height - 250;
    for (const item of invoiceData.items) {
      page.drawText(item.productName, { x: 55, y: currentY, size: 10, font });
      page.drawText(`${item.quantity} ${item.uom}`, { x: 300, y: currentY, size: 10, font });
      page.drawText(item.unitPrice.toFixed(2), { x: 360, y: currentY, size: 10, font });
      page.drawText(item.totalPrice.toFixed(2), { x: 460, y: currentY, size: 10, font });
      currentY -= 20;
    }

    page.drawLine({ start: { x: 50, y: currentY }, end: { x: 550, y: currentY }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
    
    // Totals block
    currentY -= 20;
    page.drawText("Subtotal:", { x: 350, y: currentY, size: 10, font });
    page.drawText(invoiceData.subtotal.toFixed(2), { x: 480, y: currentY, size: 10, font });
    
    currentY -= 15;
    page.drawText("CGST:", { x: 350, y: currentY, size: 10, font });
    page.drawText(invoiceData.cgst.toFixed(2), { x: 480, y: currentY, size: 10, font });

    currentY -= 15;
    page.drawText("SGST:", { x: 350, y: currentY, size: 10, font });
    page.drawText(invoiceData.sgst.toFixed(2), { x: 480, y: currentY, size: 10, font });

    currentY -= 15;
    page.drawText("IGST:", { x: 350, y: currentY, size: 10, font });
    page.drawText(invoiceData.igst.toFixed(2), { x: 480, y: currentY, size: 10, font });

    currentY -= 20;
    page.drawLine({ start: { x: 350, y: currentY + 10 }, end: { x: 550, y: currentY + 10 }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
    page.drawText("Grand Total:", { x: 350, y: currentY, size: 11, font: boldFont });
    page.drawText(`INR ${invoiceData.grandTotal.toFixed(2)}`, { x: 480, y: currentY, size: 11, font: boldFont });

    // Terms
    page.drawText("Declaration:", { x: 50, y: 120, size: 10, font: boldFont });
    page.drawText("We declare that this invoice shows the actual price of the goods", { x: 50, y: 100, size: 9, font });
    page.drawText("described and that all particulars are true and correct.", { x: 50, y: 85, size: 9, font });

    const pdfBytes = await pdfDoc.save();
    const fileName = `INV-${invoiceNumber}-${Date.now()}.pdf`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, pdfBytes);

    return `/uploads/${fileName}`;
  } catch (error: any) {
    console.error("PDF generation failed, initiating fallback logic:", error.message);
    // Write PDF event to activity logs as a fallback
    await createActivityLog(
      null,
      "PDF_GEN_FALLBACK",
      "INVOICE",
      invoiceNumber,
      null,
      `Failed to compile PDF for Invoice: ${invoiceNumber} | Error: ${error.message}`
    );
    return null; // resolve successfully with null url
  }
}

export async function generateExecutiveReportPdf(data: {
  totalSpend: number;
  costSavings: number;
  totalVendors: number;
  totalRfqs: number;
  totalQuotations: number;
  totalPOs: number;
  topVendors: Array<{ vendorName: string; totalSpend: number }>;
  monthlySpend: Array<{ month: string; amount: number }>;
}): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  // Title
  page.drawText("EXECUTIVE PROCUREMENT REPORT", { x: 50, y: height - 60, size: 20, font: boldFont, color: rgb(0.1, 0.1, 0.4) });
  page.drawText(`Generated on: ${new Date().toLocaleDateString()}`, { x: 50, y: height - 85, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
  page.drawLine({ start: { x: 50, y: height - 95 }, end: { x: 550, y: height - 95 }, thickness: 1.5, color: rgb(0.1, 0.1, 0.4) });

  // Summary Cards (Grid)
  let y = height - 130;
  page.drawText("Procurement Summary Dashboard", { x: 50, y, size: 14, font: boldFont });
  y -= 30;

  // Draw grid boxes for KPIs
  const drawKpiBox = (label: string, value: string, x: number, yPos: number) => {
    page.drawRectangle({ x, y: yPos - 35, width: 150, height: 50, color: rgb(0.96, 0.96, 0.98), borderColor: rgb(0.85, 0.85, 0.9), borderWidth: 1 });
    page.drawText(label, { x: x + 10, y: yPos - 12, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(value, { x: x + 10, y: yPos - 30, size: 11, font: boldFont, color: rgb(0.1, 0.1, 0.3) });
  };

  drawKpiBox("Total Spend", `INR ${data.totalSpend.toLocaleString()}`, 50, y);
  drawKpiBox("Cost Savings", `INR ${data.costSavings.toLocaleString()}`, 210, y);
  drawKpiBox("Total Suppliers", String(data.totalVendors), 370, y);

  y -= 60;
  drawKpiBox("Total RFQs Issued", String(data.totalRfqs), 50, y);
  drawKpiBox("Total Quotations", String(data.totalQuotations), 210, y);
  drawKpiBox("Purchase Orders", String(data.totalPOs), 370, y);

  // Top Vendors Section
  y -= 70;
  page.drawText("Supplier Spend Rankings (Top 5)", { x: 50, y, size: 14, font: boldFont });
  y -= 15;
  page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  y -= 20;

  page.drawText("Supplier Name", { x: 55, y, size: 10, font: boldFont });
  page.drawText("Total Spend (INR)", { x: 420, y, size: 10, font: boldFont });
  y -= 8;
  page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  y -= 18;

  data.topVendors.forEach((v: any, index: number) => {
    page.drawText(`${index + 1}. ${v.vendorName}`, { x: 55, y, size: 10, font });
    page.drawText(`INR ${Number(v.totalSpend).toLocaleString()}`, { x: 420, y, size: 10, font });
    y -= 18;
  });

  // Monthly Spending Trends Section
  y -= 20;
  page.drawText("Monthly Spending Trends (Last 6 Months)", { x: 50, y, size: 14, font: boldFont });
  y -= 15;
  page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  y -= 20;

  page.drawText("Month", { x: 55, y, size: 10, font: boldFont });
  page.drawText("Spend (INR)", { x: 420, y, size: 10, font: boldFont });
  y -= 8;
  page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  y -= 18;

  data.monthlySpend.forEach((item: any) => {
    page.drawText(item.month, { x: 55, y, size: 10, font });
    page.drawText(`INR ${Number(item.amount).toLocaleString()}`, { x: 420, y, size: 10, font });
    y -= 18;
  });

  // Footer / Sign-off
  page.drawLine({ start: { x: 50, y: 70 }, end: { x: 550, y: 70 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  page.drawText("VendorBridge Executive ERP | Confidential business intelligence report.", { x: 50, y: 55, size: 8, font, color: rgb(0.5, 0.5, 0.5) });

  const pdfBytes = await pdfDoc.save();
  const fileName = `Exec-Report-${Date.now()}.pdf`;
  const filePath = path.join(uploadDir, fileName);
  fs.writeFileSync(filePath, pdfBytes);

  return `/uploads/${fileName}`;
}

