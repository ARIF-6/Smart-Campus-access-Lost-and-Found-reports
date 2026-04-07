import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { register } from '../services/api';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student'
  });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear field error when user types
    if (fieldErrors[e.target.name]) {
      setFieldErrors({ ...fieldErrors, [e.target.name]: '' });
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.email.includes('@')) errors.email = "Invalid email address";
    if (formData.password.length < 6) errors.password = "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = "Passwords do not match";
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role
      });
      navigate('/login', { state: { message: "Registration successful. Please log in." }});
    } catch (err) {
      if (err.response && err.response.data && err.response.data.errors) {
        // Handle express-validator errors
        const mappedErrors = {};
        err.response.data.errors.forEach(e => {
          mappedErrors[e.path || e.param] = e.msg;
        });
        setFieldErrors(mappedErrors);
        setError("Please correct the highlighted errors.");
      } else {
        setError(
          err.response && err.response.data && err.response.data.message
            ? err.response.data.message
            : 'Registration failed. Please try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isInvalid = !formData.name || !formData.email || formData.password.length < 6 || formData.password !== formData.confirmPassword;

  return (
    <AuthLayout>
      <form onSubmit={handleRegister} className="space-y-4">
        
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="name">
            Full Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className={`appearance-none block w-full px-4 py-2.5 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors sm:text-sm ${fieldErrors.name ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
            placeholder="John Doe"
            value={formData.name}
            onChange={handleChange}
          />
          {fieldErrors.name && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="email">
            University Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className={`appearance-none block w-full px-4 py-2.5 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors sm:text-sm ${fieldErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
            placeholder="student@smartcampus.com"
            value={formData.email}
            onChange={handleChange}
          />
          {fieldErrors.email && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.email}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className={`appearance-none block w-full px-4 py-2.5 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors sm:text-sm ${fieldErrors.password ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />
              {fieldErrors.password && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="confirmPassword">
                Confirm
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className={`appearance-none block w-full px-4 py-2.5 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors sm:text-sm ${fieldErrors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              {fieldErrors.confirmPassword && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.confirmPassword}</p>}
            </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="role">
            I am a...
          </label>
          <select
            id="role"
            name="role"
            required
            className="appearance-none block w-full px-4 py-2.5 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm select-chevron"
            value={formData.role}
            onChange={handleChange}
          >
            <option value="student">Student</option>
            <option value="security">Security Personnel</option>
            <option value="cleaner">Cleaning Staff</option>
          </select>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading || isInvalid}
            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors ${(isLoading || isInvalid) ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Creating Account...' : 'Register Account'}
          </button>
        </div>

        <div>
          <Link
            to="/login"
            className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors mt-2"
          >
            Back to Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Register;
