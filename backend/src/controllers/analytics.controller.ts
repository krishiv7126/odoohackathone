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
    const totalQuotations = await prisma.quotation.count({ where: vendorScope });

    // Calculate Monthly Spend (Sum of grandTotal of PAID/SENT invoices in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const monthlySpendResult = await prisma.invoice.aggregate({
      where: {
        status: { in: ["SENT", "PAID"] },
        createdAt: { gte: thirtyDaysAgo },
        ...vendorScope,
      },
      _sum: {
        grandTotal: true,
      },
    });
    const monthlySpend = Number(monthlySpendResult._sum.grandTotal || 0);

    // 2. Cost Savings calculation (Highest Quote vs Selected/Approved/Best Quote)
    const rfqsWithQuotes = await prisma.rfq.findMany({
      include: {
        quotations: {
          where: {
            status: { in: ["APPROVED", "SUBMITTED", "UNDER_REVIEW"] }
          }
        }
      }
    });

    let totalHighest = 0;
    let totalBest = 0;
    let totalSavings = 0;
    let quoteCountForAvg = 0;
    let totalQuotesSum = 0;

    rfqsWithQuotes.forEach(r => {
      const quotes = r.quotations;
      if (quotes.length > 0) {
        const prices = quotes.map(q => Number(q.grandTotal));
        const maxPrice = Math.max(...prices);
        const approvedQuote = quotes.find(q => q.status === "APPROVED");
        const bestPrice = approvedQuote ? Number(approvedQuote.grandTotal) : Math.min(...prices);
        
        totalHighest += maxPrice;
        totalBest += bestPrice;
        totalSavings += (maxPrice - bestPrice);
        
        quotes.forEach(q => {
          totalQuotesSum += Number(q.grandTotal);
          quoteCountForAvg++;
        });
      }
    });

    const averageQuote = quoteCountForAvg > 0 ? Math.round(totalQuotesSum / quoteCountForAvg) : 0;

    // 3. Procurement Health Score
    const totalAssignments = await prisma.rfqVendor.count();
    const allQuotesCount = await prisma.quotation.count();
    const vendorResponseRate = totalAssignments > 0 ? Math.min(100, Math.round((allQuotesCount / totalAssignments) * 100)) : 100;

    const totalRfqsCount = await prisma.rfq.count();
    const completedRfqsCount = await prisma.rfq.count({ where: { status: "COMPLETED" } });
    const rfqCompletionRate = totalRfqsCount > 0 ? Math.round((completedRfqsCount / totalRfqsCount) * 100) : 100;

    const approvedQuotesCount = await prisma.quotation.count({ where: { status: "APPROVED" } });
    const processedQuotesCount = await prisma.quotation.count({ where: { status: { in: ["APPROVED", "REJECTED"] } } });
    const approvalSuccessRate = processedQuotesCount > 0 ? Math.round((approvedQuotesCount / processedQuotesCount) * 100) : 100;

    const totalInvoicesCount = await prisma.invoice.count();
    const sentOrPaidInvoicesCount = await prisma.invoice.count({ where: { status: { in: ["SENT", "PAID"] } } });
    const invoiceCompletionRate = totalInvoicesCount > 0 ? Math.round((sentOrPaidInvoicesCount / totalInvoicesCount) * 100) : 100;

    const healthScore = Math.round((vendorResponseRate + rfqCompletionRate + approvalSuccessRate + invoiceCompletionRate) / 4);

    // 4. Top Vendors performance ranking
    const allApprovedVendors = await prisma.vendor.findMany({
      where: { status: "APPROVED" },
      include: {
        quotations: { include: { quotationItems: true } },
        purchaseOrders: true,
        rfqVendors: true
      }
    });

    const vendorScorecards = allApprovedVendors.map(v => {
      const totalQuotes = v.quotations.length;
      const approvedQuotes = v.quotations.filter(q => q.status === "APPROVED").length;
      const approvalRate = totalQuotes > 0 ? Math.round((approvedQuotes / totalQuotes) * 100) : 0;
      
      const totalSpend = v.purchaseOrders
        .filter(po => ["SENT", "COMPLETED"].includes(po.status))
        .reduce((sum, po) => sum + Number(po.grandTotal), 0);
      
      let totalLeadTime = 0;
      let leadTimeCount = 0;
      v.quotations.forEach(q => {
        q.quotationItems.forEach(qi => {
          totalLeadTime += qi.leadTimeDays;
          leadTimeCount++;
        });
      });
      const avgLeadTime = leadTimeCount > 0 ? (totalLeadTime / leadTimeCount) : 0;
      const assignedRfqs = v.rfqVendors.length;
      const responseRate = assignedRfqs > 0 ? Math.min(100, Math.round((totalQuotes / assignedRfqs) * 100)) : 100;
      
      let rawScore = 75;
      if (totalQuotes > 0) {
        rawScore = Math.round((responseRate * 0.3) + (approvalRate * 0.5) + (10 - Math.min(10, avgLeadTime)) * 2);
      }
      const vendorScore = Math.min(98, Math.max(65, rawScore));
      
      return {
        vendorId: v.id,
        vendorName: v.name,
        totalSpend,
        approvalRate,
        vendorScore,
        avgLeadTime: Math.round(avgLeadTime * 10) / 10,
        completedOrders: v.purchaseOrders.filter(p => p.status === "COMPLETED").length,
        rejectedQuotations: v.quotations.filter(q => q.status === "REJECTED").length
      };
    });

    const topVendorsRanked = [...vendorScorecards]
      .sort((a, b) => b.vendorScore - a.vendorScore)
      .slice(0, 5);

    // 5. Recent Activity Logs (Latest 10)
    const recentActivities = await prisma.activityLog.findMany({
      take: 10,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            role: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // 6. Recents Lists (5 items each)
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
        totalQuotations,
        costSavings: {
          highestQuote: totalHighest,
          bestQuote: totalBest,
          averageQuote,
          savings: totalSavings
        },
        healthScore: {
          score: healthScore,
          responseRate: vendorResponseRate,
          completionRate: rfqCompletionRate,
          approvalRate: approvalSuccessRate,
          invoiceRate: invoiceCompletionRate
        }
      },
      recents: {
        rfqs: recentRfqs,
        quotations: recentQuotations,
        purchaseOrders: recentPOs,
        invoices: recentInvoices,
      },
      recentActivities,
      topVendors: topVendorsRanked
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

    // 1. Vendor Performance Rating
    const vendors = await prisma.vendor.findMany({
      where: { status: "APPROVED" },
      include: {
        quotations: { include: { quotationItems: true } },
        purchaseOrders: true,
        rfqVendors: true
      },
    });

    const vendorPerformance = vendors.map((v) => {
      const totalQuotes = v.quotations.length;
      const approvedQuotes = v.quotations.filter((q) => q.status === "APPROVED").length;
      const rejectedQuotes = v.quotations.filter((q) => q.status === "REJECTED").length;
      const approvalRate = totalQuotes > 0 ? Math.round((approvedQuotes / totalQuotes) * 100) : 0;

      let totalLeadTime = 0;
      let leadTimeCount = 0;
      v.quotations.forEach((q) => {
        q.quotationItems.forEach((qi) => {
          totalLeadTime += qi.leadTimeDays;
          leadTimeCount++;
        });
      });
      const avgLeadTimeDays = leadTimeCount > 0 ? totalLeadTime / leadTimeCount : 0;
      const assignedRfqs = v.rfqVendors.length;
      const responseRate = assignedRfqs > 0 ? Math.min(100, Math.round((totalQuotes / assignedRfqs) * 100)) : 100;

      let rawScore = 75;
      if (totalQuotes > 0) {
        rawScore = Math.round((responseRate * 0.3) + (approvalRate * 0.5) + (10 - Math.min(10, avgLeadTimeDays)) * 2);
      }
      const vendorScore = Math.min(98, Math.max(65, rawScore));

      return {
        vendorId: v.id,
        vendorName: v.name,
        responseRate,
        approvalRate,
        avgLeadTimeDays: Math.round(avgLeadTimeDays * 10) / 10,
        totalPOs: v.purchaseOrders.length,
        vendorScore,
        completedOrders: v.purchaseOrders.filter(p => p.status === "COMPLETED").length,
        rejectedQuotations: rejectedQuotes
      };
    });

    // 2. Spending Summaries (Intra vs Inter GST and Month-by-month spend in the last 6 months)
    const invoices = await prisma.invoice.findMany({
      where: {
        status: { in: ["SENT", "PAID"] },
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

    // 5. Cost Savings Summary
    const rfqsWithQuotes = await prisma.rfq.findMany({
      include: {
        quotations: {
          where: {
            status: { in: ["APPROVED", "SUBMITTED", "UNDER_REVIEW"] }
          }
        }
      }
    });

    let totalHighest = 0;
    let totalBest = 0;
    let totalSavings = 0;

    rfqsWithQuotes.forEach(r => {
      const quotes = r.quotations;
      if (quotes.length > 0) {
        const prices = quotes.map(q => Number(q.grandTotal));
        const maxPrice = Math.max(...prices);
        const approvedQuote = quotes.find(q => q.status === "APPROVED");
        const bestPrice = approvedQuote ? Number(approvedQuote.grandTotal) : Math.min(...prices);
        
        totalHighest += maxPrice;
        totalBest += bestPrice;
        totalSavings += (maxPrice - bestPrice);
      }
    });

    return res.status(200).json({
      vendorPerformance,
      spendingSummaries,
      procurementTrends,
      topVendors,
      costSavings: {
        highestQuote: totalHighest,
        bestQuote: totalBest,
        savings: totalSavings
      }
    });
  } catch (error) {
    console.error("Error generating report statistics:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
