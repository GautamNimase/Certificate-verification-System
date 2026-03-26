import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL + "/api";

// Helper function to format date in DD MMM YYYY format
const formatDate = (dateValue) => {
  // Handle null/undefined
  if (!dateValue) return 'N/A';
  
  let date;
  
  // If it's a number, treat as Unix timestamp (seconds or milliseconds)
  if (typeof dateValue === 'number') {
    // Check if it's seconds (10 digits) or milliseconds (13 digits)
    const timestamp = dateValue < 10000000000 ? dateValue * 1000 : dateValue;
    date = new Date(timestamp);
  } 
  // If it's a string
  else if (typeof dateValue === 'string') {
    // Try parsing as number first
    const num = parseInt(dateValue);
    if (!isNaN(num)) {
      const timestamp = num < 10000000000 ? num * 1000 : num;
      date = new Date(timestamp);
    } else {
      // Try parsing as date string
      date = new Date(dateValue);
    }
  }
  // If it's already a Date object
  else if (dateValue instanceof Date) {
    date = dateValue;
  }
  
  // Check if date is valid
  if (!date || isNaN(date.getTime())) return 'N/A';
  
  // Format as DD MMM YYYY
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
};

// Reusable components
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>{children}</div>
);

function VerifyCertificate() {
  const [searchParams] = useSearchParams();
  const certificateHash = searchParams.get('hash');
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [inputHash, setInputHash] = useState(certificateHash || '');
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper function to get IPFS URL
  const getIPFSUrl = (cid) => {
    if (!cid) return null;
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  };

  // Check if CID is valid (not mock or empty)
  const isValidIPFSCID = (cid) => {
    if (!cid) return false;
    // Check for common mock CID patterns
    const mockPatterns = ['mock', 'test', 'example', 'placeholder', 'demo', ''];
    const cidString = String(cid).toLowerCase().trim();
    return !mockPatterns.some(pattern => cidString === pattern || cidString.includes(pattern));
  };

  useEffect(() => {
    if (certificateHash) {
      handleVerify(certificateHash);
    }
  }, [certificateHash]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return;
    }
    setSelectedFile(file);
    setError('');
    setVerificationResult(null);
  };

  const handleVerifyByHash = async (hash = inputHash) => {
    if (!hash) {
      setError('Please provide a certificate hash');
      return;
    }
    handleVerify(hash);
  };

  const handleVerify = async (hash) => {
    setLoading(true);
    setError('');
    setVerificationResult(null);

    try {
      const response = await fetch(`${API_URL}/certificate/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ certificateHash: hash })
      });

      const data = await response.json();
      
      if (data.success) {
        setVerificationResult(data);
      } else {
        setError(data.message || 'Verification failed');
      }
    } catch (err) {
      setError('Error verifying certificate. Please try again.');
    }

    setLoading(false);
  };

  const handleVerifyByFile = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a certificate file');
      return;
    }

    setLoading(true);
    setError('');
    setVerificationResult(null);

    const formData = new FormData();
    formData.append('certificate', selectedFile);

    try {
      const response = await fetch(`${API_URL}/certificate/verify`, {
        method: 'POST',
        headers: {},
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        setVerificationResult(data);
      } else {
        setError(data.message || 'Verification failed');
      }
    } catch (err) {
      setError('Error verifying certificate');
    }

    setLoading(false);
  };

  const getResultIcon = (result) => {
    switch (result) {
      case 'VALID':
        return (
          <svg className="h-20 w-20 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'REVOKED':
        return (
          <svg className="h-20 w-20 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="h-20 w-20 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-white rounded-full flex items-center justify-center mb-4">
            <svg className="h-10 w-10 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Certificate Verification</h1>
          <p className="mt-2 text-primary-100">Blockchain-Based Academic Certificate Verification System</p>
        </div>

        {/* Verification Form */}
        <Card>
          <h2 className="text-xl font-bold mb-6">Verify Certificate</h2>
          
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Verify by Hash */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Certificate Hash</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputHash}
                onChange={(e) => setInputHash(e.target.value)}
                placeholder="Enter certificate hash"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <button
                onClick={() => handleVerifyByHash()}
                disabled={loading}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                Verify
              </button>
            </div>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">OR</span>
            </div>
          </div>

          {/* Verify by File Upload */}
          <form onSubmit={handleVerifyByFile}>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Certificate PDF</label>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="verify-upload"
                />
                <label htmlFor="verify-upload" className="cursor-pointer">
                  {selectedFile ? (
                    <div>
                      <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-900 font-medium">{selectedFile.name}</p>
                    </div>
                  ) : (
                    <div>
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">
                        <span className="font-medium text-primary-600">Click to upload</span> PDF
                      </p>
                    </div>
                  )}
                </label>
              </div>

              <button
                type="submit"
                disabled={!selectedFile || loading}
                className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Verifying...' : 'Verify Certificate'}
              </button>
            </div>
          </form>
        </Card>

        {/* Verification Result */}
        {verificationResult && (
          <Card className="mt-6">
            <div className="text-center mb-6">
              {getResultIcon(verificationResult.result)}
              <h3 className={`mt-4 text-2xl font-bold ${verificationResult.result === 'VALID' ? 'text-green-600' : verificationResult.result === 'REVOKED' ? 'text-red-600' : 'text-gray-600'}`}>
                {verificationResult.result === 'VALID' ? '✓ Certificate is Valid' : 
                 verificationResult.result === 'REVOKED' ? '✗ Certificate has been Revoked' : 
                 '? Certificate Not Found'}
              </h3>
              <p className="text-gray-500 mt-2">{verificationResult.message}</p>
            </div>

            {verificationResult.certificate && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-gray-900 border-b pb-2">Certificate Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Certificate Name:</span>
                    <p className="font-medium">{verificationResult.certificate.certificateName}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Issue Date:</span>
                    <p className="font-medium">
                      {formatDate(verificationResult.certificate.issueDate)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Student:</span>
                    <p className="font-medium">{verificationResult.certificate.student?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Issuer:</span>
                    <p className="font-medium">{verificationResult.certificate.issuerName}</p>
                  </div>
                  {verificationResult.certificate.ipfsCID && (
                    <div className="col-span-2">
                      <span className="text-gray-500">IPFS CID:</span>
                      <p className="font-mono text-xs bg-gray-100 p-2 rounded break-all">{verificationResult.certificate.ipfsCID}</p>
                    </div>
                  )}
                  {/* Also check for ipfs_cid in case API returns snake_case */}
                  {verificationResult.certificate.ipfs_cid && !verificationResult.certificate.ipfsCID && (
                    <div className="col-span-2">
                      <span className="text-gray-500">IPFS CID:</span>
                      <p className="font-mono text-xs bg-gray-100 p-2 rounded break-all">{verificationResult.certificate.ipfs_cid}</p>
                    </div>
                  )}
                  {verificationResult.result === 'VALID' && isValidIPFSCID(verificationResult.certificate.ipfsCID || verificationResult.certificate.ipfs_cid) && (
                    <div className="col-span-2 mt-2">
                      <a 
                        href={getIPFSUrl(verificationResult.certificate.ipfsCID || verificationResult.certificate.ipfs_cid)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                      >
                        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Certificate on IPFS
                      </a>
                    </div>
                  )}
                  {verificationResult.certificate.revoked && (
                    <div className="col-span-2 bg-red-50 p-3 rounded-lg">
                      <span className="text-red-600 font-medium">⚠️ This certificate has been revoked on {formatDate(verificationResult.certificate.revokedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link to="/login" className="text-primary-100 hover:text-white underline">
            Login to access dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default VerifyCertificate;

