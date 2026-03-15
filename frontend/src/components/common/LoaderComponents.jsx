import React from 'react';

// Button Loader Component
export const ButtonLoader = ({ size = 'sm', color = 'white' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-current border-t-transparent`} 
         style={{ color: color }}>
      <span className="sr-only">Loading...</span>
    </div>
  );
};

// Full Screen Loader Component
export const FullScreenLoader = ({ 
  isVisible, 
  message = 'Processing...', 
  showProgress = false, 
  progress = 0,
  onCancel = null,
  subMessage = null
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
        {/* Main Spinner */}
        <div className="w-16 h-16 mx-auto mb-4">
          <div className="w-full h-full border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
        
        {/* Message */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{message}</h3>
        
        {/* Sub Message */}
        {subMessage && (
          <p className="text-sm text-gray-600 mb-4">{subMessage}</p>
        )}
        
        {/* Progress Bar (if enabled) */}
        {showProgress && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
        )}
        
        {/* Progress Text */}
        {showProgress && (
          <p className="text-sm text-gray-600 mb-4">
            {Math.round(progress)}% complete
          </p>
        )}
        
        {/* Cancel Button (if provided) */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

// Upload Progress Component
export const UploadProgress = ({ 
  fileName, 
  progress, 
  status = 'uploading', // uploading, success, error
  onCancel = null 
}) => {
  const statusColors = {
    uploading: 'bg-blue-600',
    success: 'bg-green-600',
    error: 'bg-red-600'
  };

  const statusIcons = {
    uploading: '⏳',
    success: '✅',
    error: '❌'
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3 mb-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm">{statusIcons[status]}</span>
          <span className="text-sm font-medium text-gray-700 truncate max-w-48">
            {fileName}
          </span>
        </div>
        {onCancel && status === 'uploading' && (
          <button
            onClick={onCancel}
            className="text-xs text-gray-500 hover:text-red-600 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ease-out ${statusColors[status]}`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      {/* Status Text */}
      <div className="flex justify-between items-center mt-1">
        <span className="text-xs text-gray-500">
          {status === 'uploading' ? 'Uploading...' : 
           status === 'success' ? 'Upload complete' : 'Upload failed'}
        </span>
        {status === 'uploading' && (
          <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
        )}
      </div>
    </div>
  );
};

// Form Submit Button with Loader
export const SubmitButton = ({ 
  children, 
  loading = false, 
  disabled = false,
  className = '',
  type = 'submit',
  onClick = null
}) => {
  const baseClasses = "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm transition-all duration-200";
  const stateClasses = loading || disabled 
    ? "bg-gray-400 cursor-not-allowed text-gray-200" 
    : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg transform hover:scale-105";
  
  return (
    <button
      type={type}
      disabled={loading || disabled}
      className={`${baseClasses} ${stateClasses} ${className}`}
      onClick={onClick}
    >
      {loading && (
        <>
          <ButtonLoader size="sm" className="mr-2" />
          Processing...
        </>
      )}
      {!loading && children}
    </button>
  );
};

// Loading State Hook
export const useLoadingState = (initialState = false) => {
  const [loading, setLoading] = React.useState(initialState);
  
  const startLoading = () => setLoading(true);
  const stopLoading = () => setLoading(false);
  const withLoading = async (asyncFunction) => {
    try {
      startLoading();
      const result = await asyncFunction();
      return result;
    } finally {
      stopLoading();
    }
  };
  
  return { loading, startLoading, stopLoading, withLoading };
};
