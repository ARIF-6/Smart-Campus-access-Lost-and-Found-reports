import React from 'react';

const Filter = ({ label, value, options, onChange }) => {
  return (
    <div className="flex flex-col space-y-2 min-w-[150px]">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full p-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
      >
        <option value="">All {label}s</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Filter;
