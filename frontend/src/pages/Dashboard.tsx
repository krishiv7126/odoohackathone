import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { 
  Users, 
  FileText, 
  CheckSquare, 
  ShoppingCart, 
  Receipt, 
  TrendingUp,
  ArrowRight,
  Activity,
  HeartPulse,
  PiggyBank,
  Award,
  ChevronRight
} from "lucide-react";
import api from "../services/api";
import { formatCurrency, formatDate } from "../utils/formatters";
import StatusBadge from "../components/common/StatusBadge";

interface DashboardData {
  kpis: {
    totalVendors: number | null;
    activeRfqs: number;
    pendingApprovals: number | null;
    totalPos: number;
    totalInvoices: number;
    monthlySpend: number;
    totalQuotations: number;
    costSavings: {
      highestQuote: number;
      bestQuote: number;
      averageQuote: number;
      savings: number;
    };
    healthScore: {
      score: number;
      responseRate: number;
      completionRate: number;
      approvalRate: number;
      invoiceRate: number;
    };
  };
  recents: {
    rfqs: any[];
    quotations: any[];
    purchaseOrders: any[];
    invoices: any[];
  };
  recentActivities: any[];
  topVendors: any[];
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // Fetch Dashboard Stats
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["dashboardStats"],
    queryFn: async () => {
      const res = await api.get("/analytics/dashboard");
      return res.data;
    },
    refetchInterval: 10000, // auto refetch every 10 seconds for real-time dashboard updates
  });

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isVendor = currentUser.roleName === "VENDOR";

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
        Failed to fetch dashboard data. Please verify database connection.
      </div>
    );
  }

  const { kpis, recents } = data;

  const cardItems = [
    ...(!isVendor ? [{
      title: "Total Vendors",
      value: kpis.totalVendors,
      icon: <Users size={24} className="text-blue-500" />,
      bg: "bg-blue-50/50",
      border: "border-blue-100",
      link: "/vendors"
    }] : []),
    {
      title: "Active RFQs",
      value: kpis.activeRfqs,
      icon: <FileText size={24} className="text-violet-500" />,
      bg: "bg-violet-50/50",
      border: "border-violet-100",
      link: "/rfqs"
    },
    ...(!isVendor ? [{
      title: "Pending Approvals",
      value: kpis.pendingApprovals,
      icon: <CheckSquare size={24} className="text-amber-500" />,
      bg: "bg-amber-50/50",
      border: "border-amber-100",
      link: "/approvals"
    }] : []),
    {
      title: "Total Purchase Orders",
      value: kpis.totalPos,
      icon: <ShoppingCart size={24} className="text-emerald-500" />,
      bg: "bg-emerald-50/50",
      border: "border-emerald-100",
      link: "/purchase-orders"
    },
    {
      title: "Total Invoices",
      value: kpis.totalInvoices,
      icon: <Receipt size={24} className="text-teal-500" />,
      bg: "bg-teal-50/50",
      border: "border-teal-100",
      link: "/invoices"
    },
    {
      title: isVendor ? "Your Revenue (30d)" : "Monthly Spend (30d)",
      value: formatCurrency(kpis.monthlySpend),
      icon: <TrendingUp size={24} className="text-primary-500" />,
      bg: "bg-primary-50/50",
      border: "border-primary-100",
      link: isVendor ? "/invoices" : "/reports",
      isCurrency: true
    }
  ];

  const getHealthStatus = (score: number) => {
    if (score >= 90) return { label: "Excellent", color: "text-emerald-500 bg-emerald-50 border-emerald-200" };
    if (score >= 75) return { label: "Good / Healthy", color: "text-amber-500 bg-amber-50 border-amber-200" };
    return { label: "Needs Review", color: "text-rose-500 bg-rose-50 border-rose-200" };
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-600";
    if (score >= 75) return "text-amber-500";
    return "text-rose-600";
  };

  const hs = kpis.healthScore || { score: 100, responseRate: 100, completionRate: 100, approvalRate: 100, invoiceRate: 100 };
  const healthStatus = getHealthStatus(hs.score);

  // Chevron right divider for horizontal pipeline
  const PipelineArrow = () => (
    <div className="hidden md:flex items-center text-slate-300">
      <ChevronRight size={18} />
    </div>
  );

  return (
    <div className="space-y-8 select-none p-1">
      {/* Welcome Banner */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Welcome back, {currentUser.firstName} {currentUser.lastName}!
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Overview of VendorBridge Procurement portal activities.
          </p>
        </div>
        {!isVendor && currentUser.roleName !== "MANAGER" && (
          <Link
            to="/rfqs/new"
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded text-sm font-semibold transition-all inline-flex items-center space-x-2 shadow shadow-primary-500/10"
          >
            <span>Create Draft RFQ</span>
            <ArrowRight size={14} />
          </Link>
        )}
      </div>

      {/* Procurement Pipeline count flow */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Procurement Workflow Pipeline</h3>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 p-3.5 bg-slate-50 rounded border border-slate-200/50 flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active RFQs</span>
              <span className="text-lg font-extrabold text-slate-800">{kpis.activeRfqs}</span>
            </div>
            <div className="p-2 bg-violet-100/50 text-violet-600 rounded">
              <FileText size={18} />
            </div>
          </div>
          <PipelineArrow />

          <div className="flex-1 p-3.5 bg-slate-50 rounded border border-slate-200/50 flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quotations</span>
              <span className="text-lg font-extrabold text-slate-800">{kpis.totalQuotations}</span>
            </div>
            <div className="p-2 bg-blue-100/50 text-blue-600 rounded">
              <Award size={18} />
            </div>
          </div>
          <PipelineArrow />

          <div className="flex-1 p-3.5 bg-slate-50 rounded border border-slate-200/50 flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approvals Queue</span>
              <span className="text-lg font-extrabold text-slate-800">{kpis.pendingApprovals ?? 0}</span>
            </div>
            <div className="p-2 bg-amber-100/50 text-amber-600 rounded">
              <CheckSquare size={18} />
            </div>
          </div>
          <PipelineArrow />

          <div className="flex-1 p-3.5 bg-slate-50 rounded border border-slate-200/50 flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Purchase Orders</span>
              <span className="text-lg font-extrabold text-slate-800">{kpis.totalPos}</span>
            </div>
            <div className="p-2 bg-emerald-100/50 text-emerald-600 rounded">
              <ShoppingCart size={18} />
            </div>
          </div>
          <PipelineArrow />

          <div className="flex-1 p-3.5 bg-slate-50 rounded border border-slate-200/50 flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invoices Raised</span>
              <span className="text-lg font-extrabold text-slate-800">{kpis.totalInvoices}</span>
            </div>
            <div className="p-2 bg-teal-100/50 text-teal-600 rounded">
              <Receipt size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Health score and savings row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Procurement Health Score Card */}
        <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
            <HeartPulse size={18} className="text-slate-500" />
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Procurement Health Score</h3>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-4xl font-extrabold tracking-tight flex items-baseline">
                <span className={getHealthScoreColor(hs.score)}>{hs.score}</span>
                <span className="text-xs text-slate-400 font-bold ml-1">/ 100</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${healthStatus.color}`}>
                {healthStatus.label}
              </span>
            </div>
            <div className="text-right text-[10px] font-semibold text-slate-400 space-y-1">
              <div className="flex justify-between w-36">
                <span>Response Rate:</span>
                <span className="text-slate-700">{hs.responseRate}%</span>
              </div>
              <div className="flex justify-between w-36">
                <span>RFQ Completion:</span>
                <span className="text-slate-700">{hs.completionRate}%</span>
              </div>
              <div className="flex justify-between w-36">
                <span>Quote Approval:</span>
                <span className="text-slate-700">{hs.approvalRate}%</span>
              </div>
              <div className="flex justify-between w-36">
                <span>Invoicing Rate:</span>
                <span className="text-slate-700">{hs.invoiceRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Savings Executive Card */}
        <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm flex flex-col justify-between space-y-4 lg:col-span-2">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
            <PiggyBank size={18} className="text-slate-500" />
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Executive Cost Savings</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold">
            <div className="bg-green-50/50 p-3 rounded border border-green-100">
              <span className="block text-[10px] text-green-600 uppercase">Savings Achieved</span>
              <span className="text-lg font-extrabold text-green-700 mt-1 block">
                {formatCurrency(kpis.costSavings?.savings || 0)}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded border border-slate-200/50">
              <span className="block text-[10px] text-slate-400 uppercase">Best Quote Total</span>
              <span className="text-sm font-bold text-slate-700 mt-1 block">
                {formatCurrency(kpis.costSavings?.bestQuote || 0)}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded border border-slate-200/50">
              <span className="block text-[10px] text-slate-400 uppercase">Highest Quote Total</span>
              <span className="text-sm font-bold text-slate-700 mt-1 block">
                {formatCurrency(kpis.costSavings?.highestQuote || 0)}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded border border-slate-200/50">
              <span className="block text-[10px] text-slate-400 uppercase">Average Quote Value</span>
              <span className="text-sm font-bold text-slate-700 mt-1 block">
                {formatCurrency(kpis.costSavings?.averageQuote || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cardItems.map((card, idx) => (
          <div
            key={idx}
            onClick={() => navigate(card.link)}
            className={`p-6 bg-white border ${card.border} rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group`}
          >
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {card.title}
              </span>
              <div className="text-2xl font-extrabold text-slate-800">
                {card.isCurrency ? card.value : (card.value ?? 0)}
              </div>
            </div>
            <div className={`p-3 rounded-lg ${card.bg} group-hover:scale-110 transition-transform`}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Enhanced Dashboard Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Activity feed (col-span-2) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* System Audit Trail */}
          {!isVendor && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">System Audit Trail (Recent Activities)</h3>
                <Link to="/activity-logs" className="text-xs font-bold text-primary-500 hover:text-primary-600 flex items-center space-x-1">
                  <span>View All Logs</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
              <div className="p-4 space-y-4 max-h-[350px] overflow-y-auto divide-y divide-slate-50">
                {data.recentActivities?.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6 font-semibold">No recent activities logged.</p>
                ) : (
                  data.recentActivities?.map((act) => (
                    <div key={act.id} className="text-xs flex items-start space-x-3 pt-3 first:pt-0 pb-1">
                      <div className="p-1.5 bg-slate-100 rounded flex-shrink-0 text-slate-500">
                        <Activity size={14} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">{act.action.replace(/_/g, " ")}</span>
                          <span className="text-[9px] text-slate-400 font-medium">
                            {new Date(act.createdAt).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-normal">{act.details}</p>
                        {act.user && (
                          <div className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider flex items-center space-x-1">
                            <span>By:</span>
                            <span className="text-slate-500 font-bold">{act.user.firstName} {act.user.lastName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Grid for Recent items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent RFQs */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider">Recent RFQs</h3>
                <Link to="/rfqs" className="text-[10px] font-bold text-primary-500 hover:text-primary-600 flex items-center space-x-1">
                  <span>View All</span>
                  <ArrowRight size={10} />
                </Link>
              </div>
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-[11px] divide-y divide-slate-100">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2">RFQ Ref</th>
                      <th className="px-4 py-2">Due Date</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recents.rfqs.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-4 text-center text-slate-400">No recent RFQs</td>
                      </tr>
                    ) : (
                      recents.rfqs.map((rfq) => (
                        <tr
                          key={rfq.id}
                          onClick={() => navigate(`/rfqs/${rfq.id}`)}
                          className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-2 font-bold text-slate-800">{rfq.rfqNumber}</td>
                          <td className="px-4 py-2 text-slate-600">{formatDate(rfq.dueDate)}</td>
                          <td className="px-4 py-2"><StatusBadge status={rfq.status} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Quotations */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider">
                  {isVendor ? "Recent Bids" : "Recent Bids Received"}
                </h3>
                <Link to="/rfqs" className="text-[10px] font-bold text-primary-500 hover:text-primary-600 flex items-center space-x-1">
                  <span>RFQs</span>
                  <ArrowRight size={10} />
                </Link>
              </div>
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-[11px] divide-y divide-slate-100">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2">Bid Ref</th>
                      <th className="px-4 py-2 text-right">Grand Total</th>
                      <th className="px-4 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recents.quotations.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-4 text-center text-slate-400">No bids</td>
                      </tr>
                    ) : (
                      recents.quotations.map((quote) => (
                        <tr
                          key={quote.id}
                          onClick={() => navigate(`/quotations/${quote.id}`)}
                          className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-2 font-bold text-slate-800">{quote.quotationNumber}</td>
                          <td className="px-4 py-2 text-right text-slate-700 font-semibold">{formatCurrency(quote.grandTotal)}</td>
                          <td className="px-4 py-2 text-center"><StatusBadge status={quote.status} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Top Suppliers & KPI Rankings (col-span-1) */}
        <div className="space-y-6">
          
          {/* Top Suppliers ranking list */}
          {!isVendor && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Top Suppliers</h3>
                <Link to="/vendors" className="text-xs font-bold text-primary-500 hover:text-primary-600 flex items-center space-x-1">
                  <span>View Directory</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
              <div className="p-4 space-y-4">
                {data.topVendors?.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6 font-semibold">No suppliers ranked yet.</p>
                ) : (
                  data.topVendors?.map((v, idx) => (
                    <div key={v.vendorId} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0 text-xs">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center font-bold text-[10px] border border-primary-200">
                          #{idx + 1}
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block truncate max-w-[120px]">{v.vendorName}</span>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Approval: {v.approvalRate}%</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-slate-800 block">{formatCurrency(v.totalSpend)}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                          Score: {v.vendorScore}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Grid for PO/Invoice lists */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider">Recent Orders</h3>
              <Link to="/purchase-orders" className="text-[10px] font-bold text-primary-500 hover:text-primary-600 flex items-center space-x-1">
                <span>POs</span>
                <ArrowRight size={10} />
              </Link>
            </div>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-[11px] divide-y divide-slate-100">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2">PO Ref</th>
                    <th className="px-4 py-2 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recents.purchaseOrders.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-4 text-center text-slate-400">No POs</td>
                    </tr>
                  ) : (
                    recents.purchaseOrders.map((po) => (
                      <tr
                        key={po.id}
                        onClick={() => navigate(`/purchase-orders/${po.id}`)}
                        className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-2 font-bold text-slate-800">{po.poNumber}</td>
                        <td className="px-4 py-2 text-right text-slate-700 font-bold">{formatCurrency(po.grandTotal)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider">Recent Invoices</h3>
              <Link to="/invoices" className="text-[10px] font-bold text-primary-500 hover:text-primary-600 flex items-center space-x-1">
                <span>Billing</span>
                <ArrowRight size={10} />
              </Link>
            </div>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-[11px] divide-y divide-slate-100">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2">Inv Ref</th>
                    <th className="px-4 py-2 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recents.invoices.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-4 text-center text-slate-400">No invoices</td>
                    </tr>
                  ) : (
                    recents.invoices.map((inv) => (
                      <tr
                        key={inv.id}
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                        className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-2 font-bold text-slate-800">{inv.invoiceNumber}</td>
                        <td className="px-4 py-2 text-right text-slate-700 font-bold">{formatCurrency(inv.grandTotal)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
