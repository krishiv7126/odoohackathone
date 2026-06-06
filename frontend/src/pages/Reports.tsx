import React from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Download, Printer, TrendingUp, Award, DollarSign, FileText, PiggyBank } from "lucide-react";
import api from "../services/api";
import { formatCurrency } from "../utils/formatters";

interface ReportData {
  vendorPerformance: Array<{
    vendorId: string;
    vendorName: string;
    responseRate: number;
    approvalRate: number;
    avgLeadTimeDays: number;
    totalPOs: number;
    vendorScore: number;
    completedOrders: number;
    rejectedQuotations: number;
  }>;
  spendingSummaries: Array<{
    month: string;
    amount: number;
    cgst: number;
    sgst: number;
    igst: number;
  }>;
  procurementTrends: Array<{
    month: string;
    rfqsCount: number;
    posCount: number;
  }>;
  topVendors: Array<{
    vendorName: string;
    totalSpend: number;
  }>;
  costSavings: {
    highestQuote: number;
    bestQuote: number;
    savings: number;
  };
}

export const Reports: React.FC = () => {
  // Fetch Reports Data
  const { data, isLoading, error } = useQuery<ReportData>({
    queryKey: ["reportsData"],
    queryFn: async () => {
      const res = await api.get("/analytics/reports");
      return res.data;
    },
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportExecutiveReport = async () => {
    try {
      const res = await api.get("/analytics/export-report");
      const pdfUrl = res.data.pdfUrl;
      window.open(`http://localhost:5001${pdfUrl}`, "_blank");
    } catch (err) {
      console.error("Failed to export executive report PDF:", err);
      alert("Failed to export executive report.");
    }
  };

  const handleExportCSV = (dataset: any[], filename: string) => {
    if (!dataset || dataset.length === 0) return;
    
    const headers = Object.keys(dataset[0]).join(",");
    const rows = dataset.map((row) => 
      Object.values(row)
        .map((val) => typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : val)
        .join(",")
    );
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-red-500 bg-red-50 border border-red-200 rounded-lg">
        Failed to fetch reports and analytics data.
      </div>
    );
  }

  const { vendorPerformance, spendingSummaries, procurementTrends, topVendors } = data;

  return (
    <div className="space-y-8 select-none p-1 print:p-0 print:space-y-4">
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between print:border-none print:shadow-none print:p-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-50 text-primary-500 rounded print:hidden">
            <BarChart3 size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Reports & Analytics Dashboard</h2>
            <p className="text-xs text-slate-500 print:hidden">Audit procurement spending trends, vendor lead times, and tax summaries.</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 print:hidden">
          <button
            onClick={handleExportExecutiveReport}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center space-x-1.5 transition-all shadow shadow-emerald-600/10"
          >
            <FileText size={14} />
            <span>Export Executive Report</span>
          </button>
          <button
            onClick={() => handleExportCSV(vendorPerformance, "vendor_performance_report.csv")}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors text-slate-700"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors text-slate-700"
          >
            <Printer size={14} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Cost Savings Executive Widget */}
      {data.costSavings && (
        <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
            <PiggyBank size={18} className="text-slate-500" />
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Executive Savings Summary</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs font-semibold">
            <div className="bg-green-50/50 p-4 rounded border border-green-100 flex flex-col justify-between">
              <span className="block text-[10px] text-green-600 uppercase tracking-wider">Savings Achieved</span>
              <span className="text-xl font-extrabold text-green-700 mt-1 block">
                {formatCurrency(data.costSavings.savings)}
              </span>
            </div>
            <div className="bg-slate-50 p-4 rounded border border-slate-200/50 flex flex-col justify-between">
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Best Bid Sum</span>
              <span className="text-sm font-bold text-slate-700 mt-1 block">
                {formatCurrency(data.costSavings.bestQuote)}
              </span>
            </div>
            <div className="bg-slate-50 p-4 rounded border border-slate-200/50 flex flex-col justify-between">
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Highest Bid Sum</span>
              <span className="text-sm font-bold text-slate-700 mt-1 block">
                {formatCurrency(data.costSavings.highestQuote)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Section 1: Spending Summaries (Last 6 Months) */}
        <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center space-x-2">
            <DollarSign size={16} className="text-slate-400" />
            <span>Monthly Spend & GST Breakdown</span>
          </h3>
          <div className="flex-1 space-y-4">
            {spendingSummaries.map((spend, idx) => (
              <div key={idx} className="p-4 border border-slate-100 rounded bg-slate-50/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-sm">{spend.month}</span>
                  <span className="font-extrabold text-primary-500 text-sm">{formatCurrency(spend.amount)}</span>
                </div>
                {/* GST Breakdown bars */}
                <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 font-semibold uppercase tracking-wider pt-2 border-t border-slate-100">
                  <div>CGST: <span className="text-slate-700">{formatCurrency(spend.cgst)}</span></div>
                  <div>SGST: <span className="text-slate-700">{formatCurrency(spend.sgst)}</span></div>
                  <div>IGST: <span className="text-slate-700">{formatCurrency(spend.igst)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Procurement Trends */}
        <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center space-x-2">
            <TrendingUp size={16} className="text-slate-400" />
            <span>RFQ Broadcasts vs PO Placements</span>
          </h3>
          <div className="flex-1 space-y-4">
            {procurementTrends.map((trend, idx) => (
              <div key={idx} className="space-y-1 text-xs font-semibold">
                <div className="flex justify-between text-slate-600">
                  <span>{trend.month}</span>
                  <span>{trend.rfqsCount} RFQs | {trend.posCount} POs</span>
                </div>
                <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 border border-slate-200">
                  {/* RFQs Bar (blue) */}
                  <div 
                    className="bg-blue-500 transition-all" 
                    style={{ width: `${trend.rfqsCount > 0 ? (trend.rfqsCount / (trend.rfqsCount + trend.posCount || 1)) * 100 : 0}%` }} 
                  />
                  {/* POs Bar (emerald) */}
                  <div 
                    className="bg-emerald-500 transition-all" 
                    style={{ width: `${trend.posCount > 0 ? (trend.posCount / (trend.rfqsCount + trend.posCount || 1)) * 100 : 0}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Vendor Performance Analytics */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden lg:col-span-2">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center space-x-2">
              <Award size={16} className="text-slate-400" />
              <span>Supplier Performance Matrix</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Supplier Name</th>
                  <th className="px-6 py-3 text-center">Score</th>
                  <th className="px-6 py-3 text-center">Response Rate</th>
                  <th className="px-6 py-3 text-center">Approval Rate</th>
                  <th className="px-6 py-3 text-center">Lead Time</th>
                  <th className="px-6 py-3 text-center">Completed POs</th>
                  <th className="px-6 py-3 text-center">Rejected Bids</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {vendorPerformance.map((vendor) => (
                  <tr key={vendor.vendorId}>
                    <td className="px-6 py-3.5 font-bold text-slate-800">{vendor.vendorName}</td>
                    <td className="px-6 py-3.5 text-center font-extrabold text-slate-700">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary-50 text-primary-700 border border-primary-100">
                        {vendor.vendorScore} / 100
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center text-slate-600 font-semibold">{vendor.responseRate}%</td>
                    <td className="px-6 py-3.5 text-center text-slate-600 font-semibold">{vendor.approvalRate}%</td>
                    <td className="px-6 py-3.5 text-center text-slate-600 font-semibold">{vendor.avgLeadTimeDays} Days</td>
                    <td className="px-6 py-3.5 text-center text-slate-600 font-semibold">{vendor.completedOrders}</td>
                    <td className="px-6 py-3.5 text-center text-rose-500 font-semibold">{vendor.rejectedQuotations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Top Vendors spend ranking */}
        <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm flex flex-col lg:col-span-2">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
            <span>Supplier Spending Rankings (Top 5 Vendors)</span>
          </h3>
          <div className="space-y-4">
            {topVendors.map((vendor, idx) => (
              <div key={idx} className="space-y-1 text-xs">
                <div className="flex justify-between font-bold text-slate-700">
                  <span>{idx + 1}. {vendor.vendorName}</span>
                  <span>{formatCurrency(vendor.totalSpend)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className="bg-primary-500 h-2 rounded-full transition-all" 
                    style={{ width: `${(vendor.totalSpend / (topVendors[0]?.totalSpend || 1)) * 100}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
