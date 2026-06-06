import { Response } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { createActivityLog } from "../services/log.service";

// List all vendors (Procurement, Manager, Admin)
export async function getVendors(req: AuthenticatedRequest, res: Response) {
  const { status, search } = req.query;

  try {
    const whereClause: any = {};

    if (status) {
      whereClause.status = status as string;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search as string } },
        { companyRegNo: { contains: search as string } },
        { contactEmail: { contains: search as string } },
      ];
    }

    const vendors = await prisma.vendor.findMany({
      where: whereClause,
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

    return res.status(200).json(vendors);
  } catch (error) {
    console.error("Error fetching vendors:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Get vendor by ID
export async function getVendorById(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id },
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
    });

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Scoping check: VENDOR role can only see their own profile
    if (req.user?.roleName === "VENDOR" && req.user.vendorId !== id) {
      return res.status(403).json({ message: "Forbidden: You can only view your own profile" });
    }

    return res.status(200).json(vendor);
  } catch (error) {
    console.error("Error fetching vendor by ID:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Create new vendor profile (Procurement / Admin)
export async function createVendor(req: AuthenticatedRequest, res: Response) {
  const { name, companyRegNo, taxId, address, contactName, contactEmail, contactPhone, userId } = req.body;

  if (!name || !companyRegNo || !taxId || !address || !contactName || !contactEmail || !contactPhone) {
    return res.status(400).json({ message: "Missing required vendor profile information" });
  }

  try {
    const existingReg = await prisma.vendor.findUnique({ where: { companyRegNo } });
    if (existingReg) {
      return res.status(400).json({ message: "Company Registration Number already exists" });
    }

    const existingTax = await prisma.vendor.findUnique({ where: { taxId } });
    if (existingTax) {
      return res.status(400).json({ message: "Tax ID already exists" });
    }

    const newVendor = await prisma.vendor.create({
      data: {
        name,
        companyRegNo,
        taxId,
        address,
        contactName,
        contactEmail,
        contactPhone,
        userId: userId || null,
        status: "PENDING",
      },
    });

    // Automated Audit Log for Vendor Created
    await createActivityLog(
      req.user?.userId || null,
      "VENDOR_CREATED",
      "VENDOR",
      newVendor.id,
      req.ip,
      `Vendor profile ${name} created with status PENDING.`
    );

    return res.status(201).json(newVendor);
  } catch (error) {
    console.error("Error creating vendor:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Update vendor profile (Procurement / Admin / Self-Vendor)
export async function updateVendor(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { name, companyRegNo, taxId, address, contactName, contactEmail, contactPhone } = req.body;

  try {
    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    // Security check: VENDOR role can only update their own profile
    if (req.user?.roleName === "VENDOR" && req.user.vendorId !== id) {
      return res.status(403).json({ message: "Forbidden: You can only update your own profile" });
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id },
      data: {
        name: name || vendor.name,
        companyRegNo: companyRegNo || vendor.companyRegNo,
        taxId: taxId || vendor.taxId,
        address: address || vendor.address,
        contactName: contactName || vendor.contactName,
        contactEmail: contactEmail || vendor.contactEmail,
        contactPhone: contactPhone || vendor.contactPhone,
      },
    });

    // Automated Audit Log for Vendor Updated
    await createActivityLog(
      req.user?.userId || null,
      "VENDOR_UPDATED",
      "VENDOR",
      id,
      req.ip,
      `Vendor profile ${updatedVendor.name} updated by user.`
    );

    return res.status(200).json(updatedVendor);
  } catch (error) {
    console.error("Error updating vendor:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Approve / Reject vendor status (Manager / Admin)
export async function updateVendorStatus(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { status } = req.body; // APPROVED, REJECTED

  if (!status || !["APPROVED", "REJECTED"].includes(status)) {
    return res.status(400).json({ message: "Invalid status value. Must be APPROVED or REJECTED" });
  }

  try {
    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id },
      data: { status },
    });

    // Automated Audit Log for Vendor Status Updated
    await createActivityLog(
      req.user?.userId || null,
      "VENDOR_UPDATED",
      "VENDOR",
      id,
      req.ip,
      `Vendor status updated to ${status} by manager.`
    );

    return res.status(200).json(updatedVendor);
  } catch (error) {
    console.error("Error updating vendor status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Get vendor scorecard details (Vendor score, response rate, lead times, completions)
export async function getVendorScorecard(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  // Security check: VENDOR role can only view their own scorecard
  if (req.user?.roleName === "VENDOR" && req.user.vendorId !== id) {
    return res.status(403).json({ message: "Forbidden: You can only view your own scorecard" });
  }

  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        quotations: {
          include: { quotationItems: true }
        },
        purchaseOrders: true,
        rfqVendors: true
      }
    });

    if (!vendor) {
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    const totalQuotes = vendor.quotations.length;
    const approvedQuotes = vendor.quotations.filter(q => q.status === "APPROVED").length;
    const rejectedQuotes = vendor.quotations.filter(q => q.status === "REJECTED").length;
    const approvalRate = totalQuotes > 0 ? Math.round((approvedQuotes / totalQuotes) * 100) : 0;

    const completedOrders = vendor.purchaseOrders.filter(po => po.status === "COMPLETED").length;

    // Average lead time
    let totalLeadTime = 0;
    let leadTimeCount = 0;
    vendor.quotations.forEach(q => {
      q.quotationItems.forEach(qi => {
        totalLeadTime += qi.leadTimeDays;
        leadTimeCount++;
      });
    });
    const avgLeadTime = leadTimeCount > 0 ? (totalLeadTime / leadTimeCount) : 0;

    // Response Rate
    const assignedRfqs = vendor.rfqVendors.length;
    const responseRate = assignedRfqs > 0 ? Math.min(100, Math.round((totalQuotes / assignedRfqs) * 100)) : 100;

    // Vendor score calculation
    let rawScore = 75;
    if (totalQuotes > 0) {
      rawScore = Math.round((responseRate * 0.3) + (approvalRate * 0.5) + (10 - Math.min(10, avgLeadTime)) * 2);
    }
    const vendorScore = Math.min(98, Math.max(65, rawScore));

    return res.status(200).json({
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorScore,
      responseRate,
      approvalRate,
      avgLeadTime: Math.round(avgLeadTime * 10) / 10,
      completedOrders,
      rejectedQuotations: rejectedQuotes,
      totalQuotes
    });
  } catch (error) {
    console.error("Error generating vendor scorecard:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

