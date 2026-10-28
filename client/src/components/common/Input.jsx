import React from 'react';

export function Input({
  label,
  error,
  helper,
  icon: Icon,
  className = '',
  id,
  ...props
}) {
  const inputId = id || props.name || Math.random().toString(36).substring(7);

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-slate-300">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-slate-400 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          id={inputId}
          className={`w-full bg-slate-900/80 border text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/50 ${
            Icon ? 'pl-10' : ''
          } ${
            error
              ? 'border-red-500/80 focus:border-red-500'
              : 'border-slate-700/80 hover:border-slate-600 focus:border-brand-500'
          }`}
          {...props}
        />
      </div>

      {error ? (
        <p className="text-xs text-red-400 mt-0.5">{error}</p>
      ) : helper ? (
        <p className="text-xs text-slate-400 mt-0.5">{helper}</p>
      ) : null}
    </div>
  );
}
