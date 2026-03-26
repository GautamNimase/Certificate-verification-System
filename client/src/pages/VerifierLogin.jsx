import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL + "/api";

function VerifierLogin() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    organization_name: '',
    verifier_name: '',
    email: '',
    password: '',
    wallet_address: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/verifier/login' : '/verifier/register';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        // Store token and user info (use same keys as App.jsx expects)
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.verifier));
        
        // Redirect to verifier dashboard
        navigate('/verifier');
      } else {
        setError(data.message || 'Authentication failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-white">
            {isLogin ? 'Verifier Login' : 'Verifier Registration'}
          </h2>
          <p className="mt-2 text-primary-100">
            {isLogin 
              ? 'Sign in to verify academic certificates' 
              : 'Register as an authorized verifier'}
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6 bg-white rounded-xl shadow-2xl p-8" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {!isLogin && (
            <>
              <div>
                <label htmlFor="organization_name" className="block text-sm font-medium text-gray-700">
                  Organization Name
                </label>
                <input
                  id="organization_name"
                  name="organization_name"
                  type="text"
                  required={!isLogin}
                  value={formData.organization_name}
                  onChange={handleChange}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Tech Corp Inc."
                />
              </div>

              <div>
                <label htmlFor="verifier_name" className="block text-sm font-medium text-gray-700">
                  Verifier Name
                </label>
                <input
                  id="verifier_name"
                  name="verifier_name"
                  type="text"
                  required={!isLogin}
                  value={formData.verifier_name}
                  onChange={handleChange}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., John Smith"
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              placeholder="••••••••"
            />
          </div>

          {!isLogin && (
            <div>
              <label htmlFor="wallet_address" className="block text-sm font-medium text-gray-700">
                Wallet Address (Optional)
              </label>
              <input
                id="wallet_address"
                name="wallet_address"
                type="text"
                value={formData.wallet_address}
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="0x..."
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Register')}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-sm text-primary-600 hover:text-primary-500"
            >
              {isLogin 
                ? "Don't have an account? Register as a verifier" 
                : 'Already have an account? Sign in'}
            </button>
          </div>

          <div className="text-center mt-4">
            <Link to="/login" className="text-sm text-gray-500 hover:text-gray-400">
              ← Back to Main Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VerifierLogin;

