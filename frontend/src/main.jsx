import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Toaster } from 'react-hot-toast'

import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <AuthProvider>
        <Toaster position="top-right" />
        <App />
      </AuthProvider>
    </Router>
  </StrictMode>,
)
