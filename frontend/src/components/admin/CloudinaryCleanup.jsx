import React, { useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { showAlert } from '../../utils/notifications';

const CloudinaryCleanup = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  const runCleanup = async () => {
    try {
      setIsRunning(true);
      setError(null);
      setStats(null);

      showAlert.info('🔍 Starting Cloudinary URL cleanup...');

      const response = await axiosInstance.post('/api/users/cleanup-cloudinary-urls');
      
      if (response.data.success) {
        setStats(response.data.stats);
        showAlert.success('✅ Cloudinary URL cleanup completed successfully!');
      } else {
        setError(response.data.message || 'Cleanup failed');
        showAlert.error('❌ Cleanup failed: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      setError(errorMessage);
      showAlert.error('❌ Cleanup failed: ' + errorMessage);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Cloudinary URL Cleanup</h2>
          <p className="text-gray-600 mt-1">
            Check and clean up invalid Cloudinary URLs for profile images and government ID proofs
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">What this does:</h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Checks all profile images and government ID proofs in the database</li>
            <li>• Validates Cloudinary URLs by making HTTP requests</li>
            <li>• Removes invalid URLs that return 404 errors</li>
            <li>• Provides detailed statistics of the cleanup process</li>
          </ul>
        </div>

        <button
          onClick={runCleanup}
          disabled={isRunning}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            isRunning
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          {isRunning ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Running Cleanup...
            </div>
          ) : (
            '🚀 Run Cloudinary URL Cleanup'
          )}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-2">Error:</h3>
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {stats && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-4">Cleanup Results:</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-green-800 mb-2">Profile Images:</h4>
                <div className="text-sm text-green-700 space-y-1">
                  <div>Checked: {stats.profileImages.checked}</div>
                  <div>Valid: {stats.profileImages.valid}</div>
                  <div>Cleaned: {stats.profileImages.cleaned}</div>
                  <div>Errors: {stats.profileImages.errors}</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-green-800 mb-2">Government ID Proofs:</h4>
                <div className="text-sm text-green-700 space-y-1">
                  <div>Checked: {stats.govtIdProofs.checked}</div>
                  <div>Valid: {stats.govtIdProofs.valid}</div>
                  <div>Cleaned: {stats.govtIdProofs.cleaned}</div>
                  <div>Errors: {stats.govtIdProofs.errors}</div>
                </div>
              </div>
            </div>

            {stats.cleanedUsers.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-green-800 mb-2">Cleaned Users ({stats.cleanedUsers.length}):</h4>
                <div className="text-sm text-green-700 max-h-32 overflow-y-auto">
                  {stats.cleanedUsers.map((user, index) => (
                    <div key={index} className="py-1">
                      {user.username} ({user.userId})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CloudinaryCleanup;
