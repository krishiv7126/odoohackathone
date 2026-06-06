import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Mail, Lock, ShieldAlert } from "lucide-react";
import api from "../services/api";

export const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/login", { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      
      navigate("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Invalid email or password credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 px-4 select-none">
      <div className="max-w-md w-full bg-slate-950 p-8 rounded-lg border border-slate-800 shadow-xl space-y-6">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="p-3 bg-primary-500 rounded text-white shadow-md shadow-primary-500/20">
            <Building2 size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-100 tracking-wider">
            Vendor<span className="text-primary-500">Bridge</span> ERP
          </h2>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">
            Procurement & Vendor Management Portal
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-950/30 border border-rose-900 rounded text-xs text-rose-300 font-semibold flex items-center space-x-2">
            <ShieldAlert size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Mail size={16} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 text-slate-100 rounded text-sm focus:outline-none focus:border-primary-500 placeholder-slate-600 transition-colors"
                placeholder="officer@vendorbridge.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Lock size={16} />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 text-slate-100 rounded text-sm focus:outline-none focus:border-primary-500 placeholder-slate-600 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded text-sm font-semibold transition-all shadow-md shadow-primary-500/10 hover:shadow-primary-500/20 disabled:opacity-50"
          >
            {loading ? "Authenticating Session..." : "Login Securely"}
          </button>
        </form>

        {/* Demo Accounts Quick Fill */}
        <div className="border-t border-slate-800 pt-4 space-y-2">
          <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
            Demo Sandbox Accounts (Click to Auto-Fill)
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setEmail("admin@vendorbridge.com");
                setPassword("password123");
              }}
              className="p-2 bg-slate-900 border border-slate-800 hover:border-primary-500 text-slate-300 hover:text-white rounded text-[11px] font-semibold transition-all text-left flex flex-col"
            >
              <span className="text-primary-400 font-bold">System Admin</span>
              <span className="text-[9px] text-slate-500 truncate">admin@vendorbridge.com</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("officer@vendorbridge.com");
                setPassword("password123");
              }}
              className="p-2 bg-slate-900 border border-slate-800 hover:border-primary-500 text-slate-300 hover:text-white rounded text-[11px] font-semibold transition-all text-left flex flex-col"
            >
              <span className="text-primary-400 font-bold">Procure Officer</span>
              <span className="text-[9px] text-slate-500 truncate">officer@vendorbridge.com</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("manager@vendorbridge.com");
                setPassword("password123");
              }}
              className="p-2 bg-slate-900 border border-slate-800 hover:border-primary-500 text-slate-300 hover:text-white rounded text-[11px] font-semibold transition-all text-left flex flex-col"
            >
              <span className="text-primary-400 font-bold">Purchasing Manager</span>
              <span className="text-[9px] text-slate-500 truncate">manager@vendorbridge.com</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("vendor1@vendorbridge.com");
                setPassword("password123");
              }}
              className="p-2 bg-slate-900 border border-slate-800 hover:border-primary-500 text-slate-300 hover:text-white rounded text-[11px] font-semibold transition-all text-left flex flex-col"
            >
              <span className="text-primary-400 font-bold">Tata Steel Vendor</span>
              <span className="text-[9px] text-slate-500 truncate">vendor1@vendorbridge.com</span>
            </button>
          </div>
        </div>

        <div className="text-center pt-2">
          <p className="text-[9px] text-slate-500 uppercase tracking-widest leading-relaxed">
            Authorized access only. Audit logging is active.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
