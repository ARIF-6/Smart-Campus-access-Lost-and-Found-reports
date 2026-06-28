import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full text-center p-8 bg-white rounded-2xl shadow-xl flex flex-col items-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-6 border-4 border-red-50 shadow-inner">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-3xl font-black text-gray-800 mb-2">Access Denied</h1>
        <p className="text-gray-500 font-medium mb-8">
          You are not allowed to access this page. Please contact your administrator if you believe this is an error.
        </p>
        <Link 
          to="/" 
          className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent rounded-xl shadow-sm text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;
