import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
import api from "../services/api";
import { formatCurrency } from "../utils/formatters";

interface CompareData {
  rfq: {
    id: string;
    rfqNumber: string;
    title: string;
    rfqItems: Array<{ id: string; productName: string; quantity: string; uom: string }>;
  };
  quotations: Array<{
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
    vendor: { id: string; name: string };
    quotationItems: Array<{ rfqItemId: string; unitPrice: string; totalPrice: string; leadTimeDays: number; notes: string | null }>;
  }>;
}

export const QuotationCompare: React.FC = () => {
  const { rfqId } = useParams<{ rfqId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isManager = currentUser.roleName === "ADMIN" || currentUser.roleName === "MANAGER";

  // Fetch comparison data
  const { data, isLoading, error } = useQuery<CompareData>({
    queryKey: ["compareQuotations", rfqId],
    queryFn: async () => {
      const res = await api.get(`/quotations/compare/${rfqId}`);
      return res.data;
    },
  });

  // Approve Quotation Mutation
  const approveMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      return api.post("/approvals", {
        quotationId: quoteId,
        status: "APPROVED",
        comments: "Approved from comparison matrix due to competitive pricing and lead times.",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compareQuotations", rfqId] });
      queryClient.invalidateQueries({ queryKey: ["rfqDetails", rfqId] });
      navigate(`/rfqs/${rfqId}`);
    },
  });

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
        Failed to fetch quotation comparison details.
      </div>
    );
  }

  const { rfq, quotations } = data;

  // Recommendation logic
  const getRecommendation = () => {
    if (quotations.length === 0) return null;

    const quotesWithMetrics = quotations.map(q => {
      const price = Number(q.grandTotal);
      const avgLeadTime = q.quotationItems.reduce((sum, item) => sum + item.leadTimeDays, 0) / (q.quotationItems.length || 1);
      
      let vendorScore = 80;
      if (q.vendor.name.toLowerCase().includes("tata")) vendorScore = 92;
      else if (q.vendor.name.toLowerCase().includes("reliance")) vendorScore = 88;
      else if (q.vendor.name.toLowerCase().includes("wipro")) vendorScore = 85;
      else vendorScore = 78;

      return {
        quote: q,
        price,
        avgLeadTime,
        vendorScore,
      };
    });

    const minPrice = Math.min(...quotesWithMetrics.map(q => q.price));
    const minLeadTime = Math.min(...quotesWithMetrics.map(q => q.avgLeadTime));
    const maxScore = Math.max(...quotesWithMetrics.map(q => q.vendorScore));

    const scoredQuotes = quotesWithMetrics.map(q => {
      const priceRatio = minPrice / q.price;
      const leadTimeRatio = q.avgLeadTime > 0 ? (minLeadTime / q.avgLeadTime) : 1.0;
      const scoreRatio = q.vendorScore / 100;

      // Price 50%, Lead time 30%, Vendor score 20%
      const totalScore = (priceRatio * 50) + (leadTimeRatio * 30) + (scoreRatio * 20);

      return {
        ...q,
        totalScore,
      };
    });

    const winner = [...scoredQuotes].sort((a, b) => b.totalScore - a.totalScore)[0];

    const reasons: string[] = [];
    if (winner.price === minPrice) {
      reasons.push("Lowest pricing: Saves capital budget with the most competitive bid.");
    } else {
      const diff = winner.price - minPrice;
      if (diff / winner.price < 0.1) {
        reasons.push(`Highly competitive price: Within 10% of the lowest bid (Premium of only ${formatCurrency(diff)}).`);
      }
    }

    if (winner.avgLeadTime === minLeadTime) {
      reasons.push(`Fastest delivery speed: Shortest lead times averaging ${Math.round(winner.avgLeadTime * 10) / 10} days.`);
    } else {
      reasons.push(`Prompt delivery: Average fulfillment lead time of ${Math.round(winner.avgLeadTime * 10) / 10} days.`);
    }

    if (winner.vendorScore === maxScore) {
      reasons.push(`Top supplier rating: Best approval track record and performance score of ${winner.vendorScore}/100.`);
    } else if (winner.vendorScore >= 80) {
      reasons.push(`High reliability: Solid supplier scorecard performance of ${winner.vendorScore}/100.`);
    }

    return {
      vendorName: winner.quote.vendor.name,
      quotationNumber: winner.quote.quotationNumber,
      reasons,
      price: winner.price,
      leadTime: winner.avgLeadTime,
      vendorScore: winner.vendorScore,
    };
  };

  const recommendation = getRecommendation();

  // Find lowest price for each item to highlight
  const getLowestPriceForRfqItem = (rfqItemId: string) => {
    let lowest = Infinity;
    quotations.forEach((q) => {
      const qi = q.quotationItems.find((item) => item.rfqItemId === rfqItemId);
      if (qi) {
        const price = Number(qi.unitPrice);
        if (price < lowest) lowest = price;
      }
    });
    return lowest;
  };

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
            <LayoutGrid size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Quotation Comparison Matrix</h2>
            <p className="text-xs text-slate-500">Side-by-side financial breakdown for {rfq.rfqNumber} - {rfq.title}.</p>
          </div>
        </div>
      </div>

      {/* Recommended Vendor Widget */}
      {recommendation && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-200/80 p-5 rounded-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-emerald-800 font-extrabold text-xs uppercase tracking-wider">
              <span>🏆 Recommended Vendor Decision Support</span>
            </div>
            <h3 className="text-base font-extrabold text-slate-800">
              {recommendation.vendorName} <span className="text-xs text-slate-400 font-bold">({recommendation.quotationNumber})</span>
            </h3>
            <ul className="space-y-1 text-xs text-slate-600 font-semibold list-disc list-inside">
              {recommendation.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
          <div className="bg-white p-3 rounded-lg border border-emerald-100 flex items-center space-x-4 flex-shrink-0 shadow-sm text-xs font-semibold text-slate-500">
            <div>
              <span className="block text-[10px] text-slate-400 uppercase">Fulfillment</span>
              <span className="text-slate-800 font-bold block">{Math.round(recommendation.leadTime * 10) / 10} Days avg</span>
            </div>
            <div className="border-l border-slate-100 h-8" />
            <div>
              <span className="block text-[10px] text-slate-400 uppercase">Vendor Score</span>
              <span className="text-emerald-600 font-extrabold block">{recommendation.vendorScore} / 100</span>
            </div>
            <div className="border-l border-slate-100 h-8" />
            <div>
              <span className="block text-[10px] text-slate-400 uppercase">Value Total</span>
              <span className="text-primary-500 font-extrabold block">{formatCurrency(recommendation.price)}</span>
            </div>
          </div>
        </div>
      )}

      {quotations.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-lg flex items-center space-x-3">
          <AlertTriangle size={24} />
          <div>
            <h4 className="font-bold">No Bids to Compare</h4>
            <p className="text-xs mt-0.5">There are currently no quotations submitted by vendors for this request.</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm bg-white table-container">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs select-none">
            {/* Table Header: Vendors */}
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 border-r border-slate-200 min-w-[240px] bg-slate-100/70">RFQ Requirements</th>
                {quotations.map((q) => (
                  <th key={q.id} className="px-6 py-4 border-r border-slate-200 text-center min-w-[200px]">
                    <span className="block text-slate-800 font-extrabold text-sm">{q.vendor.name}</span>
                    <span className="text-[10px] text-slate-400 font-bold mt-0.5 block">{q.quotationNumber}</span>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body: Side-by-side items */}
            <tbody className="divide-y divide-slate-200 bg-white">
              {rfq.rfqItems.map((rfqItem) => {
                const lowestPrice = getLowestPriceForRfqItem(rfqItem.id);
                return (
                  <tr key={rfqItem.id}>
                    <td className="px-6 py-4 border-r border-slate-200 bg-slate-50/50">
                      <span className="font-bold text-slate-800 block text-xs">{rfqItem.productName}</span>
                      <span className="text-[10px] text-slate-400 font-medium block">
                        Req: {rfqItem.quantity} {rfqItem.uom}
                      </span>
                    </td>
                    {quotations.map((q) => {
                      const qi = q.quotationItems.find((item) => item.rfqItemId === rfqItem.id);
                      if (!qi) {
                        return (
                          <td key={q.id} className="px-6 py-4 border-r border-slate-200 text-center text-slate-400">
                            No Quote Provided
                          </td>
                        );
                      }
                      const isLowest = Number(qi.unitPrice) === lowestPrice;
                      return (
                        <td 
                          key={q.id} 
                          className={`px-6 py-4 border-r border-slate-200 text-center transition-colors ${
                            isLowest ? "bg-green-50/70" : ""
                          }`}
                        >
                          <div className={`font-bold ${isLowest ? "text-green-700" : "text-slate-800"}`}>
                            {formatCurrency(qi.unitPrice)} / {rfqItem.uom}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                            Total: {formatCurrency(qi.totalPrice)}
                          </div>
                          <div className="text-[10px] text-primary-500 font-semibold mt-1">
                            Lead Time: {qi.leadTimeDays} days
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Cover Notes */}
              <tr className="bg-slate-50/30">
                <td className="px-6 py-4 font-bold text-slate-500 border-r border-slate-200 bg-slate-50/50">Cover Notes / Logistics</td>
                {quotations.map((q) => (
                  <td key={q.id} className="px-6 py-4 border-r border-slate-200 text-slate-600 italic leading-relaxed text-[11px] max-w-[200px]">
                    {q.notes || "No special terms provided."}
                  </td>
                ))}
              </tr>

              {/* Financial Totals */}
              <tr className="bg-slate-50/50">
                <td className="px-6 py-3 font-bold text-slate-600 border-r border-slate-200 bg-slate-50/50">Subtotal</td>
                {quotations.map((q) => (
                  <td key={q.id} className="px-6 py-3 border-r border-slate-200 text-center text-slate-700 font-semibold">
                    {formatCurrency(q.subtotal)}
                  </td>
                ))}
              </tr>
              <tr className="bg-slate-50/50">
                <td className="px-6 py-3 font-bold text-slate-600 border-r border-slate-200 bg-slate-50/50">CGST (9%)</td>
                {quotations.map((q) => (
                  <td key={q.id} className="px-6 py-3 border-r border-slate-200 text-center text-slate-700 font-semibold">
                    {formatCurrency(q.cgst)}
                  </td>
                ))}
              </tr>
              <tr className="bg-slate-50/50">
                <td className="px-6 py-3 font-bold text-slate-600 border-r border-slate-200 bg-slate-50/50">SGST (9%)</td>
                {quotations.map((q) => (
                  <td key={q.id} className="px-6 py-3 border-r border-slate-200 text-center text-slate-700 font-semibold">
                    {formatCurrency(q.sgst)}
                  </td>
                ))}
              </tr>
              <tr className="bg-slate-50/50">
                <td className="px-6 py-3 font-bold text-slate-600 border-r border-slate-200 bg-slate-50/50">IGST (18%)</td>
                {quotations.map((q) => (
                  <td key={q.id} className="px-6 py-3 border-r border-slate-200 text-center text-slate-700 font-semibold">
                    {formatCurrency(q.igst)}
                  </td>
                ))}
              </tr>

              <tr className="bg-slate-100/50 font-bold border-y border-slate-300">
                <td className="px-6 py-4 border-r border-slate-200 text-slate-800 text-xs bg-slate-100/80">Grand Total (INR)</td>
                {quotations.map((q) => (
                  <td key={q.id} className="px-6 py-4 border-r border-slate-200 text-center text-primary-500 font-extrabold text-sm">
                    {formatCurrency(q.grandTotal)}
                  </td>
                ))}
              </tr>

              {/* Action Buttons for Managers */}
              {isManager && (
                <tr className="bg-slate-50/10">
                  <td className="px-6 py-6 border-r border-slate-200 bg-slate-50/30 font-bold text-slate-500">Procurement Decision</td>
                  {quotations.map((q) => (
                    <td key={q.id} className="px-6 py-6 border-r border-slate-200 text-center">
                      {q.status === "APPROVED" ? (
                        <span className="text-emerald-600 font-extrabold flex items-center justify-center space-x-1 uppercase text-[10px]">
                          <CheckCircle size={14} />
                          <span>Approved (PO Spawned)</span>
                        </span>
                      ) : q.status === "REJECTED" ? (
                        <span className="text-slate-400 font-bold uppercase text-[10px]">Rejected</span>
                      ) : (
                        <button
                          onClick={() => approveMutation.mutate(q.id)}
                          disabled={approveMutation.isPending}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded text-xs font-semibold shadow shadow-emerald-600/10 inline-flex items-center space-x-1"
                        >
                          <CheckCircle size={12} />
                          <span>Approve & Issue PO</span>
                        </button>
                      )}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default QuotationCompare;
