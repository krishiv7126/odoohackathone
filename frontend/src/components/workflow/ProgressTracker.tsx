import React from "react";

interface ProgressTrackerProps {
  steps: string[];
  currentStep: string;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({ steps, currentStep }) => {
  const currentIndex = steps.findIndex(
    (step) => step.toUpperCase() === currentStep.toUpperCase()
  );

  return (
    <div className="flex items-center space-x-1 sm:space-x-2 text-xs font-semibold select-none">
      {steps.map((step, idx) => {
        const isCompleted = idx < currentIndex;
        const isActive = idx === currentIndex;
        return (
          <React.Fragment key={step}>
            {idx > 0 && (
              <div 
                className={`h-[2px] w-4 sm:w-8 transition-colors duration-300 ${
                  idx <= currentIndex ? "bg-emerald-500" : "bg-slate-200"
                }`} 
              />
            )}
            <span
              className={`px-3 py-1 rounded-full border text-[10px] sm:text-xs transition-all duration-300 ${
                isActive
                  ? "bg-primary-500 text-white border-primary-600 shadow-sm font-bold scale-105"
                  : isCompleted
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                  : "bg-slate-50 text-slate-400 border-slate-200"
              }`}
            >
              {step}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default ProgressTracker;
