import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  Gavel, 
  ArrowLeft, 
  Calendar, 
  LayoutGrid, 
  CheckSquare, 
  FileText
} from "lucide-react";
import api from "../services/api";
import StatusBadge from "../components/common/StatusBadge";
import { formatDate, formatCurrency } from "../utils/formatters";
import ProcurementTimeline from "../components/workflow/ProcurementTimeline";

interface QuotationItem {
  id: string;
  unitPrice: string;
  totalPrice: string;
  leadTimeDays: number;
  notes: string | null;
  rfqItem: { productName: string; quantity: string; uom: string; description: string | null };
}

interface QuotationDetailData {
  id: string;
  quotationNumber: string;
  status: string;
  subtotal: string;
  cgst: string;
  sgst: string;
  igst: string;
  grandTotal: string;
  validityDate: string;
  notes: string | null;
  createdAt: string;
  rfqId: string;
  vendorId: string;
  rfq: { rfqNumber: string; title: string };
  vendor: { name: string; contactName: string; contactEmail: string; contactPhone: string; address: string; taxId: string };
  quotationItems: QuotationItem[];
}

export const QuotationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isVendor = currentUser.roleName === "VENDOR";
  const isManager = currentUser.roleName === "MANAGER" || currentUser.roleName === "ADMIN";

  // Fetch Quotation Details
  const { data: quote, isLoading, error } = useQuery<QuotationDetailData>({
    queryKey: ["quotationDetails", id],
    queryFn: async () => {
      const res = await api.get(`/quotations/${id}`);
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="p-6 text-center text-red-500 bg-red-50 border border-red-200 rounded-lg">
        Failed to fetch quotation details or you are not authorized to view this bid sheet.
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none p-1">
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate("/quotations")} 
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
            <Gavel size={22} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-800">{quote.quotationNumber}</h2>
              <StatusBadge status={quote.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Linked RFQ: {quote.rfq.rfqNumber} - {quote.rfq.title}</p>
          </div>
        </div>

        {/* Action Controls for internal roles */}
        {!isVendor && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate(`/quotations/compare/${quote.rfqId}`)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded text-sm font-semibold flex items-center space-x-1.5 transition-colors text-slate-700"
            >
              <LayoutGrid size={14} />
              <span>Compare Matrix</span>
            </button>
            {isManager && quote.status === "SUBMITTED" && (
              <button
                onClick={() => navigate("/approvals")}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded text-sm font-semibold flex items-center space-x-1.5 transition-all shadow shadow-primary-500/10"
              >
                <CheckSquare size={14} />
                <span>Go to Approvals Queue</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Bid details & items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Card */}
          <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm space-y-4 text-sm">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">Bid Specifications</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Submitted Date</span>
                <span className="text-slate-700 font-medium">{formatDate(quote.createdAt)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar size={16} className="text-slate-400" />
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Bid Validity Date</span>
                  <span className="text-slate-700 font-medium">{formatDate(quote.validityDate)}</span>
                </div>
              </div>
              <div className="col-span-2">
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Linked RFQ Sheet</span>
                <Link to={`/rfqs/${quote.rfqId}`} className="text-primary-600 font-semibold hover:underline flex items-center space-x-1">
                  <FileText size={14} />
                  <span>{quote.rfq.rfqNumber} - {quote.rfq.title}</span>
                </Link>
              </div>
              <div className="col-span-2">
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Proposal Notes / Cover Letter</span>
                <p className="text-slate-600 leading-relaxed font-medium bg-slate-50 p-3 rounded border border-slate-100">
                  {quote.notes || "No cover letter notes provided."}
                </p>
              </div>
            </div>
          </div>

          {/* Line Items Card */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Bidded Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-100">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Product Name</th>
                    <th className="px-6 py-3 text-center">Bidded Qty</th>
                    <th className="px-6 py-3 text-right">Unit Price</th>
                    <th className="px-6 py-3 text-right">Total Price</th>
                    <th className="px-6 py-3 text-center">Lead Time</th>
                    <th className="px-6 py-3">Compliance Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {quote.quotationItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-3.5 font-bold text-slate-800">
                        {item.rfqItem.productName}
                        {item.rfqItem.description && <span className="block text-[10px] text-slate-400 font-normal mt-0.5">{item.rfqItem.description}</span>}
                      </td>
                      <td className="px-6 py-3.5 text-center text-slate-700 font-semibold">{item.rfqItem.quantity} {item.rfqItem.uom}</td>
                      <td className="px-6 py-3.5 text-right text-slate-700 font-semibold">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-6 py-3.5 text-right text-slate-700 font-bold">{formatCurrency(item.totalPrice)}</td>
                      <td className="px-6 py-3.5 text-center text-slate-700 font-medium">{item.leadTimeDays} Days</td>
                      <td className="px-6 py-3.5 text-slate-600 font-medium">{item.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column: Vendor & Financial summary */}
        <div className="space-y-6">
          {/* Vendor Details (Only shown to internal roles) */}
          {!isVendor && (
            <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm space-y-4 text-sm">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">Supplier Card</h3>
              <div className="space-y-2">
                <span className="font-bold text-slate-800 block text-sm">{quote.vendor.name}</span>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">GSTIN: {quote.vendor.taxId}</span>
                <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-50 font-medium">
                  <div>Contact: {quote.vendor.contactName}</div>
                  <div>Phone: {quote.vendor.contactPhone}</div>
                  <div>Email: {quote.vendor.contactEmail}</div>
                  <div className="pt-1 italic leading-relaxed text-slate-500">Address: {quote.vendor.address}</div>
                </div>
              </div>
            </div>
          )}

          {/* Financial Summary */}
          <div className="bg-slate-900 text-slate-100 p-6 rounded-lg shadow-md space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2">Financial Summary</h3>
            <div className="space-y-2.5 text-xs font-medium">
              <div className="flex items-center justify-between text-slate-300">
                <span>Subtotal:</span>
                <span>{formatCurrency(quote.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>CGST (9%):</span>
                <span>{formatCurrency(quote.cgst)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>SGST (9%):</span>
                <span>{formatCurrency(quote.sgst)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>IGST (18%):</span>
                <span>{formatCurrency(quote.igst)}</span>
              </div>
              <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-sm font-bold text-slate-50">
                <span>Grand Total:</span>
                <span>{formatCurrency(quote.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Procurement Timeline Widget */}
          <ProcurementTimeline quotationId={quote.id} />
        </div>
      </div>
    </div>
  );
};

export default QuotationDetail;
