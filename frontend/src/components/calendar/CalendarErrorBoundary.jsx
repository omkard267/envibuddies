import React from 'react';

class CalendarErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Calendar Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Calendar Loading Error
            </h3>
            <p className="text-gray-600 mb-4">
              There was an issue loading the calendar. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CalendarErrorBoundary; 