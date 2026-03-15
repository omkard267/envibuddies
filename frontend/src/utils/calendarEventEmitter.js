// Simple event emitter for calendar updates
class CalendarEventEmitter {
  constructor() {
    this.listeners = new Map();
  }

  // Subscribe to calendar updates
  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  // Emit calendar update event
  emit(eventType, data) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in calendar event listener:', error);
        }
      });
    }
  }

  // Notify that calendar should refresh
  notifyCalendarRefresh() {
    this.emit('calendarRefresh', { timestamp: Date.now() });
  }

  // Notify that specific event was added/removed
  notifyEventChange(eventId, action) {
    this.emit('eventChange', { eventId, action, timestamp: Date.now() });
  }
}

// Create singleton instance
const calendarEventEmitter = new CalendarEventEmitter();

export default calendarEventEmitter; 