// src/AuthProvider.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Create the context
const AuthContext = createContext(null);


// Provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [wasAuthenticated, setWasAuthenticated] = useState(false);
  const navigate = useNavigate();


  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/profile", {
          credentials: "include",
        });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          setWasAuthenticated(true);
        } else {
          setUser(null);
          setError("Not authenticated");
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        setUser(null);
        setError("Failed to connect to server");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const clearError = () => {
    setError(null);
  };

  const register = async (email, password) => {
    setError(null);
    const res = await fetch("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password })
    });
  
    if (res.ok) {
      const profileRes = await fetch("/api/profile", {
        credentials: "include"
      });
  
      if (profileRes.ok) {
        const userData = await profileRes.json();
        setUser(userData);
        setWasAuthenticated(true);
        return true;
      }
      return false;
    } else {
      setError("Registration failed");
      return false;
    }
  };

const login = async (email, password) => {
  const res = await fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password })
  })

  if (res.ok) {
    const profileRes = await fetch("/api/profile", {
      credentials: "include"
    })

    if (profileRes.ok) {
      const userData = await profileRes.json();
      setUser(userData);
      setWasAuthenticated(true);
      return true;
    }

    return false;
  }
  else{
    setError("Login failed");
    return false;
  }
}

const logout = async () => {
  const res = await fetch("/auth/logout", {
    method: "POST",
    credentials: "include"
  });

  if (res.ok) {
    setUser(null);
    return true;
  } else {
    setError("Logout failed");
    return false;
  }
  
};

const guestLogin = async () => {
  setUser({ guest: true, name: 'Guest User' });
  setError(null);
  setWasAuthenticated(false);
  return true;
};

// Add refetchProfile function
const refetchProfile = async () => {
  setLoading(true);
  const res = await fetch("/api/profile", { credentials: "include" });
  if (res.ok) {
    const userData = await res.json();
 
    setUser(userData);
    setWasAuthenticated(true);
  } else {
    setUser(null);
    setError("Not authenticated");
  }
  setLoading(false);
};

// Add updateUserProfile function for targeted updates without loading state
const updateUserProfile = (profileUpdates) => {
  if (user) {
    setUser({
      ...user,
      profile: {
        ...user.profile,
        ...profileUpdates
      }
    });
  }
};

// Add updateUserEmail function for email updates
const updateUserEmail = (newEmail) => {
  if (user) {
    setUser({
      ...user,
      email: newEmail
    });
  }
};

// Get cached profile data without refetching
const getCachedProfile = () => {
  return user?.profile || null;
};

return (
  <AuthContext.Provider value={{ user, login, logout, register, loading, error, clearError, isAuthenticated: !!user, guestLogin, wasAuthenticated, refetchProfile, updateUserProfile, updateUserEmail, getCachedProfile }}>
    {children}
  </AuthContext.Provider>
);

}

// Custom hook for consuming the context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Global fetch wrapper to handle 401 Unauthorized
export function useFetchWithAuth() {
  const navigate = useNavigate();
  const { logout, wasAuthenticated } = useAuth();

  return async function fetchWithAuth(url, options = {}) {
    try {
      const res = await fetch(url, { ...options, credentials: 'include' });

      if (res.status === 401) {
        await logout();
        if (wasAuthenticated) {
          navigate('/login?expired=1', { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
        return { data: null, error: 'Session expired' };
      }

      if (!res.ok) {
        const errorText = await res.text();
        return { data: null, error: errorText || 'Request failed' };
      }

      let data;
      try {
        data = await res.json();
      } catch {
        data = await res.text();
      }
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message || 'Network error' };
    }
  };
}