import React from "react";
import { User, Bell, Shield } from "lucide-react";

interface HeaderProps {
  title: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    roleName: string;
  } | null;
}

export const Header: React.FC<HeaderProps> = ({ title, user }) => {
  const formatRole = (role: string) => {
    return role.replace("_", " ");
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between select-none shadow-sm z-10">
      {/* Title / Breadcrumbs */}
      <div>
        <h1 className="text-lg font-bold text-slate-800 tracking-wide uppercase">
          {title}
        </h1>
      </div>

      {/* Right Header Info */}
      <div className="flex items-center space-x-6">
        {/* Notification indicator */}
        <button className="text-slate-400 hover:text-slate-600 relative p-1.5 hover:bg-slate-100 rounded-full transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full" />
        </button>

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
