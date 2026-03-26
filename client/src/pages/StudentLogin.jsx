import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';

// Reusable components
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>{children}</div>
);

const Input = ({ type, placeholder, value, onChange, required = false, className = "" }) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    required={required}
    className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${className}`}
  />
);

const Button = ({ children, onClick, variant = "primary", disabled = false, type = "button", className = "" }) => {
  const variants = {
    primary: "bg-primary-600 hover:bg-primary-700 text-white",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800"
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

function StudentLogin() {
  const { 
    login, 
    connectWallet, 
    isMetaMaskInstalled,
    walletError,
    setWalletError,
    isConnecting,
    disconnectWallet
  } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle MetaMask connection with proper error handling
  const handleConnectWallet = async () => {
    // Clear previous errors
    setWalletError(null);
    
    const result = await connectWallet();
    
    // Check if connection was successful
    if (result && result.success && result.address) {
      setWalletAddress(result.address);
    }
    // If failed, the error is already set in context via App.jsx
  };

  // Handle wallet disconnect
  const handleDisconnectWallet = () => {
    disconnectWallet();
    setWalletAddress('');
  };

  // Handle clearing wallet error
  const handleClearWalletError = () => {
    setWalletError(null);
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      navigate('/student');
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  // Handle registration
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API_URL}/api/student/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          password,
          wallet_address: walletAddress
        })
      });

      const data = await response.json();

      if (data.success) {
        // Auto login after registration
        const loginResult = await login(email, password);
        if (loginResult.success) {
          navigate('/student');
        } else {
          setError('Registration successful but login failed. Please try logging in.');
          setIsRegistering(false);
        }
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Registration failed: ' + err.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-white rounded-full flex items-center justify-center mb-4">
            <svg className="h-10 w-10 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white">
            {isRegistering ? 'Student Registration' : 'Student Login'}
          </h2>
          <p className="mt-2 text-primary-100">
            Blockchain-Based Academic Certificate Verification
          </p>
        </div>

        {/* Login/Register Form */}
        <Card>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <Input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isRegistering}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <Input
                type="email"
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Wallet Connection (Optional for registration) */}
            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wallet Address (Optional)
                </label>
                {walletAddress ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-green-700 font-mono">
                        {walletAddress.substring(0, 6)}...{walletAddress.substring(38)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleDisconnectWallet}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={handleConnectWallet}
                      disabled={!isMetaMaskInstalled || isConnecting}
                      className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isConnecting ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Connecting...</span>
                        </>
                      ) : isMetaMaskInstalled ? (
                        'Connect MetaMask Wallet'
                      ) : (
                        'MetaMask not installed'
                      )}
                    </button>
                    
                    {/* Error Message Display */}
                    {walletError && (
                      <div className={`mt-3 p-3 rounded-lg ${
                        walletError.toLowerCase().includes('already linked')
                          ? 'bg-amber-50 border border-amber-200'
                          : 'bg-red-50 border border-red-200'
                      }`}>
                        <p className={`text-sm ${
                          walletError.toLowerCase().includes('already linked')
                            ? 'text-amber-800'
                            : 'text-red-800'
                        }`}>
                          {walletError}
                        </p>
                        {walletError.toLowerCase().includes('already linked') && (
                          <p className="text-xs text-amber-700 mt-1">
                            Please switch your MetaMask account before connecting.
                          </p>
                        )}
                        <button
                          onClick={handleClearWalletError}
                          className="text-xs text-gray-500 hover:text-gray-700 mt-2 underline"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                    
                    {/* Helper Message */}
                    {isMetaMaskInstalled && !walletError && (
                      <p className="mt-2 text-xs text-gray-500">
                        Make sure to select the correct MetaMask account. If your wallet is linked to another account, switch accounts in MetaMask first.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <Button type="submit" disabled={loading}>
              {loading ? 'Please wait...' : (isRegistering ? 'Register' : 'Login')}
            </Button>
          </form>

          {/* Toggle Login/Register */}
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="text-primary-600 hover:text-primary-800 text-sm font-medium"
            >
              {isRegistering 
                ? 'Already have an account? Login' 
                : "Don't have an account? Register"}
            </button>
          </div>

          {/* Back to Home */}
          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <Link to="/login" className="text-gray-500 hover:text-gray-700 text-sm">
              ← Back to Main Login
            </Link>
          </div>
        </Card>

        {/* Features */}
        <div className="text-center text-primary-100 text-sm">
          <p>Secure • Blockchain Verified • Instant Verification</p>
        </div>
      </div>
    </div>
  );
}

export default StudentLogin;

