import { ethers } from 'ethers';
import { createContext, useEffect, useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';

// Import pages
import AdminDashboard from './pages/AdminDashboard';
import AuthPage from './pages/AuthPage';
import StudentDashboard from './pages/StudentDashboard';
import StudentLogin from './pages/StudentLogin';
import VerifierDashboard from './pages/VerifierDashboard';
import VerifierLogin from './pages/VerifierLogin';
import VerifyCertificate from './pages/VerifyCertificate';

// Create Auth Context
export const AuthContext = createContext(null);

// API Base URL
// Accepts either:
// - VITE_API_URL="https://host"       -> we append "/api"
// - VITE_API_URL="https://host/api"  -> use as-is
const API_URL_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = API_URL_BASE.endsWith('/api') ? API_URL_BASE : `${API_URL_BASE.replace(/\/$/, '')}/api`;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);
  const [walletError, setWalletError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Check if MetaMask is installed (but do NOT auto-connect)
  const checkMetaMaskInstalled = () => {
    if (typeof window.ethereum !== 'undefined') {
      setIsMetaMaskInstalled(true);
    } else {
      setIsMetaMaskInstalled(false);
    }
  };

  // Listen for account changes in MetaMask
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      // Listen for account changes
      window.ethereum.on('accountsChanged', async (accounts) => {
        if (accounts.length > 0) {
          const address = accounts[0];
          setWalletAddress(address);
          localStorage.setItem('walletAddress', address);
          
          // Update user in localStorage
          const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
          savedUser.wallet_address = address;
          localStorage.setItem('user', JSON.stringify(savedUser));
          setUser(savedUser);
          
          console.log('Wallet changed to:', address);
        } else {
          // No accounts - wallet disconnected
          setWalletAddress(null);
          localStorage.removeItem('walletAddress');
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        // Reload the page on chain change
        window.location.reload();
      });
    }
  }, []);

  useEffect(() => {
    // Initial check for MetaMask (NO auto-connect)
    checkMetaMaskInstalled();

    // Check for saved token and user
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Connect to MetaMask and save wallet address to database
  const connectWallet = async () => {
    // Clear any previous errors
    setWalletError(null);
    setIsConnecting(true);

    if (!window.ethereum) {
      const error = 'MetaMask is not installed. Please install MetaMask to continue.';
      setWalletError(error);
      setIsConnecting(false);
      return { success: false, message: error };
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);
      
      // Save wallet address to localStorage for persistence
      localStorage.setItem('walletAddress', address);
      
      // If user is logged in, save wallet address to database
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Use the connect-wallet endpoint
          const response = await fetch(`${API_URL}/users/connect-wallet`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ walletAddress: address }),
          });
          
          const data = await response.json();
          if (data.success) {
            // Update user in localStorage with new wallet address
            const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
            savedUser.wallet_address = address;
            localStorage.setItem('user', JSON.stringify(savedUser));
            setUser(savedUser);
            console.log('Wallet address saved to database:', address);
            setIsConnecting(false);
            return { success: true, message: 'Wallet connected successfully!', address };
          } else {
            // Handle specific error: wallet already linked to another account
            const errorMessage = data.message || 'Failed to save wallet';
            setWalletError(errorMessage);
            setIsConnecting(false);
            return { success: false, message: errorMessage };
          }
        } catch (saveError) {
          console.error('Error saving wallet to database:', saveError);
          const error = 'Error saving wallet to database';
          setWalletError(error);
          setIsConnecting(false);
          return { success: false, message: error };
        }
      }
      
      setIsConnecting(false);
      return { success: true, message: 'Wallet connected!', address };
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
      const errorMessage = error.message || 'Error connecting to MetaMask';
      setWalletError(errorMessage);
      setIsConnecting(false);
      return { success: false, message: errorMessage };
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setWalletAddress(null);
    setWalletError(null);
    localStorage.removeItem('walletAddress');
  };

  // Login function
  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        setUser(data.data.user);
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('walletAddress');
    setUser(null);
    setWalletAddress(null);
  };

  // Get auth token
  const getToken = () => {
    return localStorage.getItem('token');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      connectWallet, 
      walletAddress, 
      isMetaMaskInstalled,
      walletError,
      setWalletError,
      isConnecting,
      disconnectWallet,
      getToken,
      API_URL
    }}>
      <Router>
        <Routes>
          <Route path="/login" element={!user ? <AuthPage /> : <Navigate to="/" />} />
          <Route path="/student-login" element={!user ? <StudentLogin /> : <Navigate to="/student" />} />
          <Route path="/verifier-login" element={<VerifierLogin />} />
          <Route path="/verify" element={<VerifyCertificate />} />
          
          {/* Protected Routes */}
          <Route path="/" element={
            user ? (
              user.role === 'admin' ? <Navigate to="/admin" /> :
              user.role === 'student' ? <Navigate to="/student" /> :
              user.role === 'verifier' ? <Navigate to="/verifier" /> :
              <Navigate to="/login" />
            ) : <Navigate to="/login" />
          } />
          
          <Route path="/admin" element={
            user && user.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />
          } />
          
          <Route path="/student" element={
            user && user.role === 'student' ? <StudentDashboard /> : <Navigate to="/login" />
          } />
          
          <Route path="/verifier" element={
            user && user.role === 'verifier' ? <VerifierDashboard /> : <Navigate to="/login" />
          } />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;

