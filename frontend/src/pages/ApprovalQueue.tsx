import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Eye, X, CheckCircle, ShieldAlert } from "lucide-react";
import api from "../services/api";
import Table from "../components/common/Table";
import type { TableColumn } from "../components/common/Table";
import { formatCurrency, formatDate } from "../utils/formatters";

interface PendingQuote {
  id: string;
  quotationNumber: string;
  subtotal: string;
  grandTotal: string;
  validityDate: string;
  notes: string | null;
  createdAt: string;
  rfq: { rfqNumber: string; title: string };
  vendor: { name: string };
}

export const ApprovalQueue: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedQuote, setSelectedQuote] = useState<PendingQuote | null>(null);
  const [comments, setComments] = useState("");

  // Fetch pending approvals
  const { data: pendingQuotes = [], isLoading, error } = useQuery<PendingQuote[]>({
    queryKey: ["pendingApprovals"],
    queryFn: async () => {
      const res = await api.get("/approvals");
      return res.data;
    },
  });

  // Approval Mutation
  const processApprovalMutation = useMutation({
    mutationFn: async ({ id, status, comments }: { id: string; status: string; comments: string }) => {
      return api.post("/approvals", {
        quotationId: id,
        status,
        comments,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingApprovals"] });
      setSelectedQuote(null);
      setComments("");
    },
  });

  const handleAction = (status: "APPROVED" | "REJECTED") => {
    if (selectedQuote) {
      processApprovalMutation.mutate({
        id: selectedQuote.id,
        status,
        comments,
      });
    }
  };

  const columns: TableColumn<PendingQuote>[] = [
    { header: "Quotation Ref", accessor: "quotationNumber", className: "font-bold text-slate-800" },
    { header: "Supplier", accessor: (row) => row.vendor.name },
    { header: "RFQ Sheet", accessor: (row) => `${row.rfq.rfqNumber} - ${row.rfq.title}`, className: "max-w-[200px] truncate" },
    { header: "Submitted Date", accessor: (row) => formatDate(row.createdAt) },
    { header: "Grand Total", accessor: (row) => formatCurrency(row.grandTotal), className: "text-right font-bold text-primary-500" },
    {
      header: "Action",
      accessor: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedQuote(row);
          }}
          className="px-3 py-1 bg-slate-100 hover:bg-primary-500 hover:text-white rounded text-xs font-semibold transition-colors flex items-center space-x-1"
        >
          <Eye size={12} />
          <span>Review</span>
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
          <div className="p-2 bg-amber-50 text-amber-600 rounded">
            <CheckSquare size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Approvals Work Queue</h2>
            <p className="text-xs text-slate-500">Inspect submitted supplier quotes, write feedback, and authorize Purchase Orders.</p>
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
          Failed to load pending approvals queue.
        </div>
      ) : (
        <Table columns={columns} data={pendingQuotes} onRowClick={(row) => setSelectedQuote(row)} />
      )}

      {/* DETAIL MODAL WITH APPROVAL CONTROLS */}
      {selectedQuote && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Review Quotation Bid</h3>
              <button onClick={() => setSelectedQuote(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-lg font-bold text-slate-800">{selectedQuote.vendor.name}</h4>
                  <span className="text-xs text-slate-400 font-semibold">RFQ: {selectedQuote.rfq.rfqNumber} - {selectedQuote.rfq.title}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400 uppercase">Grand Total (INR)</span>
                  <div className="text-xl font-extrabold text-primary-500">{formatCurrency(selectedQuote.grandTotal)}</div>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded border border-slate-100 text-xs text-slate-600 space-y-2">
                <span className="font-bold text-slate-700 block uppercase">Supplier Proposal Notes:</span>
                <p className="italic leading-relaxed">"{selectedQuote.notes || "No special terms provided."}"</p>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">Approver Review Comments</label>
                <textarea
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-primary-500"
                  placeholder="Provide approval justification or rejection reasons..."
                />
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-end space-x-2">
                <button
                  onClick={() => handleAction("REJECTED")}
                  disabled={processApprovalMutation.isPending}
                  className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  <ShieldAlert size={14} />
                  <span>Reject Bid</span>
                </button>
                <button
                  onClick={() => handleAction("APPROVED")}
                  disabled={processApprovalMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-md shadow-emerald-600/10"
                >
                  <CheckCircle size={14} />
                  <span>Approve & Issue PO</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalQueue;
