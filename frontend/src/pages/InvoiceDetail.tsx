import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Receipt, 
  ArrowLeft, 
  Send, 
  Calendar, 
  Paperclip, 
  Download,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import api from "../services/api";
import StatusBadge from "../components/common/StatusBadge";
import { formatDate, formatCurrency } from "../utils/formatters";

interface InvoiceItem {
  id: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  uom: string;
}

interface InvoiceDetailData {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: string;
  cgst: string;
  sgst: string;
  igst: string;
  grandTotal: string;
  dueDate: string;
  pdfUrl: string | null;
  createdAt: string;
  vendorId: string;
  purchaseOrderId: string;
  vendor: { name: string; contactName: string; contactEmail: string; address: string; taxId: string };
  purchaseOrder: { poNumber: string };
  invoiceItems: InvoiceItem[];
}

export const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [alertMessage, setAlertMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isVendor = currentUser.roleName === "VENDOR";

  // Fetch Invoice Details
  const { data: invoice, isLoading, error } = useQuery<InvoiceDetailData>({
    queryKey: ["invoiceDetails", id],
    queryFn: async () => {
      const res = await api.get(`/invoices/${id}`);
      return res.data;
    },
  });

  // Send PDF Mutation
  const sendInvoiceMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/invoices/${id}/send-pdf`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoiceDetails", id] });
      setSuccessMessage("Tax Invoice PDF compiled and emailed successfully.");
    },
    onError: (err: any) => {
      setAlertMessage(err.response?.data?.message || "PDF generation/dispatch failed.");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-6 text-center text-red-500 bg-red-50 border border-red-200 rounded-lg">
        Failed to fetch Invoice details.
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none p-1">
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate(`/purchase-orders/${invoice.purchaseOrderId}`)} 
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="p-2 bg-teal-50 text-teal-600 rounded">
            <Receipt size={22} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-800">{invoice.invoiceNumber}</h2>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Linked PO: {invoice.purchaseOrder.poNumber}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {invoice.status === "DRAFT" && (isVendor || currentUser.roleName === "ADMIN") && (
            <button
              onClick={() => sendInvoiceMutation.mutate()}
              disabled={sendInvoiceMutation.isPending}
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded text-sm font-semibold flex items-center space-x-1.5 transition-all shadow shadow-primary-500/10"
            >
              <Send size={14} />
              <span>{sendInvoiceMutation.isPending ? "Compiling PDF..." : "Compile & Email Invoice"}</span>
            </button>
          )}

          {invoice.pdfUrl && (
            <a
              href={`http://localhost:5000${invoice.pdfUrl}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-sm font-semibold flex items-center space-x-1.5 transition-colors text-slate-700"
            >
              <Download size={14} />
              <span>Download PDF</span>
            </a>
          )}
        </div>
      </div>

      {/* Success / Alert Dialogs */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg flex items-center space-x-3 text-sm font-medium">
          <CheckCircle2 size={20} className="text-emerald-500" />
          <span>{successMessage}</span>
        </div>
      )}

      {alertMessage && (
        <div className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg flex items-center space-x-3 text-sm font-medium">
          <AlertCircle size={20} className="text-rose-500" />
          <span>{alertMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Invoice line items & billing details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Card */}
          <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm space-y-4 text-sm">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">Billing Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Billing Date</span>
                <span className="text-slate-700 font-medium">{formatDate(invoice.createdAt)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar size={16} className="text-slate-400" />
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Payment Due Date</span>
                  <span className="text-slate-700 font-medium">{formatDate(invoice.dueDate)}</span>
                </div>
              </div>
              <div className="col-span-2">
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Corporate Billing Entity</span>
                <span className="text-slate-700 font-semibold block bg-slate-50 border border-slate-100 p-2.5 rounded">
                  VendorBridge Corporate Accounts, Mumbai Central Facility, MH - 400001
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Card */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Billed Line Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-100">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Product Name</th>
                    <th className="px-6 py-3 text-center">Billed Qty</th>
                    <th className="px-6 py-3">UOM</th>
                    <th className="px-6 py-3 text-right">Unit Price</th>
                    <th className="px-6 py-3 text-right">Total Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {invoice.invoiceItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-3.5 font-bold text-slate-800">{item.productName}</td>
                      <td className="px-6 py-3.5 text-center text-slate-700 font-semibold">{item.quantity}</td>
                      <td className="px-6 py-3.5 text-slate-600 uppercase font-medium">{item.uom}</td>
                      <td className="px-6 py-3.5 text-right text-slate-700 font-semibold">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-6 py-3.5 text-right text-slate-700 font-bold">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column: Vendor & Financial summary */}
        <div className="space-y-6">
          {/* Vendor Details */}
          <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm space-y-4 text-sm">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">Supplier Card</h3>
            <div className="space-y-2">
              <span className="font-bold text-slate-800 block text-sm">{invoice.vendor.name}</span>
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">GSTIN: {invoice.vendor.taxId}</span>
              <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-50 font-medium">
                <div>Billing Contact: {invoice.vendor.contactName}</div>
                <div>Email: {invoice.vendor.contactEmail}</div>
                <div className="pt-1 italic leading-relaxed text-slate-500">Address: {invoice.vendor.address}</div>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-slate-900 text-slate-100 p-6 rounded-lg shadow-md space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2">Tax Invoice Financials</h3>
            <div className="space-y-2.5 text-xs font-medium">
              <div className="flex items-center justify-between text-slate-300">
                <span>Subtotal:</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>CGST (9%):</span>
                <span>{formatCurrency(invoice.cgst)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>SGST (9%):</span>
                <span>{formatCurrency(invoice.sgst)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>IGST (18%):</span>
                <span>{formatCurrency(invoice.igst)}</span>
              </div>
              <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-sm font-bold text-slate-50">
                <span>Grand Total:</span>
                <span>{formatCurrency(invoice.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
