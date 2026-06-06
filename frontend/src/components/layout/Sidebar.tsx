import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  CheckSquare, 
  ShoppingCart, 
  Receipt, 
  BarChart3, 
  History, 
  LogOut,
  Building2
} from "lucide-react";
import api from "../../services/api";

interface SidebarProps {
  role: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout logger call failed:", err);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login");
    }
  };

  const navItems = [
    {
      to: "/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard size={18} />,
      roles: ["ADMIN", "PROCUREMENT_OFFICER", "MANAGER", "VENDOR"],
    },
    {
      to: "/vendors",
      label: "Vendor Directory",
      icon: <Users size={18} />,
      roles: ["ADMIN", "PROCUREMENT_OFFICER", "MANAGER"],
    },
    {
      to: "/rfqs",
      label: "RFQ Sheets",
      icon: <FileText size={18} />,
      roles: ["ADMIN", "PROCUREMENT_OFFICER", "MANAGER", "VENDOR"],
    },
    {
      to: "/approvals",
      label: "Approvals Queue",
      icon: <CheckSquare size={18} />,
      roles: ["ADMIN", "MANAGER"],
    },
    {
      to: "/purchase-orders",
      label: "Purchase Orders",
      icon: <ShoppingCart size={18} />,
      roles: ["ADMIN", "PROCUREMENT_OFFICER", "MANAGER", "VENDOR"],
    },
    {
      to: "/invoices",
      label: "Invoices & Billing",
      icon: <Receipt size={18} />,
      roles: ["ADMIN", "PROCUREMENT_OFFICER", "MANAGER", "VENDOR"],
    },
    {
      to: "/reports",
      label: "Reports & Stats",
      icon: <BarChart3 size={18} />,
      roles: ["ADMIN", "PROCUREMENT_OFFICER", "MANAGER"],
    },
    {
      to: "/activity-logs",
      label: "System Audit Logs",
      icon: <History size={18} />,
      roles: ["ADMIN"],
    },
  ];

  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen select-none border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 space-x-3 bg-slate-950">
        <div className="p-1.5 bg-primary-500 rounded text-white">
          <Building2 size={20} />
        </div>
        <span className="text-lg font-bold tracking-wider text-slate-100">
          Vendor<span className="text-primary-500">Bridge</span>
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {filteredItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2.5 rounded text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary-500 text-white shadow-md shadow-primary-500/10 font-semibold"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer Profile & Logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded text-sm font-medium text-slate-400 hover:bg-rose-950 hover:text-rose-200 transition-colors"
        >
          <LogOut size={18} />
          <span>Logout Session</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
