import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Building2, User, Mail, Lock, Phone, Globe, FileText, Camera, ShieldAlert, CheckCircle2 } from "lucide-react";
import api from "../services/api";

export const Register: React.FC = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [country, setCountry] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      // Limit to images
      if (!file.type.startsWith("image/")) {
        setError("Only image files are allowed for the profile photo.");
        return;
      }
      setProfilePhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Front-end validations
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    // Phone number simple check
    const phoneRegex = /^[+]?[0-9\s-]{8,20}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setError("Please enter a valid contact phone number.");
      setLoading(false);
      return;
    }

    try {
      // Create FormData payload
      const formData = new FormData();
      formData.append("firstName", firstName);
      formData.append("lastName", lastName);
      formData.append("email", email);
      formData.append("phoneNumber", phoneNumber);
      formData.append("country", country);
      formData.append("additionalInfo", additionalInfo);
      formData.append("password", password);
      
      if (profilePhoto) {
        formData.append("profilePhoto", profilePhoto);
      }

      const response = await api.post("/auth/register-public", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setSuccess(response.data.message || "Registration successful!");
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to register. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 py-12 px-4 select-none">
      <div className="max-w-xl w-full bg-slate-950 p-8 rounded-lg border border-slate-800 shadow-xl space-y-6">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="p-3 bg-primary-500 rounded text-white shadow-md shadow-primary-500/20 animate-pulse">
            <Building2 size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-100 tracking-wider">
            Register as <span className="text-primary-500 font-extrabold">Vendor</span>
          </h2>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">
            Create your supplier profile on VendorBridge ERP
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-950/30 border border-rose-900 rounded text-xs text-rose-300 font-semibold flex items-center space-x-2">
            <ShieldAlert size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="p-3 bg-emerald-950/30 border border-emerald-900 rounded text-xs text-emerald-300 font-semibold flex items-center space-x-2">
            <CheckCircle2 size={16} className="flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Profile Photo Uploader */}
          <div className="flex flex-col items-center space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Profile Photo
            </label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full border-2 border-dashed border-slate-700 bg-slate-900 hover:border-primary-500 hover:bg-slate-900/50 flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group"
            >
              {photoPreview ? (
                <>
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera size={18} className="text-white" />
                  </div>
                </>
              ) : (
                <div className="text-slate-500 flex flex-col items-center space-y-1">
                  <Camera size={20} />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Upload</span>
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                First Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 text-slate-100 rounded text-sm focus:outline-none focus:border-primary-500 placeholder-slate-600 transition-colors"
                  placeholder="Rahul"
                />
              </div>
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Last Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 text-slate-100 rounded text-sm focus:outline-none focus:border-primary-500 placeholder-slate-600 transition-colors"
                  placeholder="Sharma"
                />
              </div>
            </div>
          </div>

          {/* Email Address */}
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
                placeholder="supplier@tatasteel.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Phone size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 text-slate-100 rounded text-sm focus:outline-none focus:border-primary-500 placeholder-slate-600 transition-colors"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            {/* Country */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Country
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Globe size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 text-slate-100 rounded text-sm focus:outline-none focus:border-primary-500 placeholder-slate-600 transition-colors"
                  placeholder="India"
                />
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Additional Information
            </label>
            <div className="relative">
              <span className="absolute top-2.5 left-3 text-slate-500">
                <FileText size={16} />
              </span>
              <textarea
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                rows={2}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 text-slate-100 rounded text-sm focus:outline-none focus:border-primary-500 placeholder-slate-600 transition-colors"
                placeholder="Details about company size, specializations, etc."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Password */}
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

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 text-slate-100 rounded text-sm focus:outline-none focus:border-primary-500 placeholder-slate-600 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded text-sm font-semibold transition-all shadow-md shadow-primary-500/10 hover:shadow-primary-500/20 disabled:opacity-50"
          >
            {loading ? "Registering Supplier..." : "Submit Registration"}
          </button>
        </form>

        {/* Back to Login Link */}
        <div className="text-center pt-2">
          <span className="text-xs text-slate-500">Already have a credentials account? </span>
          <Link to="/login" className="text-xs text-primary-500 font-bold hover:underline">
            Login Securely
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Register;
