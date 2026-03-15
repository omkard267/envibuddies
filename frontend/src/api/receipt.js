import axiosInstance from './axiosInstance';

// Get receipt by ID
export const getReceiptById = async (receiptId) => {
  try {
    const response = await axiosInstance.get(`/api/receipts/${receiptId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting receipt:', error);
    throw error;
  }
};

// Get receipts by sponsorship
export const getReceiptsBySponsorship = async (sponsorshipId) => {
  try {
    const response = await axiosInstance.get(`/api/receipts/sponsorship/${sponsorshipId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting receipts by sponsorship:', error);
    throw error;
  }
};

// Get receipts by sponsor
export const getReceiptsBySponsor = async (sponsorId) => {
  try {
    const response = await axiosInstance.get(`/api/receipts/sponsor/${sponsorId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting receipts by sponsor:', error);
    throw error;
  }
};

// Get receipts by organization
export const getReceiptsByOrganization = async (organizationId) => {
  try {
    const response = await axiosInstance.get(`/api/receipts/organization/${organizationId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting receipts by organization:', error);
    throw error;
  }
};

// Download receipt
export const downloadReceipt = async (receiptId) => {
  try {
    const response = await axiosInstance.get(`/api/receipts/${receiptId}/download`);
    return response.data;
  } catch (error) {
    console.error('Error downloading receipt:', error);
    throw error;
  }
}; 