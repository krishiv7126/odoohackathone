import React from "react";
import { useQuery } from "@tanstack/react-query";
import { History, ShieldAlert } from "lucide-react";
import api from "../services/api";
import Table, { TableColumn } from "../components/common/Table";
import { formatDate } from "../utils/formatters";

interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress: string | null;
  details: string | null;
  createdAt: string;
  user: { email: string; firstName: string; lastName: string } | null;
}

export const ActivityLogs: React.FC = () => {
  // Fetch activity logs (Admin only)
  const { data: logs = [], isLoading, error } = useQuery<ActivityLog[]>({
    queryKey: ["activityLogs"],
    queryFn: async () => {
      const res = await api.get("/activity-logs");
      return res.data;
    },
  });

  const columns: TableColumn<ActivityLog>[] = [
    {
      header: "Timestamp",
      accessor: (row) => new Date(row.createdAt).toLocaleString("en-IN"),
      className: "font-semibold text-slate-500 whitespace-nowrap",
    },
    {
      header: "Action / Event",
      accessor: (row) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
          row.action.startsWith("EMAIL") || row.action.startsWith("PDF")
            ? "bg-rose-50 text-rose-700 border border-rose-200"
            : row.action.includes("APPROVED") || row.action.includes("CREATED")
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-slate-100 text-slate-600 border border-slate-200"
        }`}>
          {row.action.replace("_", " ")}
        </span>
      ),
    },
    { header: "Entity", accessor: "entityType", className: "font-semibold text-slate-600 uppercase" },
    { header: "Entity Reference", accessor: "entityId", className: "font-bold text-slate-800" },
    { header: "Event Description", accessor: (row) => row.details || "-", className: "max-w-[300px] truncate" },
    { header: "IP Address", accessor: (row) => row.ipAddress || "-", className: "text-slate-500 font-medium" },
    {
      header: "Triggered By",
      accessor: (row) => row.user ? `${row.user.firstName} (${row.user.email})` : "System",
      className: "text-slate-600 font-semibold",
    },
  ];

  return (
    <div className="space-y-6 select-none p-1">
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-slate-50 text-slate-600 rounded border border-slate-200">
            <History size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">System Audit Trail</h2>
            <p className="text-xs text-slate-500">Security audit records documenting system events and RBAC actions.</p>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded border border-red-200 flex items-center space-x-2">
          <ShieldAlert size={20} />
          <span>Failed to load system activity logs. Access restricted to System Administrators.</span>
        </div>
      ) : (
        <Table columns={columns} data={logs} />
      )}
    </div>
  );
};

export default ActivityLogs;
