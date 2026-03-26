import { AnimatePresence, motion } from 'framer-motion';
import { useContext, useState } from 'react';
import { AuthContext } from '../App';

// Components
import AuthCard from '../components/AuthCard';
import DemoAccounts from '../components/DemoAccounts';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';
import WalletConnect from '../components/WalletConnect';

/**
 * AuthPage Component
 * Main authentication page with Login/Register tabs
 * Features:
 * - Soft gradient background
 * - Tab switcher for Login/Register
 * - Wallet connection with proper error handling
 * - Demo accounts section
 * - Framer Motion animations
 */
const AuthPage = () => {
  const { 
    login, 
    connectWallet, 
    API_URL,
    walletAddress, 
    isMetaMaskInstalled,
    walletError,
    setWalletError,
    isConnecting,
    disconnectWallet
  } = useContext(AuthContext);
  
  // State
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Handle login submission
  const handleLogin = async (email, password) => {
    setLoading(true);
    setError('');

    const result = await login(email, password);
    
    if (!result.success) {
      setError(result.message || 'Login failed. Please check your credentials.');
    }
    
    setLoading(false);
  };

  // Handle wallet connection with proper error handling
  const handleConnectWallet = async () => {
    // Clear any previous errors
    setWalletError(null);
    
    const result = await connectWallet();
    
    // If connection failed and returned an error message, it's already set in context
    // But we can also handle logic here if needed additional
    if (result && !result.success) {
      console.log('Wallet connection failed:', result.message);
    }
  };

  // Handle wallet disconnect
  const handleDisconnectWallet = () => {
    disconnectWallet();
  };

  // Handle clearing wallet error
  const handleClearWalletError = () => {
    setWalletError(null);
  };

  // Handle registration success
  const handleRegisterSuccess = (result) => {
    if (result.success) {
      setRegistrationSuccess(true);
      setActiveTab('login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background - Soft Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50" />
      
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Top Right - Large Blur */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl" />
        
        {/* Bottom Left - Large Blur */}
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl" />
        
        {/* Center - Subtle Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full flex flex-col items-center px-4 py-8">
        {/* Wallet Connection - Outside Card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-md mb-6"
        >
          <WalletConnect
            walletAddress={walletAddress}
            isMetaMaskInstalled={isMetaMaskInstalled}
            isConnecting={isConnecting}
            onConnect={handleConnectWallet}
            onDisconnect={handleDisconnectWallet}
            error={walletError}
            onClearError={handleClearWalletError}
          />
        </motion.div>

        {/* Auth Card */}
        <AuthCard activeTab={activeTab} onTabChange={setActiveTab}>
          <AnimatePresence mode="wait">
            {activeTab === 'login' ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <LoginForm
                  onSubmit={handleLogin}
                  loading={loading}
                  error={error}
                  setError={setError}
                />
                {/* Demo Accounts Section - Only show on Login */}
                <DemoAccounts />
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <RegisterForm
                onSubmit={handleRegisterSuccess}
                loading={loading}
                error={error}
                setError={setError}
                API_URL={API_URL}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </AuthCard>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-xs text-gray-400 text-center"
        >
          Secured by Blockchain Technology
        </motion.p>
      </div>
    </div>
  );
};

export default AuthPage;

