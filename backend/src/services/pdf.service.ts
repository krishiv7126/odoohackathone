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
