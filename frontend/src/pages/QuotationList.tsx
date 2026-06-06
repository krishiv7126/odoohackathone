import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Gavel, ArrowRight, LayoutGrid } from "lucide-react";
import api from "../services/api";
import Table from "../components/common/Table";
import type { TableColumn } from "../components/common/Table";
import StatusBadge from "../components/common/StatusBadge";
import { formatDate, formatCurrency } from "../utils/formatters";

interface Quotation {
  id: string;
  quotationNumber: string;
  subtotal: string;
  grandTotal: string;
  validityDate: string;
  notes: string | null;
  status: string;
  createdAt: string;
  rfq: { rfqNumber: string; title: string; id: string };
  vendor: { name: string };
}

export const QuotationList: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isVendor = currentUser.roleName === "VENDOR";

  // Fetch Quotations
  const { data: quotations = [], isLoading, error } = useQuery<Quotation[]>({
    queryKey: ["quotations"],
    queryFn: async () => {
      const res = await api.get("/quotations");
      return res.data;
    },
  });

  const columns: TableColumn<Quotation>[] = [
    { 
      header: "Quotation Ref", 
      accessor: "quotationNumber", 
      className: "font-bold text-slate-800" 
    },
    ...(!isVendor ? [{
      header: "Supplier",
      accessor: (row: Quotation) => row.vendor.name,
      className: "font-semibold text-slate-700"
    }] : []),
    { 
      header: "RFQ Reference", 
      accessor: (row) => `${row.rfq.rfqNumber} - ${row.rfq.title}`, 
      className: "max-w-[220px] truncate text-slate-600 font-medium" 
    },
    { 
      header: "Submitted Date", 
      accessor: (row) => formatDate(row.createdAt),
      className: "text-slate-500 font-medium" 
    },
    { 
      header: "Validity Date", 
      accessor: (row) => formatDate(row.validityDate),
      className: "text-slate-500 font-medium" 
    },
    { 
      header: "Grand Total (INR)", 
      accessor: (row) => formatCurrency(row.grandTotal), 
      className: "text-right font-bold text-primary-500" 
    },
    {
      header: "Status",
      accessor: (row) => <StatusBadge status={row.status} />,
      className: "text-center",
    },
    {
      header: "Action",
      accessor: (row) => (
        <div className="flex items-center justify-center space-x-2">
          {!isVendor && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/quotations/compare/${row.rfq.id}`);
              }}
              title="Compare RFQ Bids"
              className="p-1 text-slate-500 hover:text-primary-500 hover:bg-slate-100 rounded transition-colors"
            >
              <LayoutGrid size={14} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/quotations/${row.id}`);
            }}
            className="p-1 text-slate-500 hover:text-primary-500 hover:bg-slate-100 rounded transition-colors inline-flex items-center space-x-1"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider pl-1">Open</span>
            <ArrowRight size={14} />
          </button>
        </div>
      ),
      className: "text-center",
    },
  ];

  return (
    <div className="space-y-6 select-none p-1">
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
            <Gavel size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Quotation Sheets</h2>
            <p className="text-xs text-slate-500">
              {isVendor 
                ? "Track and manage your submitted quotation bids for active procurement cycles." 
                : "Analyze, compare, and authorize quotation bids submitted by assigned suppliers."
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
          Failed to load quotation sheets.
        </div>
      ) : (
        <Table columns={columns} data={quotations} onRowClick={(row) => navigate(`/quotations/${row.id}`)} />
      )}
    </div>
  );
};

export default QuotationList;
