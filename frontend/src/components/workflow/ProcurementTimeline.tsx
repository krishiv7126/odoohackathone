import React from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Users, Mail, CheckCircle, Receipt, AlertCircle, ShoppingCart, Clock } from "lucide-react";
import api from "../../services/api";
import { formatDate } from "../../utils/formatters";

interface TimelineLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string | null;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: { name: string };
  } | null;
}

interface ProcurementTimelineProps {
  rfqId?: string;
  quotationId?: string;
  poId?: string;
  invoiceId?: string;
}

export const ProcurementTimeline: React.FC<ProcurementTimelineProps> = ({
  rfqId,
  quotationId,
  poId,
  invoiceId,
}) => {
  const { data: logs = [], isLoading, error } = useQuery<TimelineLog[]>({
    queryKey: ["procurementTimeline", { rfqId, quotationId, poId, invoiceId }],
    queryFn: async () => {
      const res = await api.get("/activity-logs/timeline", {
        params: { rfqId, quotationId, poId, invoiceId },
      });
      return res.data;
    },
    enabled: !!(rfqId || quotationId || poId || invoiceId),
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case "RFQ_CREATED":
        return <FileText size={16} className="text-violet-600" />;
      case "RFQ_VENDORS_ASSIGNED":
        return <Users size={16} className="text-blue-600" />;
      case "RFQ_SENT":
        return <Mail size={16} className="text-indigo-600" />;
      case "QUOTATION_SUBMITTED":
        return <FileText size={16} className="text-amber-600" />;
      case "QUOTATION_APPROVED":
        return <CheckCircle size={16} className="text-emerald-600" />;
      case "PO_GENERATED":
      case "PO_DISPATCHED":
        return <ShoppingCart size={16} className="text-sky-600" />;
      case "INVOICE_GENERATED":
      case "INVOICE_SENT":
        return <Receipt size={16} className="text-teal-600" />;
      default:
        return <AlertCircle size={16} className="text-slate-600" />;
    }
  };

  const getActionBg = (action: string) => {
    switch (action) {
      case "RFQ_CREATED":
        return "bg-violet-50 border-violet-200";
      case "RFQ_VENDORS_ASSIGNED":
        return "bg-blue-50 border-blue-200";
      case "RFQ_SENT":
        return "bg-indigo-50 border-indigo-200";
      case "QUOTATION_SUBMITTED":
        return "bg-amber-50 border-amber-200";
      case "QUOTATION_APPROVED":
        return "bg-emerald-50 border-emerald-200";
      case "PO_GENERATED":
      case "PO_DISPATCHED":
        return "bg-sky-50 border-sky-200";
      case "INVOICE_GENERATED":
      case "INVOICE_SENT":
        return "bg-teal-50 border-teal-200";
      default:
        return "bg-slate-50 border-slate-200";
    }
  };

  const formatRole = (role: string) => {
    return role.replace("_", " ").toLowerCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (error || logs.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400 text-xs font-semibold">
        No timeline log activities recorded.
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4 select-none">
      <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
        <Clock size={18} className="text-slate-500" />
        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Procurement Activity History</h3>
      </div>

      <div className="relative border-l border-slate-200 ml-4 pl-6 space-y-6">
        {logs.map((log) => (
          <div key={log.id} className="relative group">
            {/* Timeline Circle */}
            <div
              className={`absolute -left-[35px] top-0.5 p-1.5 rounded-full border bg-white flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm ${getActionBg(
                log.action
              )}`}
            >
              {getActionIcon(log.action)}
            </div>

            {/* Timeline content */}
            <div className="space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs gap-1">
                <span className="font-extrabold text-slate-800 tracking-wide uppercase">
                  {log.action.replace("_", " ")}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {formatDate(log.createdAt)} {new Date(log.createdAt).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-normal">{log.details}</p>
              {log.user && (
                <div className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider flex items-center space-x-1">
                  <span>By:</span>
                  <span className="text-slate-500 font-bold">{log.user.firstName} {log.user.lastName}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-primary-500 font-bold">{formatRole(log.user.role.name)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProcurementTimeline;
