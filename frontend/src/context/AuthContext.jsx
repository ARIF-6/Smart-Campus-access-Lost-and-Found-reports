import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        try {
          // Use locally cached user data first to avoid a round-trip on every page refresh
          const cachedUser = localStorage.getItem('user');
          if (cachedUser) {
            setUser(JSON.parse(cachedUser));
          } else {
            // No cached user — fetch from API (first login after clear, or fresh browser)
            const { getUserProfile } = await import('../services/api');
            const profile = await getUserProfile();
            setUser(profile);
            localStorage.setItem('user', JSON.stringify(profile));
          }
        } catch (e) {
          console.error("Auth init failed:", e);
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [token]);

  const login = (userData, userToken) => {
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData)); // cache user for fast page-refresh
    setToken(userToken);
    setUser(userData);
  };

  const logout = async () => {
    try {
      const { logoutUser } = await import('../services/api');
      await logoutUser();
    } catch (e) {
      console.error('Failed to log logout action on server:', e);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user'); // clear cached user data
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};


export const useAuth = () => useContext(AuthContext);
