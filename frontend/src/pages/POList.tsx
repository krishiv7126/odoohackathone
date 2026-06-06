import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, ArrowRight } from "lucide-react";
import api from "../services/api";
import Table, { TableColumn } from "../components/common/Table";
import StatusBadge from "../components/common/StatusBadge";
import { formatDate, formatCurrency } from "../utils/formatters";

interface PurchaseOrder {
  id: string;
  poNumber: string;
  totalAmount: string;
  grandTotal: string;
  deliveryDate: string;
  status: string;
  createdAt: string;
  vendor: { name: string };
}

export const POList: React.FC = () => {
  const navigate = useNavigate();

  // Fetch Purchase Orders
  const { data: pos = [], isLoading, error } = useQuery<PurchaseOrder[]>({
    queryKey: ["purchaseOrders"],
    queryFn: async () => {
      const res = await api.get("/pos");
      return res.data;
    },
  });

  const columns: TableColumn<PurchaseOrder>[] = [
    { header: "PO Reference", accessor: "poNumber", className: "font-bold text-slate-800" },
    { header: "Supplier", accessor: (row) => row.vendor.name },
    { header: "Order Date", accessor: (row) => formatDate(row.createdAt) },
    { header: "Delivery Target", accessor: (row) => formatDate(row.deliveryDate) },
    { header: "Grand Total", accessor: (row) => formatCurrency(row.grandTotal), className: "text-right font-bold text-slate-700" },
    {
      header: "Status",
      accessor: (row) => <StatusBadge status={row.status} />,
      className: "text-center",
    },
    {
      header: "Action",
      accessor: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/purchase-orders/${row.id}`);
          }}
          className="p-1 text-slate-500 hover:text-primary-500 hover:bg-slate-100 rounded transition-colors inline-flex items-center space-x-1"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider pl-1">Open</span>
          <ArrowRight size={14} />
        </button>
      ),
      className: "text-center",
    },
  ];

  return (
    <div className="space-y-6 select-none p-1">
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded">
            <ShoppingCart size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Purchase Orders (POs)</h2>
            <p className="text-xs text-slate-500">Track official orders generated from approved vendor quotation sheets.</p>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded border border-red-200">
          Failed to load purchase orders.
        </div>
      ) : (
        <Table columns={columns} data={pos} onRowClick={(row) => navigate(`/purchase-orders/${row.id}`)} />
      )}
    </div>
  );
};

export default POList;
