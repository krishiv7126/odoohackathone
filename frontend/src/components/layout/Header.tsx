import React, { useState, useEffect, useRef } from "react";
import { User, Bell, Shield, CheckCheck, Info, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";

interface HeaderProps {
  title: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    roleName: string;
  } | null;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  type: string;
  createdAt: string;
}

export const Header: React.FC<HeaderProps> = ({ title, user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const formatRole = (role: string) => {
    return role.replace("_", " ");
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Notifications
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get("/notifications");
      return res.data;
    },
    enabled: !!user,
    refetchInterval: 15000, // Refresh every 15s
  });

  // Mark single notification as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Mark all notifications as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return api.post("/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between select-none shadow-sm z-20">
      {/* Title / Breadcrumbs */}
      <div>
        <h1 className="text-lg font-bold text-slate-800 tracking-wide uppercase">
          {title}
        </h1>
      </div>

      {/* Right Header Info */}
      <div className="flex items-center space-x-6">
        {/* Notification bell and dropdown */}
        {user && (
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-400 hover:text-slate-600 relative p-1.5 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center focus:outline-none"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 px-1.5 py-0.5 min-w-[16px] h-[16px] text-[9px] font-extrabold text-white bg-primary-500 rounded-full flex items-center justify-center border border-white leading-none scale-90">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {isOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-50 flex flex-col max-h-[400px]">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">Inbox Notifications ({unreadCount} Unread)</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllReadMutation.mutate()}
                      className="text-primary-500 hover:text-primary-600 font-bold uppercase hover:underline flex items-center space-x-1"
                    >
                      <CheckCheck size={12} />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[300px]">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs font-semibold">
                      No active notifications.
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      const typeColors = notif.type === "SUCCESS"
                        ? "text-emerald-500 bg-emerald-50"
                        : notif.type === "WARNING"
                        ? "text-amber-500 bg-amber-50"
                        : "text-blue-500 bg-blue-50";

                      const typeIcon = notif.type === "SUCCESS"
                        ? <CheckCircle2 size={14} />
                        : notif.type === "WARNING"
                        ? <AlertTriangle size={14} />
                        : <Info size={14} />;

                      return (
                        <div 
                          key={notif.id}
                          className={`p-3 text-xs flex items-start space-x-3 transition-colors ${
                            notif.isRead ? "bg-white text-slate-600" : "bg-slate-50/50 text-slate-800 font-semibold border-l-2 border-primary-500 pl-2.5"
                          }`}
                        >
                          <div className={`p-1.5 rounded flex-shrink-0 ${typeColors}`}>
                            {typeIcon}
                          </div>
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold truncate pr-2">{notif.title}</span>
                              <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">
                                {new Date(notif.createdAt).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-normal line-clamp-2">{notif.message}</p>
                          </div>
                          {!notif.isRead && (
                            <button
                              onClick={() => markReadMutation.mutate(notif.id)}
                              title="Mark as Read"
                              className="p-0.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded transition-colors flex-shrink-0"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Card */}
        {user && (
          <div className="flex items-center space-x-3 border-l border-slate-200 pl-6">
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-800">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-xs font-semibold text-primary-500 flex items-center justify-end space-x-1 uppercase tracking-wider">
                <Shield size={10} />
                <span>{formatRole(user.roleName)}</span>
              </div>
            </div>
            <div className="w-9 h-9 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center text-slate-600">
              <User size={18} />
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
