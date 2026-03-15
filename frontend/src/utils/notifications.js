import toastNotification from './toastNotification';

// Create showAlert as both a function and an object with methods
export const showAlert = (message, type = 'info') => {
  // Handle function calls like showAlert(message)
  if (type === 'info') {
    toastNotification.show(message, 'info');
  } else {
    toastNotification.show(message, type);
  }
};

// Add methods to the showAlert function
showAlert.info = (message) => {
  toastNotification.show(message, 'info');
};

showAlert.success = (message) => {
  toastNotification.success(message);
};

showAlert.warning = (message) => {
  toastNotification.show(message, 'warning');
};

showAlert.error = (message) => {
  toastNotification.error(message);
};

showAlert.message = (message, type = 'info') => {
  switch (type) {
    case 'success':
      toastNotification.success(message);
      break;
    case 'warning':
      toastNotification.show(message, 'warning');
      break;
    case 'error':
      toastNotification.error(message);
      break;
    default:
      toastNotification.show(message, 'info');
  }
};

// Loading state support (simplified - just shows info message)
showAlert.loading = (message) => {
  toastNotification.show(message, 'info');
  // Return a simple ID for dismiss functionality
  return 'loading-' + Date.now();
};

// QR Code specific loading notifications
showAlert.qrGenerating = (message = 'Generating QR code...') => {
  toastNotification.show(message, 'info');
  return 'qr-generating-' + Date.now();
};

showAlert.qrDeleting = (message = 'Deleting QR code...') => {
  toastNotification.show(message, 'info');
  return 'qr-deleting-' + Date.now();
};

showAlert.qrUploading = (message = 'Uploading QR code to Cloudinary...') => {
  toastNotification.show(message, 'info');
  return 'qr-uploading-' + Date.now();
};

// Profile Update specific loading notifications
showAlert.profileUpdating = (message = 'Updating profile...') => {
  toastNotification.show(message, 'info');
  return 'profile-updating-' + Date.now();
};

showAlert.profileImageUploading = (message = 'Uploading profile image to Cloudinary...') => {
  toastNotification.show(message, 'info');
  return 'profile-image-uploading-' + Date.now();
};

showAlert.profileImageDeleting = (message = 'Deleting profile image from Cloudinary...') => {
  toastNotification.show(message, 'info');
  return 'profile-image-deleting-' + Date.now();
};

showAlert.documentUploading = (message = 'Uploading document to Cloudinary...') => {
  toastNotification.show(message, 'info');
  return 'document-uploading-' + Date.now();
};

showAlert.documentDeleting = (message = 'Deleting document from Cloudinary...') => {
  toastNotification.show(message, 'info');
  return 'document-deleting-' + Date.now();
};

// Organization document upload notifications
showAlert.organizationLogoUploading = (message = 'Uploading organization logo to Cloudinary...') => {
  toastNotification.show(message, 'info');
  return 'org-logo-uploading-' + Date.now();
};

showAlert.organizationDocumentUploading = (message = 'Uploading organization document to Cloudinary...') => {
  toastNotification.show(message, 'info');
  return 'org-doc-uploading-' + Date.now();
};

// Sponsor document upload notifications
showAlert.sponsorLogoUploading = (message = 'Uploading sponsor logo to Cloudinary...') => {
  toastNotification.show(message, 'info');
  return 'sponsor-logo-uploading-' + Date.now();
};

showAlert.sponsorDocumentUploading = (message = 'Uploading sponsor document to Cloudinary...') => {
  toastNotification.show(message, 'info');
  return 'sponsor-doc-uploading-' + Date.now();
};

// Dismiss functionality (simplified - just logs for now)
showAlert.dismiss = (toastId) => {
  console.log('Dismissing toast:', toastId);
  // In our simple system, we can't actually dismiss, but we can log it
};

// Replace confirm() calls with confirmation modals
export const showConfirm = {
  // Default confirmation - backward compatible
  action: (message, onConfirm, onCancelOrOptions, options = {}) => {
    // Handle backward compatibility
    let onCancel = null;
    let finalOptions = options;
    
    // If third parameter is a function, it's onCancel
    // If third parameter is an object, it's options (old API)
    if (typeof onCancelOrOptions === 'function') {
      onCancel = onCancelOrOptions;
      finalOptions = options;
    } else if (typeof onCancelOrOptions === 'object') {
      finalOptions = onCancelOrOptions;
    }
    
    const {
      title = "Confirm Action",
      confirmText = "Confirm",
      cancelText = "Cancel",
      type = "default",
      icon = null
    } = finalOptions;
    
    // Create a custom confirmation modal
    createConfirmationModal({
      message,
      onConfirm,
      onCancel,
      title,
      confirmText,
      cancelText,
      type,
      icon
    });
  },
  
  // Dangerous action confirmation - backward compatible
  danger: (message, onConfirm, onCancelOrOptions, options = {}) => {
    showConfirm.action(message, onConfirm, onCancelOrOptions, {
      ...options,
      title: options.title || "Confirm Dangerous Action",
      type: "danger"
    });
  },
  
  // Warning confirmation - backward compatible
  warning: (message, onConfirm, onCancelOrOptions, options = {}) => {
    showConfirm.action(message, onConfirm, onCancelOrOptions, {
      ...options,
      title: options.title || "Confirm Action",
      type: "warning"
    });
  },
  
  // Info confirmation - backward compatible
  info: (message, onConfirm, onCancelOrOptions, options = {}) => {
    showConfirm.action(message, onConfirm, onCancelOrOptions, {
      ...options,
      title: options.title || "Confirm Action",
      type: "info"
    });
  }
};

// Function to create and show confirmation modal
function createConfirmationModal({
  message,
  onConfirm,
  onCancel,
  title = "Confirm Action",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "default",
  icon = null
}) {
  try {
    // Remove any existing modal first
    const existingModal = document.getElementById('confirmation-modal-container');
    if (existingModal) {
      existingModal.remove();
    }

    // Create new modal container
    const modalContainer = document.createElement('div');
    modalContainer.id = 'confirmation-modal-container';
    
    // Create modal HTML with unique IDs
    const uniqueId = Date.now();
    const modalHTML = `
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; overflow-y: auto;">
        <div style="display: flex; min-height: 100vh; align-items: center; justify-content: center; padding: 1rem; text-align: center;">
          <!-- Backdrop -->
          <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(107, 114, 128, 0.75); z-index: 9998;" id="confirmation-backdrop-${uniqueId}"></div>
          
          <!-- Modal -->
          <div style="position: relative; transform: none; overflow: hidden; border-radius: 0.5rem; background-color: white; text-align: left; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); z-index: 9999; max-width: 32rem; width: 100%; margin: 2rem auto;">
            <!-- Header -->
            <div style="background-color: white; padding: 1rem 1rem 1rem 1rem;">
              <div style="display: flex; align-items: flex-start;">
                <div style="margin: 0 auto; display: flex; height: 3rem; width: 3rem; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 9999px; background-color: rgb(243, 244, 246);">
                  ${getIconHTML(type, icon)}
                </div>
                <div style="margin-top: 0.75rem; text-align: center;">
                  <h3 style="font-size: 1.125rem; font-weight: 500; line-height: 1.5; color: rgb(17, 24, 39);">
                    ${title}
                  </h3>
                  <div style="margin-top: 0.5rem;">
                    <p style="font-size: 0.875rem; color: rgb(107, 114, 128);">
                      ${message}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Footer -->
            <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="button"
                class="inline-flex w-full justify-center rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm transition-colors duration-200 ${getConfirmButtonClass(type)}"
                id="confirmation-confirm-btn-${uniqueId}"
              >
                ${confirmText}
              </button>
              <button
                type="button"
                class="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors duration-200"
                id="confirmation-cancel-btn-${uniqueId}"
              >
                ${cancelText}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Insert modal into body
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
    


    // Wait for DOM to be ready, then add event listeners
    setTimeout(() => {
      const confirmBtn = document.getElementById(`confirmation-confirm-btn-${uniqueId}`);
      const cancelBtn = document.getElementById(`confirmation-cancel-btn-${uniqueId}`);
      const backdrop = document.getElementById(`confirmation-backdrop-${uniqueId}`);

      const closeModal = () => {
        if (modalContainer && modalContainer.parentNode) {
          modalContainer.parentNode.removeChild(modalContainer);
        }
      };

      const handleConfirm = () => {
        try {
          onConfirm();
        } catch (error) {
          console.error('Error in confirmation callback:', error);
        }
        closeModal();
      };

      const handleCancel = () => {
        if (onCancel) {
          try {
            onCancel();
          } catch (error) {
            console.error('Error in cancel callback:', error);
          }
        }
        closeModal();
      };

      // Handle escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          handleCancel();
        }
      };
      document.addEventListener('keydown', handleEscape);

      // Clean up escape key listener when modal closes
      const cleanup = () => {
        document.removeEventListener('keydown', handleEscape);
      };
      
      // Create wrapped handlers with cleanup
      const wrappedHandleConfirm = () => {
        cleanup();
        handleConfirm();
      };
      
      const wrappedHandleCancel = () => {
        cleanup();
        handleCancel();
      };

      // Add event listeners with wrapped handlers
      if (confirmBtn) {
        confirmBtn.addEventListener('click', wrappedHandleConfirm, { once: true });
      } else {
        console.error('Confirm button not found');
      }
      
      if (cancelBtn) {
        cancelBtn.addEventListener('click', wrappedHandleCancel, { once: true });
      } else {
        console.error('Cancel button not found');
      }
      
      if (backdrop) {
        backdrop.addEventListener('click', wrappedHandleCancel, { once: true });
      } else {
        console.error('Backdrop not found');
      }

    }, 50); // Small delay to ensure DOM is ready

  } catch (error) {
    console.error('Error creating confirmation modal:', error);
    // Fallback to window.confirm
    if (window.confirm(message)) {
      try {
        onConfirm();
      } catch (error) {
        console.error('Error in confirmation callback:', error);
      }
    }
  }
}

// Helper function to get icon HTML
function getIconHTML(type, customIcon) {
  if (customIcon) return customIcon;
  
  switch (type) {
    case 'danger':
      return `<svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>`;
    case 'warning':
      return `<svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>`;
    case 'info':
      return `<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>`;
    default:
      return `<svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>`;
  }
}

// Helper function to get confirm button style
function getConfirmButtonStyle(type) {
  switch (type) {
    case 'danger':
      return 'background-color: rgb(220, 38, 38);';
    case 'warning':
      return 'background-color: rgb(202, 138, 4);';
    case 'info':
      return 'background-color: rgb(37, 99, 235);';
    default:
      return 'background-color: rgb(37, 99, 235);';
  }
}

// Helper function to get confirm button class (legacy)
function getConfirmButtonClass(type) {
  switch (type) {
    case 'danger':
      return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
    case 'warning':
      return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-blue-500';
    case 'info':
      return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
    default:
      return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
  }
}

// Legacy support - direct replacements for alert() and confirm()
export const alert = showAlert.message;
export const confirm = showConfirm.action;

// Export toast functions for direct use
export { toastNotification as showToast };
