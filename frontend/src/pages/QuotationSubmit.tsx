import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Gavel, Save } from "lucide-react";
import api from "../services/api";
import { formatCurrency } from "../utils/formatters";

interface RfqItem {
  id: string;
  productName: string;
  description: string | null;
  quantity: string;
  uom: string;
  targetPrice: string | null;
}

interface RfqDetail {
  id: string;
  rfqNumber: string;
  title: string;
  dueDate: string;
  rfqItems: RfqItem[];
}

interface ItemBid {
  rfqItemId: string;
  unitPrice: number | "";
  leadTimeDays: number;
  notes: string;
}

export const QuotationSubmit: React.FC = () => {
  const { rfqId } = useParams<{ rfqId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [validityDate, setValidityDate] = useState("");
  const [notes, setNotes] = useState("");
  const [itemBids, setItemBids] = useState<ItemBid[]>([]);
  const [error, setError] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const vendorId = currentUser.vendorId;

  // Fetch RFQ Detail to know what items to quote for
  const { data: rfq, isLoading } = useQuery<RfqDetail>({
    queryKey: ["rfqDetailsForQuoteSubmit", rfqId],
    queryFn: async () => {
      const res = await api.get(`/rfqs/${rfqId}`);
      // Initialize bids array once rfq data is loaded
      const items = res.data.rfqItems as RfqItem[];
      setItemBids(
        items.map((item) => ({
          rfqItemId: item.id,
          unitPrice: "",
          leadTimeDays: 7,
          notes: "",
        }))
      );
      return res.data;
    },
  });

  // Fetch Vendor Profile to know GST state code
  const { data: vendor } = useQuery<any>({
    queryKey: ["vendorSelfProfile", vendorId],
    queryFn: async () => {
      const res = await api.get(`/vendors/${vendorId}`);
      return res.data;
    },
    enabled: !!vendorId,
  });

  // Submit Quote Mutation
  const submitQuoteMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post("/quotations", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfqDetails", rfqId] });
      navigate(`/rfqs/${rfqId}`);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || "Failed to submit quotation bid");
    },
  });

  const handlePriceChange = (index: number, val: string) => {
    const updated = [...itemBids];
    updated[index].unitPrice = val === "" ? "" : Number(val);
    setItemBids(updated);
  };

  const handleLeadTimeChange = (index: number, val: number) => {
    const updated = [...itemBids];
    updated[index].leadTimeDays = val;
    setItemBids(updated);
  };

  const handleItemNotesChange = (index: number, val: string) => {
    const updated = [...itemBids];
    updated[index].notes = val;
    setItemBids(updated);
  };

  // Dynamic calculations for preview
  const getTotals = () => {
    if (!rfq || itemBids.length === 0) return { subtotal: 0, cgst: 0, sgst: 0, igst: 0, grandTotal: 0 };
    
    let subtotal = 0;
    itemBids.forEach((bid, idx) => {
      const qty = Number(rfq.rfqItems[idx]?.quantity || 0);
      const price = Number(bid.unitPrice || 0);
      subtotal += qty * price;
    });

    const isIntraState = vendor?.taxId?.substring(0, 2) === "27";
    const gstRate = 0.18;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isIntraState) {
      cgst = subtotal * (gstRate / 2);
      sgst = subtotal * (gstRate / 2);
    } else {
      igst = subtotal * gstRate;
    }

    const grandTotal = subtotal + cgst + sgst + igst;

    return { subtotal, cgst, sgst, igst, grandTotal };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate prices
    const missingPrices = itemBids.some(bid => bid.unitPrice === "" || bid.unitPrice < 0);
    if (missingPrices) {
      setError("Please input a valid unit price for all requested items.");
      return;
    }

    submitQuoteMutation.mutate({
      rfqId,
      validityDate,
      notes,
      items: itemBids,
    });
  };

  if (isLoading || !rfq || itemBids.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    );
  }

  const { subtotal, cgst, sgst, igst, grandTotal } = getTotals();

  return (
    <div className="space-y-6 select-none p-1">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate(`/rfqs/${rfqId}`)} 
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
            <Gavel size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Submit Quotation Bid</h2>
            <p className="text-xs text-slate-500">Provide unit pricing and lead times in response to {rfq.rfqNumber}.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left column: Line Items inputs */}
        <div className="lg:col-span-2 space-y-6 bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider border-b border-slate-100 pb-3">Bidding Requirements</h3>
          
          {error && (
            <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {rfq.rfqItems.map((item, idx) => (
              <div key={item.id} className="p-4 border border-slate-100 rounded bg-slate-50/50 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm">{item.productName}</span>
                  <span className="text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-700 font-semibold uppercase">
                    Req: {item.quantity} {item.uom}
                  </span>
                </div>
                {item.description && <p className="text-xs text-slate-500 mt-1">{item.description}</p>}
                {item.targetPrice && (
                  <div className="text-[10px] text-slate-400 font-bold uppercase">
                    Target Price Reference: {formatCurrency(item.targetPrice)}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unit Price (INR)</label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="any"
                      value={itemBids[idx]?.unitPrice}
                      onChange={(e) => handlePriceChange(idx, e.target.value)}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-primary-500"
                      placeholder="e.g. 2100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Lead Time (Days)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={itemBids[idx]?.leadTimeDays}
                      onChange={(e) => handleLeadTimeChange(idx, Number(e.target.value))}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Compliance Notes</label>
                    <input
                      type="text"
                      value={itemBids[idx]?.notes}
                      onChange={(e) => handleItemNotesChange(idx, e.target.value)}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-primary-500"
                      placeholder="e.g. Meets ASTM specs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Quotation metadata & Summary */}
        <div className="space-y-6">
          {/* Terms */}
          <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">Validity & Terms</h3>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Quote Validity Date</label>
              <input
                type="date"
                required
                value={validityDate}
                onChange={(e) => setValidityDate(e.target.value)}
                className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Supplier Notes / Cover Letter</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                placeholder="Include custom payment terms, logistic notes..."
              />
            </div>
          </div>

          {/* Totals Summary */}
          <div className="bg-slate-900 text-slate-100 p-6 rounded-lg shadow-md space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2">Financial Summary</h3>
            <div className="space-y-2.5 text-xs font-medium">
              <div className="flex items-center justify-between text-slate-300">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>CGST (9%):</span>
                <span>{formatCurrency(cgst)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>SGST (9%):</span>
                <span>{formatCurrency(sgst)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>IGST (18%):</span>
                <span>{formatCurrency(igst)}</span>
              </div>
              <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-sm font-bold text-slate-50">
                <span>Grand Total:</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitQuoteMutation.isPending}
                className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded text-sm font-semibold transition-all flex items-center justify-center space-x-1.5"
              >
                <Save size={16} />
                <span>{submitQuoteMutation.isPending ? "Submitting..." : "Submit Quotation Bid"}</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default QuotationSubmit;
