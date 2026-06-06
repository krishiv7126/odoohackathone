import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, ShieldCheck, ShieldAlert, X, Eye } from "lucide-react";
import api from "../services/api";
import Table, { TableColumn } from "../components/common/Table";
import StatusBadge from "../components/common/StatusBadge";

interface Vendor {
  id: string;
  name: string;
  companyRegNo: string;
  taxId: string;
  address: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  status: string;
  user: { email: string } | null;
  createdAt: string;
}

export const VendorList: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [companyRegNo, setCompanyRegNo] = useState("");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const canModify = currentUser.roleName === "ADMIN" || currentUser.roleName === "PROCUREMENT_OFFICER";
  const canApprove = currentUser.roleName === "ADMIN" || currentUser.roleName === "MANAGER";

  // Fetch Vendors
  const { data: vendors = [], isLoading, error } = useQuery<Vendor[]>({
    queryKey: ["vendors"],
    queryFn: async () => {
      const res = await api.get("/vendors");
      return res.data;
    },
  });

  // Create Vendor Mutation
  const createVendorMutation = useMutation({
    mutationFn: async (newVendor: any) => {
      return api.post("/vendors", newVendor);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setFormSuccess("Vendor profile successfully created.");
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || "Failed to create vendor profile");
    },
  });

  // Approve/Reject Vendor Mutation
  const approveVendorMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return api.patch(`/vendors/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setSelectedVendor(null);
    },
  });

  const resetForm = () => {
    setName("");
    setCompanyRegNo("");
    setTaxId("");
    setAddress("");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setFormError("");
  };

  const handleCreateVendor = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    createVendorMutation.mutate({
      name,
      companyRegNo,
      taxId,
      address,
      contactName,
      contactEmail,
      contactPhone,
    });
  };

  const columns: TableColumn<Vendor>[] = [
    { header: "Vendor Name", accessor: "name", className: "font-bold text-slate-800" },
    { header: "Reg No", accessor: "companyRegNo" },
    { header: "GSTIN / Tax ID", accessor: "taxId" },
    { header: "Contact Person", accessor: "contactName" },
    { header: "Contact Email", accessor: "contactEmail" },
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
            setSelectedVendor(row);
          }}
          className="p-1 text-slate-500 hover:text-primary-500 hover:bg-slate-100 rounded transition-colors"
        >
          <Eye size={16} />
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
          <div className="p-2 bg-blue-50 text-blue-600 rounded">
            <Users size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Vendor Directory</h2>
            <p className="text-xs text-slate-500">View corporate details, GSTINs, and manage supplier profiles.</p>
          </div>
        </div>
        {canModify && (
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded text-sm font-semibold transition-all flex items-center space-x-1 shadow shadow-primary-500/10"
          >
            <Plus size={16} />
            <span>Add Supplier</span>
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
          Failed to load vendor directory.
        </div>
      ) : (
        <Table columns={columns} data={vendors} onRowClick={(row) => setSelectedVendor(row)} />
      )}

      {/* ADD VENDOR MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Create Vendor Profile</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="flex-1 overflow-y-auto p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Company / Vendor Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-primary-500"
                    placeholder="e.g. Tata Steel Ltd"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Registration No</label>
                  <input
                    type="text"
                    required
                    value={companyRegNo}
                    onChange={(e) => setCompanyRegNo(e.target.value)}
                    className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-primary-500"
                    placeholder="e.g. REG883772"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">GSTIN / Tax ID</label>
                  <input
                    type="text"
                    required
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-primary-500"
                    placeholder="e.g. 27AAAAT1234F1Z1"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Corporate Address</label>
                  <textarea
                    required
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-primary-500"
                    placeholder="Head office address details..."
                  />
                </div>
                <div className="col-span-2 border-t border-slate-100 my-2 pt-2">
                  <span className="text-xs font-bold text-primary-500 uppercase tracking-wider">Contact Person Details</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Contact Name</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-primary-500"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-primary-500"
                    placeholder="+91-9988776655"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-primary-500"
                    placeholder="billing@company.com"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createVendorMutation.isPending}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded text-sm font-semibold"
                >
                  {createVendorMutation.isPending ? "Creating..." : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL WITH APPROVAL CONTROLS */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Supplier Profile Card</h3>
              <button onClick={() => setSelectedVendor(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-slate-800">{selectedVendor.name}</h4>
                  <span className="text-xs text-slate-400 font-semibold">Registered: {new Date(selectedVendor.createdAt).toLocaleDateString()}</span>
                </div>
                <StatusBadge status={selectedVendor.status} />
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm border-t border-slate-100 pt-4">
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Reg Code</span>
                  <span className="text-slate-700 font-medium">{selectedVendor.companyRegNo}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">GSTIN / Tax ID</span>
                  <span className="text-slate-700 font-medium">{selectedVendor.taxId}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Address</span>
                  <span className="text-slate-700 font-medium">{selectedVendor.address}</span>
                </div>
                <div className="col-span-2 border-t border-slate-100 pt-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Primary Contact</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Representative</span>
                  <span className="text-slate-700 font-medium">{selectedVendor.contactName}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Phone</span>
                  <span className="text-slate-700 font-medium">{selectedVendor.contactPhone}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</span>
                  <span className="text-slate-700 font-medium">{selectedVendor.contactEmail}</span>
                </div>
              </div>

              {/* Approval controls */}
              {canApprove && selectedVendor.status === "PENDING" && (
                <div className="border-t border-slate-100 pt-6 flex items-center justify-end space-x-2">
                  <button
                    onClick={() => approveVendorMutation.mutate({ id: selectedVendor.id, status: "REJECTED" })}
                    className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded text-sm font-semibold flex items-center space-x-1 transition-all"
                  >
                    <ShieldAlert size={16} />
                    <span>Reject Supplier</span>
                  </button>
                  <button
                    onClick={() => approveVendorMutation.mutate({ id: selectedVendor.id, status: "APPROVED" })}
                    className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded text-sm font-semibold flex items-center space-x-1 transition-all"
                  >
                    <ShieldCheck size={16} />
                    <span>Approve Supplier</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorList;
