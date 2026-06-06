import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  FileText, 
  ArrowLeft, 
  UserCheck, 
  Send, 
  Paperclip, 
  Upload, 
  Calendar, 
  LayoutGrid, 
  Gavel, 
  X,
  FileCheck
} from "lucide-react";
import api from "../services/api";
import StatusBadge from "../components/common/StatusBadge";
import { formatDate, formatCurrency } from "../utils/formatters";
import ProcurementTimeline from "../components/workflow/ProcurementTimeline";

interface RfqDetailData {
  id: string;
  rfqNumber: string;
  title: string;
  description: string | null;
  dueDate: string;
  status: string;
  createdAt: string;
  rfqItems: any[];
  rfqAttachments: any[];
  rfqVendors: any[];
  creator: { firstName: string; lastName: string };
  quotations: {
    id: string;
    status: string;
    purchaseOrders: {
      id: string;
      status: string;
      invoices: {
        id: string;
        status: string;
      }[];
    }[];
  }[];
}

export const RfqDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isOfficer = currentUser.roleName === "PROCUREMENT_OFFICER";
  const isVendor = currentUser.roleName === "VENDOR";

  // Fetch RFQ Details
  const { data: rfq, isLoading, error } = useQuery<RfqDetailData>({
    queryKey: ["rfqDetails", id],
    queryFn: async () => {
      const res = await api.get(`/rfqs/${id}`);
      return res.data;
    },
  });

  // Fetch All Vendors for Assignment Modal
  const { data: allVendors = [] } = useQuery<any[]>({
    queryKey: ["vendorsForAssignment"],
    queryFn: async () => {
      const res = await api.get("/vendors");
      return res.data.filter((v: any) => v.status === "APPROVED");
    },
    enabled: isOfficer && isAssignModalOpen,
  });

  // Fetch Submitted Quotations for this RFQ (Compare List)
  const { data: compareData } = useQuery<{ quotations: any[] }>({
    queryKey: ["rfqCompareQuotations", id],
    queryFn: async () => {
      const res = await api.get(`/quotations/compare/${id}`);
      return res.data;
    },
    enabled: !isVendor && rfq?.status !== "DRAFT",
  });

  // Assign Vendors Mutation
  const assignVendorsMutation = useMutation({
    mutationFn: async (vendorIds: string[]) => {
      return api.post(`/rfqs/${id}/assign`, { vendorIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfqDetails", id] });
      setIsAssignModalOpen(false);
    },
  });

  // Publish/Send RFQ Mutation
  const sendRfqMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/rfqs/${id}/send`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfqDetails", id] });
    },
  });

  // Attachment upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    setUploadError("");

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.post(`/rfqs/${id}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      queryClient.invalidateQueries({ queryKey: ["rfqDetails", id] });
    } catch (err: any) {
      console.error(err);
      setUploadError(err.response?.data?.message || "File upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleOpenAssignModal = () => {
    if (rfq) {
      setSelectedVendorIds(rfq.rfqVendors.map((rv) => rv.vendorId));
    }
    setIsAssignModalOpen(true);
  };

  const handleToggleVendor = (vId: string) => {
    if (selectedVendorIds.includes(vId)) {
      setSelectedVendorIds(selectedVendorIds.filter((id) => id !== vId));
    } else {
      setSelectedVendorIds([...selectedVendorIds, vId]);
    }
  };

  const handleSaveAssignments = () => {
    assignVendorsMutation.mutate(selectedVendorIds);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (error || !rfq) {
    return (
      <div className="p-6 text-center text-red-500 bg-red-50 border border-red-200 rounded-lg">
        Failed to fetch RFQ details or you are not authorized to view this request.
      </div>
    );
  }

  const vendorHasQuoted = rfq.rfqVendors.find(rv => rv.vendorId === currentUser.vendorId)?.status === "SUBMITTED";

  const hasQuotes = rfq.quotations && rfq.quotations.length > 0;
  const hasApproval = rfq.quotations && rfq.quotations.some((q: any) => q.status === "APPROVED");
  const hasPO = rfq.quotations && rfq.quotations.some((q: any) => q.purchaseOrders && q.purchaseOrders.length > 0);
  const hasInvoice = rfq.quotations && rfq.quotations.some((q: any) => q.purchaseOrders && q.purchaseOrders.some((po: any) => po.invoices && po.invoices.length > 0));

  const workflowSteps = [
    { label: "RFQ Created", completed: true },
    { label: "Quotation Received", completed: hasQuotes },
    { label: "Manager Approval", completed: hasApproval || hasPO },
    { label: "PO Generated", completed: hasPO },
    { label: "Invoice Generated", completed: hasInvoice },
  ];

  return (
    <div className="space-y-6 select-none p-1">
      {/* Header and Workflow Progress */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
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
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-800">{rfq.rfqNumber}</h2>
                <StatusBadge status={rfq.status} />
              </div>
              <p className="text-sm font-semibold text-slate-700 mt-0.5">{rfq.title}</p>
            </div>
          </div>

          {/* Visual Workflow Progress Tracker */}
          <div className="flex items-center space-x-1 sm:space-x-2 text-xs font-semibold select-none flex-wrap gap-y-2">
            {workflowSteps.map((step, idx) => {
              const isActive = step.completed && (idx === workflowSteps.length - 1 || !workflowSteps[idx + 1].completed);
              return (
                <React.Fragment key={step.label}>
                  {idx > 0 && (
                    <div 
                      className={`h-[2px] w-3 sm:w-6 transition-colors duration-300 ${
                        step.completed ? "bg-emerald-500" : "bg-slate-200"
                      }`} 
                    />
                  )}
                  <span
                    className={`px-2.5 py-1 rounded-full border text-[10px] sm:text-xs transition-all duration-300 flex items-center space-x-1 ${
                      isActive
                        ? "bg-primary-500 text-white border-primary-600 shadow-sm font-bold scale-105"
                        : step.completed
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : "bg-slate-50 text-slate-400 border-slate-200"
                    }`}
                  >
                    {step.completed && !isActive && <span className="w-1 h-1 rounded-full bg-emerald-500 flex-shrink-0" />}
                    <span>{step.label}</span>
                  </span>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Action Controls for Officers */}
        {isOfficer && rfq.status === "DRAFT" && (
          <div className="border-t border-slate-100 pt-4 flex items-center justify-end space-x-2">
            <button
              onClick={handleOpenAssignModal}
              disabled={assignVendorsMutation.isPending}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded text-sm font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <UserCheck size={16} />
              <span>Assign Suppliers ({rfq.rfqVendors.length})</span>
            </button>
            <button
              onClick={() => sendRfqMutation.mutate()}
              disabled={sendRfqMutation.isPending || rfq.rfqVendors.length === 0}
              className="px-5 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded text-sm font-semibold flex items-center space-x-1.5 transition-all shadow shadow-primary-500/10"
            >
              <Send size={14} />
              <span>Publish & Broadcast</span>
            </button>
          </div>
        )}

        {/* Action Controls for Vendors */}
        {isVendor && rfq.status === "SENT" && (
          <div className="border-t border-slate-100 pt-4 flex items-center justify-end">
            {vendorHasQuoted ? (
              <div className="text-sm font-semibold text-emerald-600 flex items-center space-x-1">
                <FileCheck size={16} />
                <span>Quotation Quote Submitted</span>
              </div>
            ) : (
              <Link
                to={`/quotations/submit/${rfq.id}`}
                className="px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded text-sm font-semibold flex items-center space-x-1.5 shadow shadow-primary-500/10"
              >
                <Gavel size={16} />
                <span>Submit Quotation Bid</span>
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Master details & items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Card */}
          <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm space-y-4 text-sm">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">Procurement Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Created By</span>
                <span className="text-slate-700 font-medium">{rfq.creator.firstName} {rfq.creator.lastName}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar size={16} className="text-slate-400" />
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Due Date</span>
                  <span className="text-slate-700 font-medium">{formatDate(rfq.dueDate)}</span>
                </div>
              </div>
              <div className="col-span-2">
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">RFQ Scope / Description</span>
                <p className="text-slate-600 leading-relaxed font-medium bg-slate-50 p-3 rounded border border-slate-100">
                  {rfq.description || "No description provided."}
                </p>
              </div>
            </div>
          </div>

          {/* Line Items Card */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Line Item Requirements</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-100">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Product Name</th>
                    <th className="px-6 py-3">Technical Specifications</th>
                    <th className="px-6 py-3 text-center">Qty Required</th>
                    <th className="px-6 py-3">UOM</th>
                    {!isVendor && <th className="px-6 py-3 text-right">Target Price</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {rfq.rfqItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-3.5 font-bold text-slate-800">{item.productName}</td>
                      <td className="px-6 py-3.5 text-slate-600">{item.description || "-"}</td>
                      <td className="px-6 py-3.5 text-center text-slate-700 font-semibold">{item.quantity}</td>
                      <td className="px-6 py-3.5 text-slate-600 uppercase font-medium">{item.uom}</td>
                      {!isVendor && (
                        <td className="px-6 py-3.5 text-right text-slate-700 font-semibold">
                          {item.targetPrice ? formatCurrency(item.targetPrice) : "Not Set"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Compare Quotations (Admin/Officer/Manager only) */}
          {!isVendor && rfq.status !== "DRAFT" && compareData && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Received Quotation Bids ({compareData.quotations.length})</h3>
                {compareData.quotations.length > 0 && (
                  <button
                    onClick={() => navigate(`/quotations/compare/${rfq.id}`)}
                    className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white rounded text-xs font-semibold flex items-center space-x-1 transition-all"
                  >
                    <LayoutGrid size={12} />
                    <span>Compare Matrix</span>
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs divide-y divide-slate-100">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Quotation Number</th>
                      <th className="px-6 py-3">Supplier Name</th>
                      <th className="px-6 py-3 text-right">Grand Total (INR)</th>
                      <th className="px-6 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {compareData.quotations.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-slate-400">No quotation bids submitted yet.</td>
                      </tr>
                    ) : (
                      compareData.quotations.map((quote) => (
                        <tr key={quote.id}>
                          <td className="px-6 py-3.5 font-bold text-slate-800">{quote.quotationNumber}</td>
                          <td className="px-6 py-3.5 text-slate-600">{quote.vendor.name}</td>
                          <td className="px-6 py-3.5 text-right text-slate-700 font-semibold">{formatCurrency(quote.grandTotal)}</td>
                          <td className="px-6 py-3.5 text-center"><StatusBadge status={quote.status} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Attachments & Vendor Assignments */}
        <div className="space-y-6">
          {/* Attachments Card */}
          <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center space-x-1.5">
              <Paperclip size={14} />
              <span>RFQ Attachments</span>
            </h3>

            {/* List */}
            {rfq.rfqAttachments.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium">No specification files attached.</p>
            ) : (
              <div className="space-y-2">
                {rfq.rfqAttachments.map((att) => (
                  <a
                    key={att.id}
                    href={`http://localhost:5001${att.filePath}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors text-xs text-slate-700 font-semibold"
                  >
                    <span className="truncate max-w-[150px]">{att.fileName}</span>
                    <span className="text-[10px] text-primary-500 font-bold uppercase hover:underline">Download</span>
                  </a>
                ))}
              </div>
            )}

            {/* Upload form for Officers */}
            {isOfficer && (
              <div className="pt-2 border-t border-slate-100">
                {uploadError && <p className="text-[10px] text-rose-500 font-bold mb-2">{uploadError}</p>}
                <label className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 border border-slate-300 border-dashed rounded text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                  <Upload size={14} />
                  <span>{uploading ? "Uploading Spec..." : "Upload Spec Sheet"}</span>
                  <input type="file" onChange={handleFileUpload} disabled={uploading} className="hidden" />
                </label>
              </div>
            )}
          </div>

          {/* Assigned Vendors List (Officers/Managers) */}
          {!isVendor && (
            <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">Assigned Suppliers ({rfq.rfqVendors.length})</h3>

              {rfq.rfqVendors.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium">No suppliers assigned yet.</p>
              ) : (
                <div className="space-y-3">
                  {rfq.rfqVendors.map((rv) => (
                    <div key={rv.id} className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
                      <div>
                        <span className="font-semibold text-slate-700 block">{rv.vendor.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{rv.vendor.contactEmail}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        rv.status === "SUBMITTED" 
                          ? "bg-green-50 text-green-700 border border-green-200" 
                          : rv.status === "VIEWED" 
                            ? "bg-blue-50 text-blue-700 border border-blue-200" 
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}>
                        {rv.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Procurement Timeline Widget */}
          <ProcurementTimeline rfqId={rfq.id} />
        </div>
      </div>

      {/* ASSIGN SUPPLIERS MODAL */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Select Suppliers for RFQ</h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {allVendors.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No approved vendors found in directory.</p>
              ) : (
                allVendors.map((vendor) => {
                  const isChecked = selectedVendorIds.includes(vendor.id);
                  return (
                    <label 
                      key={vendor.id}
                      className={`flex items-center space-x-3 p-3 rounded border hover:bg-slate-50 cursor-pointer transition-colors ${
                        isChecked ? "border-primary-200 bg-primary-50/20" : "border-slate-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleVendor(vendor.id)}
                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div>
                        <span className="font-bold text-slate-800 text-xs block">{vendor.name}</span>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">{vendor.taxId}</span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-100 p-6 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAssignments}
                disabled={assignVendorsMutation.isPending}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded text-sm font-semibold"
              >
                Save Assignments
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RfqDetail;
