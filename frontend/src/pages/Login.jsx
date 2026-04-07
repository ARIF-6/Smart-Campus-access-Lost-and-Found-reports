import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { login } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login: setAuth } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsLoading(true);

    try {
      const data = await login(email, password);
      
      // Send backend user profile directly to Auth context
      setAuth(data, data.token);

      const role = data.role;
      if (role === 'admin') navigate('/admin/dashboard');
      else if (role === 'student') navigate('/student/dashboard');
      else if (role === 'security') navigate('/security/dashboard');
      else if (role === 'cleaner') navigate('/cleaner/dashboard');
      else navigate('/');
      
    } catch (err) {
      if (err.response && err.response.data && err.response.data.errors) {
        const mappedErrors = {};
        err.response.data.errors.forEach(e => {
          mappedErrors[e.path || e.param] = e.msg;
        });
        setFieldErrors(mappedErrors);
        setError("Invalid login details.");
      } else {
        setError(
          err.response && err.response.data && err.response.data.message
            ? err.response.data.message
            : 'Failed to connect to server. Please try again later.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isInvalid = !email || !password;

  return (
    <AuthLayout>
      <form onSubmit={handleLogin} className="space-y-5">
        
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-center">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
             </svg>
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="email">
            University Email
          </label>
          <input
            id="email"
            type="email"
            required
            className={`appearance-none block w-full px-4 py-3 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors sm:text-sm ${fieldErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
            placeholder="student@smartcampus.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors({...fieldErrors, email: ''});
            }}
          />
          {fieldErrors.email && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.email}</p>}
        </div>

        <div>
           <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            className={`appearance-none block w-full px-4 py-3 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors sm:text-sm ${fieldErrors.password ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors({...fieldErrors, password: ''});
            }}
          />
          {fieldErrors.password && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.password}</p>}
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center">
            <input
              id="remember_device"
              name="remember_device"
              type="checkbox"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
            />
            <label htmlFor="remember_device" className="ml-2 block text-sm text-gray-600 cursor-pointer">
              Remember this device
            </label>
          </div>

          <div className="text-sm">
            <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
              Forgot Password?
            </a>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading || isInvalid}
            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors ${(isLoading || isInvalid) ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </div>
        
        <div className="relative mt-6 mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500 font-medium">Or log in with</span>
          </div>
        </div>

        <div>
          <button
            type="button"
            className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            University SSO
          </button>
        </div>

        <div className="text-center mt-6 text-sm">
          <span className="text-gray-600">Don't have an account? </span>
          <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Register Here
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Login;
