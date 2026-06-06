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
  ArrowRight
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
  };
  recents: {
    rfqs: any[];
    quotations: any[];
    purchaseOrders: any[];
    invoices: any[];
  };
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

      {/* Recent Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent RFQs */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Recent Request for Quotes</h3>
            <Link to="/rfqs" className="text-xs font-bold text-primary-500 hover:text-primary-600 flex items-center space-x-1">
              <span>View All</span>
              <ArrowRight size={12} />
            </Link>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">RFQ Ref</th>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Due Date</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recents.rfqs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">No recent RFQs</td>
                  </tr>
                ) : (
                  recents.rfqs.map((rfq) => (
                    <tr
                      key={rfq.id}
                      onClick={() => navigate(`/rfqs/${rfq.id}`)}
                      className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-3.5 font-bold text-slate-800">{rfq.rfqNumber}</td>
                      <td className="px-6 py-3.5 text-slate-600 truncate max-w-[150px]">{rfq.title}</td>
                      <td className="px-6 py-3.5 text-slate-600">{formatDate(rfq.dueDate)}</td>
                      <td className="px-6 py-3.5"><StatusBadge status={rfq.status} /></td>
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
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
              {isVendor ? "Recent Quotations Submitted" : "Recent Vendor Quotations"}
            </h3>
            <Link to="/rfqs" className="text-xs font-bold text-primary-500 hover:text-primary-600 flex items-center space-x-1">
              <span>View RFQs</span>
              <ArrowRight size={12} />
            </Link>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Quotation Ref</th>
                  <th className="px-6 py-3">Vendor</th>
                  <th className="px-6 py-3">Grand Total</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recents.quotations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">No recent Quotations</td>
                  </tr>
                ) : (
                  recents.quotations.map((quote) => (
                    <tr
                      key={quote.id}
                      onClick={() => navigate(`/rfqs/${quote.rfqId}`)}
                      className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-3.5 font-bold text-slate-800">{quote.quotationNumber}</td>
                      <td className="px-6 py-3.5 text-slate-600">{quote.vendor.name}</td>
                      <td className="px-6 py-3.5 text-slate-700 font-semibold">{formatCurrency(quote.grandTotal)}</td>
                      <td className="px-6 py-3.5"><StatusBadge status={quote.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent POs */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Recent Purchase Orders</h3>
            <Link to="/purchase-orders" className="text-xs font-bold text-primary-500 hover:text-primary-600 flex items-center space-x-1">
              <span>View All</span>
              <ArrowRight size={12} />
            </Link>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">PO Ref</th>
                  <th className="px-6 py-3">Vendor</th>
                  <th className="px-6 py-3">Grand Total</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recents.purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">No recent POs</td>
                  </tr>
                ) : (
                  recents.purchaseOrders.map((po) => (
                    <tr
                      key={po.id}
                      onClick={() => navigate(`/purchase-orders/${po.id}`)}
                      className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-3.5 font-bold text-slate-800">{po.poNumber}</td>
                      <td className="px-6 py-3.5 text-slate-600">{po.vendor.name}</td>
                      <td className="px-6 py-3.5 text-slate-700 font-semibold">{formatCurrency(po.grandTotal)}</td>
                      <td className="px-6 py-3.5"><StatusBadge status={po.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Recent Invoices</h3>
            <Link to="/invoices" className="text-xs font-bold text-primary-500 hover:text-primary-600 flex items-center space-x-1">
              <span>View All</span>
              <ArrowRight size={12} />
            </Link>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Invoice Ref</th>
                  <th className="px-6 py-3">Vendor</th>
                  <th className="px-6 py-3">Grand Total</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recents.invoices.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">No recent Invoices</td>
                  </tr>
                ) : (
                  recents.invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => navigate(`/purchase-orders/${inv.purchaseOrderId}`)} // Redirect to PO/Invoice detail
                      className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-3.5 font-bold text-slate-800">{inv.invoiceNumber}</td>
                      <td className="px-6 py-3.5 text-slate-600">{inv.vendor.name}</td>
                      <td className="px-6 py-3.5 text-slate-700 font-semibold">{formatCurrency(inv.grandTotal)}</td>
                      <td className="px-6 py-3.5"><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
