import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Receipt, ArrowRight } from "lucide-react";
import api from "../services/api";
import Table from "../components/common/Table";
import type { TableColumn } from "../components/common/Table";
import StatusBadge from "../components/common/StatusBadge";
import { formatDate, formatCurrency } from "../utils/formatters";

interface Invoice {
  id: string;
  invoiceNumber: string;
  subtotal: string;
  grandTotal: string;
  dueDate: string;
  status: string;
  createdAt: string;
  purchaseOrder: { poNumber: string };
  vendor: { name: string };
}

export const InvoiceList: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isVendor = currentUser.roleName === "VENDOR";

  // Fetch Invoices
  const { data: invoices = [], isLoading, error } = useQuery<Invoice[]>({
    queryKey: ["invoices"],
    queryFn: async () => {
      const res = await api.get("/invoices");
      return res.data;
    },
  });

  const columns: TableColumn<Invoice>[] = [
    { 
      header: "Invoice Reference", 
      accessor: "invoiceNumber", 
      className: "font-bold text-slate-800" 
    },
    ...(!isVendor ? [{
      header: "Supplier",
      accessor: (row: Invoice) => row.vendor.name,
      className: "font-semibold text-slate-700"
    }] : []),
    { 
      header: "PO Reference", 
      accessor: (row) => row.purchaseOrder.poNumber, 
      className: "text-slate-600 font-semibold" 
    },
    { 
      header: "Issue Date", 
      accessor: (row) => formatDate(row.createdAt),
      className: "text-slate-500 font-medium" 
    },
    { 
      header: "Payment Due Date", 
      accessor: (row) => formatDate(row.dueDate),
      className: "text-slate-500 font-medium" 
    },
    { 
      header: "Grand Total (INR)", 
      accessor: (row) => formatCurrency(row.grandTotal), 
      className: "text-right font-bold text-slate-700" 
    },
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
            navigate(`/invoices/${row.id}`);
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
          <div className="p-2 bg-teal-50 text-teal-600 rounded">
            <Receipt size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Tax Invoices</h2>
            <p className="text-xs text-slate-500">
              {isVendor 
                ? "Track and manage billing invoices generated from completed purchase orders." 
                : "Monitor supplier tax invoices, payment terms, and billing balances."
              }
            </p>
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
          Failed to load invoices.
        </div>
      ) : (
        <Table columns={columns} data={invoices} onRowClick={(row) => navigate(`/invoices/${row.id}`)} />
      )}
    </div>
  );
};

export default InvoiceList;
