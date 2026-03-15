import { useEffect, useState, useRef } from 'react';
import axiosInstance from '../api/axiosInstance';
import { io } from 'socket.io-client';

// Singleton socket instance for slots (separate from chat)
let socket = null;

export default function useEventSlots(eventId) {
  const [slotInfo, setSlotInfo] = useState({
    availableSlots: null,
    maxVolunteers: null,
    unlimitedVolunteers: false,
    loading: true,
  });
  const joinedRoomRef = useRef(false);

  // Handle recurring event instances - use original event ID for API calls
  const getEffectiveEventId = (id) => {
    // If it's a recurring instance ID (contains '_recurring_'), extract the original event ID
    if (id && id.includes('_recurring_')) {
      return id.split('_recurring_')[0];
    }
    return id;
  };

  const effectiveEventId = getEffectiveEventId(eventId);

  useEffect(() => {
    if (!effectiveEventId) return;
    let isMounted = true;
    setSlotInfo((prev) => ({ ...prev, loading: true }));

    // Fetch initial slot info using the effective event ID
    axiosInstance.get(`/api/events/${effectiveEventId}/slots`)
      .then(res => {
        if (isMounted) {
          setSlotInfo({ ...res.data, loading: false });
        }
      })
      .catch(() => {
        if (isMounted) {
          setSlotInfo((prev) => ({ ...prev, loading: false }));
        }
      });

    // Setup socket connection if not already
    if (!socket) {
      socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
        auth: { token: localStorage.getItem('token') },
        autoConnect: true,
      });
    }

    // Join the slot update room using the effective event ID
    if (socket && !joinedRoomRef.current) {
      socket.emit('joinEventSlotsRoom', effectiveEventId);
      joinedRoomRef.current = true;
    }

    // Listen for slotsUpdated events
    const handleSlotsUpdated = (data) => {
      if (data.eventId === effectiveEventId && isMounted) {
        setSlotInfo({
          availableSlots: data.availableSlots,
          maxVolunteers: data.maxVolunteers,
          unlimitedVolunteers: data.unlimitedVolunteers,
          loading: false,
        });
      }
    };
    socket.on('slotsUpdated', handleSlotsUpdated);

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (socket && joinedRoomRef.current) {
        socket.emit('leaveEventSlotsRoom', effectiveEventId);
        joinedRoomRef.current = false;
      }
      socket.off('slotsUpdated', handleSlotsUpdated);
    };
    // eslint-disable-next-line
  }, [effectiveEventId]);

  return slotInfo;
} 