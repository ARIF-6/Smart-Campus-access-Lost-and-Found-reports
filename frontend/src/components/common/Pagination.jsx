import React from 'react';

const Pagination = ({ page, pages, onPageChange }) => {
  if (pages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-100 gap-4">
      <div className="text-sm text-gray-500 font-medium order-2 sm:order-1">
        Showing page <span className="font-bold text-indigo-600">{page}</span> of <span className="font-bold text-gray-800">{pages}</span>
      </div>
      
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <button 
          onClick={() => onPageChange(Math.max(page - 1, 1))}
          disabled={page === 1}
          className={`p-2 rounded-lg transition-all ${page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100 active:scale-95'}`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        
        {[...Array(pages)].map((_, i) => {
          const p = i + 1;
          if (p === 1 || p === pages || (p >= page - 1 && p <= page + 1)) {
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${page === p ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                {p}
              </button>
            );
          }
          if (p === page - 2 || p === page + 2) {
            return <span key={p} className="px-1 text-gray-300">...</span>;
          }
          return null;
        })}

        <button 
          onClick={() => onPageChange(Math.min(page + 1, pages))}
          disabled={page === pages}
          className={`p-2 rounded-lg transition-all ${page === pages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100 active:scale-95'}`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
};

export default Pagination;
