import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

export const Unauthorized: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] bg-slate-50 px-4 select-none">
      <div className="p-4 bg-red-50 rounded-full text-red-600 mb-4 border border-red-100">
        <ShieldAlert size={40} />
      </div>
      <h1 className="text-xl font-bold text-slate-800 mb-1">Access Restrained</h1>
      <p className="text-slate-500 mb-6 text-center max-w-sm text-sm">
        You do not possess the necessary role privileges to view or interact with this procurement module.
      </p>
      <Link 
        to="/dashboard" 
        className="px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded text-sm font-semibold transition-all shadow shadow-primary-500/10"
      >
        Return to Dashboard
      </Link>
    </div>
  );
};

export default Unauthorized;
