// Simple toast notification system
class ToastNotification {
  constructor() {
    this.createToastContainer();
  }

  createToastContainer() {
    try {
      // Check if container already exists
      if (document.getElementById('toast-container')) {
        return;
      }

      const container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2';
      document.body.appendChild(container);
    } catch (error) {
      console.error('Error creating toast container:', error);
      // Fallback to console.log if DOM manipulation fails
      this.fallbackMode = true;
    }
  }

  show(message, type = 'success', duration = 3000) {
    try {
      // Fallback to console if DOM manipulation fails
      if (this.fallbackMode) {
        console.log(`[${type.toUpperCase()}] ${message}`);
        return;
      }

      const toast = document.createElement('div');
      
      // Define colors and icons for different types
      const typeConfig = {
        success: { bgColor: 'bg-green-500', icon: '✓' },
        error: { bgColor: 'bg-red-500', icon: '✕' },
        warning: { bgColor: 'bg-yellow-500', icon: '⚠' },
        info: { bgColor: 'bg-blue-500', icon: 'ℹ' }
      };
      
      const config = typeConfig[type] || typeConfig.success;
      
      toast.className = `${config.bgColor} text-white px-4 py-2 rounded-lg shadow-lg flex items-start gap-2 transform translate-x-full transition-transform duration-300 min-w-[300px] max-w-[400px]`;
      toast.innerHTML = `
        <span class="font-bold text-lg flex-shrink-0 mt-0.5">${config.icon}</span>
        <span class="flex-1 break-words leading-relaxed">${message}</span>
        <button class="text-white hover:text-gray-200 ml-2 flex-shrink-0">×</button>
      `;

      // Add click event listener to close button
      const closeButton = toast.querySelector('button');
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        });
      }

      const container = document.getElementById('toast-container');
      if (container) {
        container.appendChild(toast);

        // Animate in
        setTimeout(() => {
          if (toast.parentNode) {
            toast.classList.remove('translate-x-full');
          }
        }, 100);

        // Auto-remove after duration
        setTimeout(() => {
          if (toast.parentNode) {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
              if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
              }
            }, 300);
          }
        }, duration);
      } else {
        // Fallback if container doesn't exist
        console.log(`[${type.toUpperCase()}] ${message}`);
      }
    } catch (error) {
      console.error('Error showing toast:', error);
      // Fallback to console.log
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  success(message, duration = 3000) {
    this.show(message, 'success', duration);
  }

  error(message, duration = 4000) {
    this.show(message, 'error', duration);
  }

  warning(message, duration = 3500) {
    this.show(message, 'warning', duration);
  }

  info(message, duration = 3000) {
    this.show(message, 'info', duration);
  }
}

// Create singleton instance
const toastNotification = new ToastNotification();

export default toastNotification; 