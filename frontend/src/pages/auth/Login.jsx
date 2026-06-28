import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import { login } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

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
      setAuth(data.user, data.token);

      const role = data.user.role;
      if (role === 'admin') navigate('/admin/dashboard');
      else if (role === 'staff') navigate('/staff/dashboard');
      else if (role === 'student') navigate('/student/dashboard');
      else if (role === 'security') navigate('/security/dashboard');
      else if (role === 'clean') navigate('/cleaner/dashboard');
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
        const message = err.response && err.response.data && err.response.data.message
          ? err.response.data.message
          : 'Failed to connect to server. Please try again later.';

        setError(message);

        // Map specific messages to fields
        if (message.toLowerCase().includes('email')) {
          setFieldErrors({ email: message });
        } else if (message.toLowerCase().includes('password')) {
          setFieldErrors({ password: message });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isInvalid = !email || !password;

  return (
    <AuthLayout title="Smart Campus" subtitle="Sign in to your account" compact>
      <form onSubmit={handleLogin} className="space-y-4">

        {error && (
          <div className="bg-red-50 text-red-600 text-xs p-2 rounded-lg border border-red-100 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="email">
            Username / Student ID
          </label>
          <input
            id="email"
            type="text"
            required
            className={`appearance-none block w-full px-3 py-2.5 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm ${fieldErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
            placeholder="Enter your username or ID"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
            }}
          />
          {fieldErrors.email && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.email}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            className={`appearance-none block w-full px-3 py-2.5 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm ${fieldErrors.password ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
            }}
          />
          {fieldErrors.password && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.password}</p>}
        </div>

        <div className="pt-3">
          <button
            type="submit"
            disabled={isLoading || isInvalid}
            className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 hover:shadow-lg transition-all duration-300 transform active:scale-[0.98] ${(isLoading || isInvalid) ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </div>


      </form>
    </AuthLayout>
  );
};

export default Login;
