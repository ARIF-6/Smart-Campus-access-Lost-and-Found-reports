import React from 'react';

const StatsCard = ({ title, value, icon, color }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 flex items-center space-x-4 border border-gray-100 transition-transform hover:-translate-y-1">
      <div className={`flex items-center justify-center p-4 rounded-full ${color} text-white`}>
        {icon}
      </div>
      <div>
        <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">{title}</h3>
        <p className="text-3xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
};

export default StatsCard;
