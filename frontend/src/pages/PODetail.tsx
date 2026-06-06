import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ShoppingCart, 
  ArrowLeft, 
  Send, 
  Calendar, 
  Receipt, 
  FileCheck, 
  X
} from "lucide-react";
import api from "../services/api";
import ProgressTracker from "../components/workflow/ProgressTracker";
import StatusBadge from "../components/common/StatusBadge";
import { formatDate, formatCurrency } from "../utils/formatters";
import ProcurementTimeline from "../components/workflow/ProcurementTimeline";

interface POItem {
  id: string;
  productName: string;
  description: string | null;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  uom: string;
}

interface PODetailData {
  id: string;
  poNumber: string;
  status: string;
  subtotal: string;
  cgst: string;
  sgst: string;
  igst: string;
  grandTotal: string;
  deliveryDate: string;
  terms: string | null;
  createdAt: string;
  vendorId: string;
  vendor: { name: string; contactName: string; contactEmail: string; address: string; taxId: string };
  creator: { firstName: string; lastName: string };
  poItems: POItem[];
}

export const PODetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceDueDate, setInvoiceDueDate] = useState("");
  const [invoiceError, setInvoiceError] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isOfficer = currentUser.roleName === "PROCUREMENT_OFFICER";
  const isVendor = currentUser.roleName === "VENDOR";

  // Fetch PO Details
  const { data: po, isLoading, error } = useQuery<PODetailData>({
    queryKey: ["poDetails", id],
    queryFn: async () => {
      const res = await api.get(`/pos/${id}`);
      return res.data;
    },
  });

  // Fetch Invoices associated with this PO
  const { data: invoices = [] } = useQuery<any[]>({
    queryKey: ["poInvoices", id],
    queryFn: async () => {
      const res = await api.get("/invoices");
      return res.data.filter((inv: any) => inv.purchaseOrderId === id);
    },
    enabled: !!po,
  });

  // Dispatch PO Mutation (DRAFT -> SENT)
  const sendPOMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/pos/${id}/send`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["poDetails", id] });
    },
  });

  // Create Invoice Mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (payload: { purchaseOrderId: string; dueDate: string }) => {
      return api.post("/invoices", payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["poDetails", id] });
      queryClient.invalidateQueries({ queryKey: ["poInvoices", id] });
      setIsInvoiceModalOpen(false);
      navigate(`/invoices/${res.data.id}`); // direct to generated invoice page
    },
    onError: (err: any) => {
      setInvoiceError(err.response?.data?.message || "Failed to create invoice");
    },
  });

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    setInvoiceError("");
    createInvoiceMutation.mutate({
      purchaseOrderId: id!,
      dueDate: invoiceDueDate,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="p-6 text-center text-red-500 bg-red-50 border border-red-200 rounded-lg">
        Failed to fetch Purchase Order details.
      </div>
    );
  }

  const poSteps = ["DRAFT", "SENT", "COMPLETED", "CANCELLED"];

  return (
    <div className="space-y-6 select-none p-1">
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => navigate("/purchase-orders")} 
              className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded">
              <ShoppingCart size={22} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-800">{po.poNumber}</h2>
                <StatusBadge status={po.status} />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Issued to {po.vendor.name}</p>
            </div>
          </div>

          <ProgressTracker steps={poSteps} currentStep={po.status} />
        </div>

        {/* PO Action Controls */}
        {isOfficer && po.status === "DRAFT" && (
          <div className="border-t border-slate-100 pt-4 flex items-center justify-end">
            <button
              onClick={() => sendPOMutation.mutate()}
              disabled={sendPOMutation.isPending}
              className="px-5 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded text-sm font-semibold flex items-center space-x-1.5 transition-all shadow shadow-primary-500/10"
            >
              <Send size={14} />
              <span>Dispatch to Vendor</span>
            </button>
          </div>
        )}

        {isVendor && po.status === "SENT" && (
          <div className="border-t border-slate-100 pt-4 flex items-center justify-end">
            <button
              onClick={() => {
                setInvoiceDueDate("");
                setInvoiceError("");
                setIsInvoiceModalOpen(true);
              }}
              className="px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded text-sm font-semibold flex items-center space-x-1.5 shadow shadow-primary-500/10"
            >
              <Receipt size={16} />
              <span>Create Billing Invoice</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: PO line items & details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Card */}
          <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm space-y-4 text-sm">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">Order Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Issued By Officer</span>
                <span className="text-slate-700 font-medium">{po.creator.firstName} {po.creator.lastName}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar size={16} className="text-slate-400" />
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Expected Delivery</span>
                  <span className="text-slate-700 font-medium">{formatDate(po.deliveryDate)}</span>
                </div>
              </div>
              <div className="col-span-2">
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Delivery Address (Bill To)</span>
                <span className="text-slate-700 font-semibold block bg-slate-50 border border-slate-100 p-2.5 rounded">
                  VendorBridge Corporate warehouse, Mumbai Central Facility, MH - 400001
                </span>
              </div>
              <div className="col-span-2">
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Payment Terms & Clauses</span>
                <p className="text-slate-600 leading-relaxed font-medium bg-slate-50 p-3 rounded border border-slate-100">
                  {po.terms || "Standard PO clauses apply."}
                </p>
              </div>
            </div>
          </div>

          {/* Line Items Card */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Ordered Products / Services</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-100">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Product Name</th>
                    <th className="px-6 py-3">Specs</th>
                    <th className="px-6 py-3 text-center">Qty</th>
                    <th className="px-6 py-3">UOM</th>
                    <th className="px-6 py-3 text-right">Unit Price</th>
                    <th className="px-6 py-3 text-right">Total Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {po.poItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-3.5 font-bold text-slate-800">{item.productName}</td>
                      <td className="px-6 py-3.5 text-slate-600">{item.description || "-"}</td>
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

        {/* Right column: Vendor & Financial summary & linked Invoices */}
        <div className="space-y-6">
          {/* Vendor Details */}
          <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm space-y-4 text-sm">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">Supplier Profile</h3>
            <div className="space-y-2">
              <span className="font-bold text-slate-800 block text-sm">{po.vendor.name}</span>
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">GSTIN: {po.vendor.taxId}</span>
              <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-50 font-medium">
                <div>Contact: {po.vendor.contactName}</div>
                <div>Email: {po.vendor.contactEmail}</div>
                <div className="pt-1 italic leading-relaxed text-slate-500">Address: {po.vendor.address}</div>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-slate-900 text-slate-100 p-6 rounded-lg shadow-md space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2">Purchase Financials</h3>
            <div className="space-y-2.5 text-xs font-medium">
              <div className="flex items-center justify-between text-slate-300">
                <span>Subtotal:</span>
                <span>{formatCurrency(po.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>CGST (9%):</span>
                <span>{formatCurrency(po.cgst)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>SGST (9%):</span>
                <span>{formatCurrency(po.sgst)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>IGST (18%):</span>
                <span>{formatCurrency(po.igst)}</span>
              </div>
              <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-sm font-bold text-slate-50">
                <span>Grand Total:</span>
                <span>{formatCurrency(po.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Linked Invoices */}
          <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center space-x-1.5">
              <Receipt size={14} />
              <span>Linked Tax Invoices</span>
            </h3>

            {invoices.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium">No billing invoices raised for this PO.</p>
            ) : (
              <div className="space-y-2.5">
                {invoices.map((inv) => (
                  <Link
                    key={inv.id}
                    to={`/invoices/${inv.id}`}
                    className="flex items-center justify-between p-3 rounded bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors text-xs text-slate-700 font-semibold"
                  >
                    <div>
                      <span className="block font-bold text-slate-800">{inv.invoiceNumber}</span>
                      <span className="text-[10px] text-slate-400 font-medium">Due: {formatDate(inv.dueDate)}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-slate-800">{formatCurrency(inv.grandTotal)}</span>
                      <span className="text-[9px] uppercase"><StatusBadge status={inv.status} /></span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          
          {/* Procurement Timeline Widget */}
          <ProcurementTimeline poId={po.id} />
        </div>
      </div>

      {/* CREATE INVOICE MODAL */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Create Bill Invoice</h3>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4">
              {invoiceError && (
                <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded text-xs font-semibold">
                  {invoiceError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Invoice Due Date</label>
                <input
                  type="date"
                  required
                  value={invoiceDueDate}
                  onChange={(e) => setInvoiceDueDate(e.target.value)}
                  className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded border border-slate-100 text-xs font-medium text-slate-500 space-y-1.5">
                <div className="flex justify-between">
                  <span>Billing Amount:</span>
                  <span className="font-bold text-slate-700">{formatCurrency(po.grandTotal)}</span>
                </div>
                <div className="text-[10px] text-slate-400 uppercase pt-1 border-t border-slate-200 leading-normal">
                  Items, quantities, pricing, and GST details will be copied directly from PO.
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createInvoiceMutation.isPending}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded text-sm font-semibold flex items-center space-x-1"
                >
                  <FileCheck size={14} />
                  <span>{createInvoiceMutation.isPending ? "Generating..." : "Generate Invoice"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PODetail;
