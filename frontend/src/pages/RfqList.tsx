import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FileText, Plus, ArrowRight } from "lucide-react";
import api from "../services/api";
import Table, { TableColumn } from "../components/common/Table";
import StatusBadge from "../components/common/StatusBadge";
import { formatDate } from "../utils/formatters";

interface Rfq {
  id: string;
  rfqNumber: string;
  title: string;
  description: string | null;
  dueDate: string;
  status: string;
  createdAt: string;
  _count: {
    rfqItems: number;
    rfqVendors: number;
    quotations: number;
  };
}

export const RfqList: React.FC = () => {
  const navigate = useNavigate();

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isOfficer = currentUser.roleName === "PROCUREMENT_OFFICER";
  const isVendor = currentUser.roleName === "VENDOR";

  // Fetch RFQs
  const { data: rfqs = [], isLoading, error } = useQuery<Rfq[]>({
    queryKey: ["rfqs"],
    queryFn: async () => {
      const res = await api.get("/rfqs");
      return res.data;
    },
  });

  const columns: TableColumn<Rfq>[] = [
    { header: "RFQ Reference", accessor: "rfqNumber", className: "font-bold text-slate-800" },
    { header: "RFQ Title", accessor: "title", className: "max-w-[200px] truncate" },
    { header: "Due Date", accessor: (row) => formatDate(row.dueDate) },
    { header: "Line Items", accessor: (row) => row._count.rfqItems, className: "text-center" },
    ...(!isVendor ? [{
      header: "Vendors Assigned",
      accessor: (row: Rfq) => row._count.rfqVendors,
      className: "text-center",
    }] : []),
    ...(!isVendor ? [{
      header: "Quotes Received",
      accessor: (row: Rfq) => row._count.quotations,
      className: "text-center",
    }] : []),
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
            navigate(`/rfqs/${row.id}`);
          }}
          className="p-1 text-slate-500 hover:text-primary-500 hover:bg-slate-100 rounded transition-colors inline-flex items-center space-x-1"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider pl-1">{isVendor ? "Bid / View" : "Details"}</span>
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
          <div className="p-2 bg-violet-50 text-violet-600 rounded">
            <FileText size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Request for Quotations (RFQs)</h2>
            <p className="text-xs text-slate-500">Create, assign, broadcast requests and receive vendor pricing bids.</p>
          </div>
        </div>
        {isOfficer && (
          <button
            onClick={() => navigate("/rfqs/new")}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded text-sm font-semibold transition-all flex items-center space-x-1 shadow shadow-primary-500/10"
          >
            <Plus size={16} />
            <span>Create RFQ</span>
          </button>
        )}
      </div>

      {/* Main Table Content */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded border border-red-200">
          Failed to load requests for quotation.
        </div>
      ) : (
        <Table columns={columns} data={rfqs} onRowClick={(row) => navigate(`/rfqs/${row.id}`)} />
      )}
    </div>
  );
};

export default RfqList;
