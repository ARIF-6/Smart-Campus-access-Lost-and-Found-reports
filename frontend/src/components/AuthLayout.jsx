import React from 'react';

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Background patterns could be added here for a modern campus look */}
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden py-8 px-6 sm:px-10">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center mb-4 shadow-lg">
            {/* University SVG icon or initial */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Smart Campus</h2>
          <p className="text-sm text-gray-500 mt-2 font-medium">Institutional Login</p>
        </div>
        
        {children}

        <div className="mt-8 pt-6 border-t border-gray-100">
          <div className="flex justify-center space-x-6 text-xs text-gray-500">
            <a href="#" className="hover:text-indigo-600 transition-colors">Help Desk</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Terms of Use</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
