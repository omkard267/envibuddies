/**
 * Date utility functions for consistent formatting across the project
 */

/**
 * Format date as DD/MM/YYYY
 * @param {string|Date} date - Date string or Date object
 * @returns {string} Formatted date as DD/MM/YYYY
 */
export const formatDate = (date) => {
  if (!date) return 'Not available';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'Invalid date';
  
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  
  return `${day}/${month}/${year}`;
};

/**
 * Format date and time as DD/MM/YYYY HH:MM:SS
 * @param {string|Date} date - Date string or Date object
 * @returns {string} Formatted date and time as DD/MM/YYYY HH:MM:SS
 */
export const formatDateTime = (date) => {
  if (!date) return 'Not available';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'Invalid date';
  
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  const seconds = dateObj.getSeconds().toString().padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

/**
 * Format time only as HH:MM:SS
 * @param {string|Date} date - Date string or Date object
 * @returns {string} Formatted time as HH:MM:SS
 */
export const formatTime = (date) => {
  if (!date) return 'Not available';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'Invalid date';
  
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  const seconds = dateObj.getSeconds().toString().padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Format date for display with custom options
 * @param {string|Date} date - Date string or Date object
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
export const formatDateCustom = (date, options = {}) => {
  if (!date) return 'Not available';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'Invalid date';
  
  const defaultOptions = {
    showTime: false,
    showSeconds: false,
    ...options
  };
  
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  
  let result = `${day}/${month}/${year}`;
  
  if (defaultOptions.showTime) {
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    result += ` ${hours}:${minutes}`;
    
    if (defaultOptions.showSeconds) {
      const seconds = dateObj.getSeconds().toString().padStart(2, '0');
      result += `:${seconds}`;
    }
  }
  
  return result;
};
