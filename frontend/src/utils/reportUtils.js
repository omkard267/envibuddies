import axiosInstance from '../api/axiosInstance';

/**
 * Check if an event is eligible for report generation
 * @param {string} eventId - The event ID
 * @returns {Promise<Object>} - Eligibility status and statistics
 */
export const checkReportEligibility = async (eventId) => {
  try {
    const response = await axiosInstance.get(`/api/reports/eligibility/${eventId}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error checking report eligibility:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to check eligibility'
    };
  }
};

/**
 * Generate AI report for an event
 * @param {string} eventId - The event ID
 * @returns {Promise<Object>} - Generation result
 */
export const generateEventReport = async (eventId) => {
  try {
    const response = await axiosInstance.post(`/api/reports/generate/${eventId}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error generating report:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to generate report'
    };
  }
};

/**
 * Get generated report for an event
 * @param {string} eventId - The event ID
 * @returns {Promise<Object>} - Report data
 */
export const getEventReport = async (eventId) => {
  try {
    const response = await axiosInstance.get(`/api/reports/${eventId}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error fetching report:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to fetch report'
    };
  }
};

/**
 * Generate and download PDF from HTML content
 * @param {string} htmlContent - HTML content to convert to PDF
 * @param {string} filename - Filename for the PDF
 */
export const downloadReportAsPDF = (htmlContent, filename = 'event-report.pdf') => {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  
  const htmlDocument = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Event Report</title>
      <style>
        @page {
          size: A4;
          margin: 1in;
        }
        body {
          font-family: 'Times New Roman', serif;
          line-height: 1.8;
          color: #2c3e50;
          margin: 0;
          padding: 0;
          background: #ffffff;
          font-size: 12pt;
        }
        .report-header {
          text-align: center;
          border-bottom: 3px solid #2c5530;
          padding-bottom: 20px;
          margin-bottom: 40px;
          page-break-inside: avoid;
        }
        .report-title {
          font-size: 24pt;
          font-weight: bold;
          color: #2c5530;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .report-subtitle {
          font-size: 14pt;
          color: #7f8c8d;
          font-style: italic;
        }
        h1 {
          font-size: 18pt;
          color: #2c5530;
          border-bottom: 2px solid #4CAF50;
          padding-bottom: 8px;
          margin-top: 30pt;
          margin-bottom: 15pt;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          page-break-after: avoid;
        }
        h2 {
          font-size: 16pt;
          color: #34495e;
          border-left: 4px solid #4CAF50;
          padding-left: 15px;
          margin-top: 25pt;
          margin-bottom: 12pt;
          font-weight: bold;
          background: #f8f9fa;
          padding-top: 8px;
          padding-bottom: 8px;
          page-break-after: avoid;
        }
        h3 {
          font-size: 14pt;
          color: #1976d2;
          margin-top: 20pt;
          margin-bottom: 10pt;
          font-weight: bold;
          border-bottom: 1px solid #e0e0e0;
          padding-bottom: 4px;
          page-break-after: avoid;
        }
        p {
          margin-bottom: 12pt;
          text-align: justify;
          text-indent: 15pt;
          orphans: 2;
          widows: 2;
        }
        ul, ol {
          margin-bottom: 12pt;
          padding-left: 25pt;
        }
        li {
          margin-bottom: 6pt;
          line-height: 1.6;
        }
        .section {
          margin-bottom: 25pt;
          padding: 15pt;
          border-radius: 6px;
          page-break-inside: avoid;
        }
        .executive-summary {
          background: #e8f5e8;
          border-left: 4px solid #4CAF50;
        }
        .impact-section {
          background: #e3f2fd;
          border-left: 4px solid #2196F3;
        }
        .recommendations {
          background: #fff3e0;
          border-left: 4px solid #FF9800;
        }
        .conclusion {
          background: #f3e5f5;
          border-left: 4px solid #9C27B0;
        }
        .stats-box {
          background: #f8f9fa;
          padding: 12pt;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          margin: 10pt 0;
        }
        strong {
          color: #2c5530;
          font-weight: bold;
        }
        em {
          color: #7f8c8d;
          font-style: italic;
        }
        .page-break {
          page-break-before: always;
        }
        .no-break {
          page-break-inside: avoid;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15pt 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8pt;
          text-align: left;
        }
        th {
          background-color: #f8f9fa;
          font-weight: bold;
        }
        @media print {
          body { 
            font-size: 11pt;
            line-height: 1.6;
          }
          .no-print { display: none; }
          h1 { font-size: 16pt; }
          h2 { font-size: 14pt; }
          h3 { font-size: 12pt; }
        }
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `;
  
  printWindow.document.write(htmlDocument);
  printWindow.document.close();
  
  // Wait for content to load then trigger print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };
};
