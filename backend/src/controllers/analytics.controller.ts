import { Response } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

// Get Dashboard KPIs & Recent Actions
export async function getDashboardStats(req: AuthenticatedRequest, res: Response) {
  try {
    const isVendor = req.user?.roleName === "VENDOR";
    const vendorId = req.user?.vendorId;

    if (isVendor && !vendorId) {
      return res.status(400).json({ message: "Vendor profile not linked" });
    }

    // Scoping where clauses
    const vendorScope = isVendor ? { vendorId } : {};
    const rfqVendorScope = isVendor ? { rfqVendors: { some: { vendorId } }, status: { in: ["SENT", "CLOSED", "COMPLETED"] } } : {};

    // 1. Counters
    const totalVendors = isVendor ? null : await prisma.vendor.count({ where: { status: "APPROVED" } });
    const activeRfqs = await prisma.rfq.count({ where: { status: "SENT", ...rfqVendorScope } });
    const pendingApprovals = isVendor ? null : await prisma.quotation.count({ where: { status: "SUBMITTED" } });
    const totalPos = await prisma.purchaseOrder.count({ where: vendorScope });
    const totalInvoices = await prisma.invoice.count({ where: vendorScope });

    // Calculate Monthly Spend (Sum of grandTotal of PAID invoices in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const monthlySpendResult = await prisma.invoice.aggregate({
      where: {
        status: "PAID",
        createdAt: { gte: thirtyDaysAgo },
        ...vendorScope,
      },
      _sum: {
        grandTotal: true,
      },
    });
    const monthlySpend = Number(monthlySpendResult._sum.grandTotal || 0);

    // 2. Recents Lists (5 items each)
    const recentRfqs = await prisma.rfq.findMany({
      where: rfqVendorScope,
      take: 5,
      orderBy: { createdAt: "desc" },
    });

    const recentQuotations = await prisma.quotation.findMany({
      where: vendorScope,
      take: 5,
      include: { vendor: true, rfq: true },
      orderBy: { createdAt: "desc" },
    });

    const recentPOs = await prisma.purchaseOrder.findMany({
      where: vendorScope,
      take: 5,
      include: { vendor: true },
      orderBy: { createdAt: "desc" },
    });

    const recentInvoices = await prisma.invoice.findMany({
      where: vendorScope,
      take: 5,
      include: { vendor: true },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      kpis: {
        totalVendors,
        activeRfqs,
        pendingApprovals,
        totalPos,
        totalInvoices,
        monthlySpend,
      },
      recents: {
        rfqs: recentRfqs,
        quotations: recentQuotations,
        purchaseOrders: recentPOs,
        invoices: recentInvoices,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard statistics:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Get Procurement Reports (Vendor KPIs, Spending summaries, trends)
export async function getReportsData(req: AuthenticatedRequest, res: Response) {
  try {
    const isVendor = req.user?.roleName === "VENDOR";
    const vendorId = req.user?.vendorId;

    if (isVendor && !vendorId) {
      return res.status(400).json({ message: "Vendor profile not linked" });
    }

    const vendorScope = isVendor ? { vendorId } : {};

    // 1. Vendor Performance Rating (Admin/Officer/Manager only)
    let vendorPerformance: any[] = [];
    if (!isVendor) {
      const vendors = await prisma.vendor.findMany({
        where: { status: "APPROVED" },
        include: {
          quotations: {
            include: { quotationItems: true },
          },
          purchaseOrders: true,
        },
      });

      vendorPerformance = vendors.map((v) => {
        const totalQuotesSubmitted = v.quotations.length;
        const totalQuotesApproved = v.quotations.filter((q) => q.status === "APPROVED").length;
        const conversionRate = totalQuotesSubmitted > 0 ? (totalQuotesApproved / totalQuotesSubmitted) * 100 : 0;

        // Calculate average lead time
        let totalLeadTime = 0;
        let leadTimeCount = 0;
        v.quotations.forEach((q) => {
          q.quotationItems.forEach((qi) => {
            totalLeadTime += qi.leadTimeDays;
            leadTimeCount++;
          });
        });
        const avgLeadTimeDays = leadTimeCount > 0 ? totalLeadTime / leadTimeCount : 0;

        return {
          vendorId: v.id,
          vendorName: v.name,
          conversionRate: Math.round(conversionRate * 10) / 10,
          avgLeadTimeDays: Math.round(avgLeadTimeDays * 10) / 10,
          totalPOs: v.purchaseOrders.length,
        };
      });
    }

    // 2. Spending Summaries (Intra vs Inter GST and Month-by-month spend in the last 6 months)
    const invoices = await prisma.invoice.findMany({
      where: {
        status: "PAID",
        ...vendorScope,
      },
    });

    // Month-by-month aggregation (e.g. "Jun 2026")
    const spendByMonthMap: Record<string, { month: string; amount: number; cgst: number; sgst: number; igst: number }> = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Initialize past 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      spendByMonthMap[key] = { month: key, amount: 0, cgst: 0, sgst: 0, igst: 0 };
    }

    invoices.forEach((inv) => {
      const date = new Date(inv.createdAt);
      const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      if (spendByMonthMap[key]) {
        spendByMonthMap[key].amount += Number(inv.grandTotal);
        spendByMonthMap[key].cgst += Number(inv.cgst);
        spendByMonthMap[key].sgst += Number(inv.sgst);
        spendByMonthMap[key].igst += Number(inv.igst);
      }
    });

    const spendingSummaries = Object.values(spendByMonthMap);

    // 3. Procurement Trends (RFQs count vs PO count last 6 months)
    const rfqs = await prisma.rfq.findMany({
      where: isVendor ? { rfqVendors: { some: { vendorId } } } : {},
    });

    const rfqTrendsMap: Record<string, { month: string; rfqsCount: number; posCount: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      rfqTrendsMap[key] = { month: key, rfqsCount: 0, posCount: 0 };
    }

    rfqs.forEach((rfq) => {
      const date = new Date(rfq.createdAt);
      const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      if (rfqTrendsMap[key]) {
        rfqTrendsMap[key].rfqsCount++;
      }
    });

    const pos = await prisma.purchaseOrder.findMany({
      where: vendorScope,
    });
    pos.forEach((po) => {
      const date = new Date(po.createdAt);
      const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      if (rfqTrendsMap[key]) {
        rfqTrendsMap[key].posCount++;
      }
    });

    const procurementTrends = Object.values(rfqTrendsMap);

    // 4. Top Vendors by Spend (POs grand total)
    let topVendors: any[] = [];
    if (!isVendor) {
      const vendorSpend = await prisma.purchaseOrder.groupBy({
        by: ["vendorId"],
        _sum: {
          grandTotal: true,
        },
        where: {
          status: { in: ["SENT", "COMPLETED"] },
        },
        orderBy: {
          _sum: {
            grandTotal: "desc",
          },
        },
        take: 5,
      });

      topVendors = await Promise.all(
        vendorSpend.map(async (item) => {
          const vendor = await prisma.vendor.findUnique({
            where: { id: item.vendorId },
            select: { name: true },
          });
          return {
            vendorName: vendor?.name || "Unknown Vendor",
            totalSpend: Number(item._sum.grandTotal || 0),
          };
        })
      );
    }

    return res.status(200).json({
      vendorPerformance,
      spendingSummaries,
      procurementTrends,
      topVendors,
    });
  } catch (error) {
    console.error("Error generating report statistics:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
