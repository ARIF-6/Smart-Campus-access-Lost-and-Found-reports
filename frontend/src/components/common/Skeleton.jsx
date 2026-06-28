import React from 'react';

const Skeleton = ({ className, width, height, circle }) => {
  const styles = {
    width: width || '100%',
    height: height || '20px',
    borderRadius: circle ? '50%' : '8px',
  };

  return (
    <div 
      className={`animate-pulse bg-gray-200 ${className}`} 
      style={styles}
    />
  );
};

export const TableSkeleton = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="w-full">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b border-gray-100 items-center">
          {[...Array(cols)].map((_, j) => (
            <Skeleton key={j} height="20px" className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton = () => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
      <Skeleton height="150px" />
      <Skeleton width="60%" height="24px" />
      <Skeleton width="40%" height="16px" />
      <div className="flex justify-between gap-4">
        <Skeleton width="30%" height="32px" />
        <Skeleton width="30%" height="32px" />
      </div>
    </div>
  );
};

export default Skeleton;
