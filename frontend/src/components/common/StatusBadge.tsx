import React from "react";

type StatusType = 
  | "DRAFT" 
  | "SENT" 
  | "CLOSED" 
  | "COMPLETED" 
  | "SUBMITTED" 
  | "UNDER_REVIEW" 
  | "APPROVED" 
  | "REJECTED" 
  | "PENDING" 
  | "PAID" 
  | "OVERDUE" 
  | "CANCELLED";

interface StatusBadgeProps {
  status: StatusType | string;
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT: { bg: "bg-slate-100", text: "text-slate-800", label: "Draft" },
  SENT: { bg: "bg-blue-50", text: "text-blue-700 border border-blue-200", label: "Sent" },
  CLOSED: { bg: "bg-amber-50", text: "text-amber-700 border border-amber-200", label: "Closed" },
  COMPLETED: { bg: "bg-green-50", text: "text-green-700 border border-green-200", label: "Completed" },
  SUBMITTED: { bg: "bg-indigo-50", text: "text-indigo-700 border border-indigo-200", label: "Submitted" },
  UNDER_REVIEW: { bg: "bg-sky-50", text: "text-sky-700 border border-sky-200", label: "Under Review" },
  APPROVED: { bg: "bg-emerald-50", text: "text-emerald-700 border border-emerald-200", label: "Approved" },
  REJECTED: { bg: "bg-rose-50", text: "text-rose-700 border border-rose-200", label: "Rejected" },
  PENDING: { bg: "bg-orange-50", text: "text-orange-700 border border-orange-200", label: "Pending" },
  PAID: { bg: "bg-teal-50", text: "text-teal-700 border border-teal-200", label: "Paid" },
  OVERDUE: { bg: "bg-red-50", text: "text-red-700 border border-red-200", label: "Overdue" },
  CANCELLED: { bg: "bg-stone-100", text: "text-stone-600 border border-stone-200", label: "Cancelled" },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = status ? status.toUpperCase() : "DRAFT";
  const config = statusConfig[normalized] || { bg: "bg-gray-100", text: "text-gray-800", label: status };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide uppercase ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
