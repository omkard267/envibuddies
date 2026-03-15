import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  ShareIcon,
  ExclamationTriangleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import ReceiptDisplay from '../components/receipt/ReceiptDisplay';
import { getReceiptById } from '../api/receipt';
import { showAlert } from '../utils/notifications';

const ReceiptPage = () => {
  const { receiptId } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getReceiptById(receiptId);
        setReceipt(response.receipt);
      } catch (error) {
        console.error('Error fetching receipt:', error);
        setError('Failed to load receipt. Please check the receipt ID and try again.');
      } finally {
        setLoading(false);
        // Trigger animations
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
      }
    };

    if (receiptId) {
      fetchReceipt();
    }
  }, [receiptId]);

  const handleDownload = async (receiptId) => {
    try {
      // TODO: Implement PDF download
      showAlert.info('PDF download feature coming soon!');
    } catch (error) {
      console.error('Error downloading receipt:', error);
      showAlert.error('Failed to download receipt');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = (receiptId) => {
    // TODO: Implement sharing functionality
    const shareUrl = `${window.location.origin}/receipt/${receiptId}`;
    if (navigator.share) {
      navigator.share({
        title: 'Payment Receipt',
        text: 'View my payment receipt',
        url: shareUrl
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      showAlert.success('Receipt link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
        <div className="pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="bg-red-50/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-red-200/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-red-900">Error Loading Receipt</h3>
            </div>
            <p className="text-red-700 mb-6">{error}</p>
            <button
          onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
        >
              <ArrowLeftIcon className="w-4 h-4" />
          Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      <div className="pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        {/* Header Section */}
        <div className={`mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
          onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
        >
                <ArrowLeftIcon className="w-5 h-5" />
          Back
              </button>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 bg-clip-text text-transparent">
          Payment Receipt
                </h1>
                <p className="text-slate-600 text-lg mt-1">
                  View and manage your payment receipt
                </p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleDownload(receiptId)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                <DocumentArrowDownIcon className="w-5 h-5" />
                Download
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                <PrinterIcon className="w-5 h-5" />
                Print
              </button>
              <button
                onClick={() => handleShare(receiptId)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                <ShareIcon className="w-5 h-5" />
                Share
              </button>
            </div>
          </div>
        </div>

        {/* Receipt Content */}
        <div className={`transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
      <ReceiptDisplay
        receipt={receipt}
        onDownload={handleDownload}
        onPrint={handlePrint}
        onShare={handleShare}
      />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptPage; 