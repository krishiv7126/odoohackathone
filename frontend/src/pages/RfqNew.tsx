import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Trash, ArrowLeft, Save } from "lucide-react";
import api from "../services/api";

interface RfqItemInput {
  productName: string;
  description: string;
  quantity: number;
  uom: string;
  targetPrice: number | "";
}

export const RfqNew: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<RfqItemInput[]>([
    { productName: "", description: "", quantity: 1, uom: "PCS", targetPrice: "" },
  ]);
  const [error, setError] = useState("");

  const handleAddItem = () => {
    setItems([...items, { productName: "", description: "", quantity: 1, uom: "PCS", targetPrice: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof RfqItemInput, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // Create RFQ Mutation
  const createRfqMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/rfqs", payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["rfqs"] });
      navigate(`/rfqs/${data.id}`); // redirect to detail view
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || "Failed to create RFQ");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    const invalidItems = items.some(item => !item.productName || item.quantity <= 0);
    if (invalidItems) {
      setError("Please ensure all line items have a product name and a quantity greater than zero.");
      return;
    }

    createRfqMutation.mutate({
      title,
      description,
      dueDate,
      items: items.map(item => ({
        ...item,
        targetPrice: item.targetPrice === "" ? null : Number(item.targetPrice),
      })),
    });
  };

  return (
    <div className="space-y-6 select-none p-1">
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate("/rfqs")} 
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="p-2 bg-violet-50 text-violet-600 rounded">
            <FileText size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Create Request for Quotation</h2>
            <p className="text-xs text-slate-500">Initialize a new procurement sheet in DRAFT state.</p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Master Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">RFQ Title / Subject</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
              placeholder="e.g. Sourcing structural steel beams for Mumbai project"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Submission Due Date</label>
            <input
              type="datetime-local"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">RFQ Description / Terms</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
              placeholder="Provide context, compliance criteria, delivery details..."
            />
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-t border-slate-100 pt-6">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Line Items Requirements</h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center space-x-1 transition-all"
            >
              <Plus size={14} />
              <span>Add Row</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3 min-w-[200px]">Product / Service Name</th>
                  <th className="px-4 py-3 min-w-[200px]">Technical Specs</th>
                  <th className="px-4 py-3 w-[100px]">Qty Required</th>
                  <th className="px-4 py-3 w-[100px]">UOM</th>
                  <th className="px-4 py-3 w-[130px]">Target Price (INR)</th>
                  <th className="px-4 py-3 w-[60px] text-center">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        required
                        value={item.productName}
                        onChange={(e) => handleItemChange(idx, "productName", e.target.value)}
                        className="w-full border border-slate-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-primary-500"
                        placeholder="e.g. Mild Steel H-Beam"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                        className="w-full border border-slate-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-primary-500"
                        placeholder="Grade IS2062, Size 150x150"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        required
                        min="1"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                        className="w-full border border-slate-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-primary-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        required
                        value={item.uom}
                        onChange={(e) => handleItemChange(idx, "uom", e.target.value)}
                        className="w-full border border-slate-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-primary-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        value={item.targetPrice}
                        onChange={(e) => handleItemChange(idx, "targetPrice", e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full border border-slate-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-primary-500"
                        placeholder="e.g. 3500"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length === 1}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded transition-colors disabled:opacity-30"
                      >
                        <Trash size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="border-t border-slate-100 pt-6 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={() => navigate("/rfqs")}
            className="px-4 py-2 border border-slate-200 rounded text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createRfqMutation.isPending}
            className="px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded text-sm font-semibold flex items-center space-x-1.5 shadow shadow-primary-500/10"
          >
            <Save size={16} />
            <span>{createRfqMutation.isPending ? "Saving..." : "Save Draft"}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default RfqNew;
