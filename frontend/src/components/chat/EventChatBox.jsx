import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { format } from 'date-fns';
import { FaThumbtack, FaSmile } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io';
import { FiEdit2 } from 'react-icons/fi';
import { MdDelete } from 'react-icons/md';
import EmojiPicker from 'emoji-picker-react';
import { getProfileImageUrl, getAvatarInitial, getRoleColors } from '../../utils/avatarUtils';
import { getSafeUserData, getDisplayName } from '../../utils/safeUserUtils';
import { useChatContext } from '../../context/ChatContext';

import { showAlert } from '../../utils/notifications';

// Remove the local utility functions since we're now importing them
// const getSafeUserData = (user) => { ... }
// const getDisplayName = (user) => { ... }


const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
  autoConnect: false,
  auth: {
    token: localStorage.getItem('token')
  },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

export default function EventChatbox({ eventId, currentUser }) {
  const navigate = useNavigate();
  const { openEventChat, closeEventChat, eventChatOpen, rootChatOpen } = useChatContext();
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [pinnedMessage, setPinnedMessage] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [fileToSend, setFileToSend] = useState(null); // <-- Add state for selected file
  const [typingUsers, setTypingUsers] = useState({});
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState(null);
  const [showInputEmojiPicker, setShowInputEmojiPicker] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [unsendConfirm, setUnsendConfirm] = useState({ show: false, msg: null });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Enhanced file upload state management
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadStatus, setUploadStatus] = useState({});
  const [isUploading, setIsUploading] = useState(false);

  // File download and management state
  const [downloadProgress, setDownloadProgress] = useState({});
  const [downloadStatus, setDownloadStatus] = useState({});
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadQueue, setDownloadQueue] = useState([]);
  const [filePreviewMode, setFilePreviewMode] = useState({});

  // File search, filtering, and organization state
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [fileFilterType, setFileFilterType] = useState('all');
  const [fileFilterDate, setFileFilterDate] = useState('all');
  const [fileFilterSender, setFileFilterSender] = useState('all');
  const [showFileManager, setShowFileManager] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileManagerView, setFileManagerView] = useState('grid'); // 'grid' or 'list'

  // Use context state instead of local state
  const isChatOpen = eventChatOpen;

  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const firstMsgRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const isLoadingEarlierRef = useRef(false);

  // --- Chat UI Positioning Constants ---
  const PADDING = 37; // 24px from right edge (same as root chatbot)
  const GAP = 60; // Gap between root chatbot and event chatbox
  const BUBBLE_DIMS = { w: 64, h: 64 };
  const CHATBOX_DIMS = { w: 384, h: 500 };
  
  // Function to calculate default position - ensures consistent positioning
  const calculateDefaultPosition = () => {
    // Root chatbot is positioned at bottom-6 right-6 (24px from bottom and right edges)
    // Event chatbox should be positioned above it with an 80px gap for visual separation
    // This creates a clean vertical alignment while maintaining proper spacing
    return {
      x: window.innerWidth - BUBBLE_DIMS.w - PADDING, // 24px from right edge (same as root chatbot)
      y: window.innerHeight - BUBBLE_DIMS.h - PADDING - GAP, // 80px above root chatbot position
    };
  };
  
  // Unified draggable chat position state
  const [chatPos, setChatPos] = useState(() => calculateDefaultPosition());
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const bubbleRef = useRef(null);

  // Function to reset position to default
  const resetToDefaultPosition = () => {
    const newDefaultPos = calculateDefaultPosition();
    setChatPos(newDefaultPos);
  };

  // Update default position when window resizes
  useEffect(() => {
    const updateDefaultPosition = () => {
      const newDefaultPos = calculateDefaultPosition();
      
      // Only update if chat is closed (bubble mode)
      if (!eventChatOpen) {
        setChatPos(newDefaultPos);
      }
    };

    window.addEventListener('resize', updateDefaultPosition);
    return () => window.removeEventListener('resize', updateDefaultPosition);
  }, [eventChatOpen]);

  // Ensure proper positioning on mount and when component updates
  useEffect(() => {
    // Small delay to ensure window dimensions are accurate
    const timer = setTimeout(() => {
      if (!eventChatOpen) {
        resetToDefaultPosition();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [eventChatOpen]); // Run when eventChatOpen changes

  // Handle mouse/touch events for dragging (bubble or header)
  const startDrag = (e) => {
    // Only prevent default for mouse events, not touch events
    if (e.type === 'mousedown') {
      e.preventDefault();
    }
    setDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragOffset({
      x: clientX - chatPos.x,
      y: clientY - chatPos.y,
    });
  };

  const onDrag = (e) => {
    if (!dragging) return;
    // Prevent default for touch events to stop scrolling
    if (e.type === 'touchmove') {
      e.preventDefault();
    }
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    let newX = clientX - dragOffset.x;
    let newY = clientY - dragOffset.y;
    
    // Clamp to window bounds
    const maxW = eventChatOpen ? CHATBOX_DIMS.w : BUBBLE_DIMS.w;
    const maxH = eventChatOpen ? CHATBOX_DIMS.h : BUBBLE_DIMS.h;
    newX = Math.max(0, Math.min(window.innerWidth - maxW, newX));
    newY = Math.max(0, Math.min(window.innerHeight - maxH, newY));
    
    setChatPos({ x: newX, y: newY });
  };

  const stopDrag = () => {
    setDragging(false);
    // Only save position if the chat window was dragged
    if (eventChatOpen) {
      localStorage.setItem('chatPosition', JSON.stringify(chatPos));
    }
  };

  // Load saved chat position on mount (only for chat window, not bubble)
  useEffect(() => {
    const savedPosition = localStorage.getItem('chatPosition');
    if (savedPosition && eventChatOpen) {
      try {
        const parsed = JSON.parse(savedPosition);
        // Validate the saved position is within bounds
        const maxW = window.innerWidth - CHATBOX_DIMS.w;
        const maxH = window.innerHeight - CHATBOX_DIMS.h;
        if (parsed.x >= 0 && parsed.x <= maxW && parsed.y >= 0 && parsed.y <= maxH) {
          setChatPos(parsed);
        }
      } catch (error) {
        console.warn('Failed to parse saved chat position:', error);
      }
    }
  }, [eventChatOpen]);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', onDrag);
      window.addEventListener('mouseup', stopDrag);
      // Use non-passive listeners for touch events to allow preventDefault
      window.addEventListener('touchmove', onDrag, { passive: false });
      window.addEventListener('touchend', stopDrag);
    } else {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchmove', onDrag);
      window.removeEventListener('touchend', stopDrag);
    }
    return () => {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchmove', onDrag);
      window.removeEventListener('touchend', stopDrag);
    };
  }, [dragging, dragOffset, chatPos]);

  // Clamp chatPos on window resize
  useEffect(() => {
    const handleResize = () => {
      setChatPos(pos => {
        const maxW = eventChatOpen ? CHATBOX_DIMS.w : BUBBLE_DIMS.w;
        const maxH = eventChatOpen ? CHATBOX_DIMS.h : BUBBLE_DIMS.h;
        return {
          x: Math.max(0, Math.min(window.innerWidth - maxW, pos.x)),
          y: Math.max(0, Math.min(window.innerHeight - maxH, pos.y)),
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [eventChatOpen]);

  const EMOJIS = ['👍', '❤️', '😂', '🎉', '🙏', '😢'];

  // Reset upload states when needed
  const resetUploadStates = () => {
    setUploadProgress({});
    setUploadStatus({});
    setIsUploading(false);
  };

  // Reset download states when needed
  const resetDownloadStates = () => {
    setDownloadProgress({});
    setDownloadStatus({});
    setIsDownloading(false);
    setDownloadQueue([]);
  };

  // Reset file manager states when needed
  const resetFileManagerStates = () => {
    setFileSearchQuery('');
    setFileFilterType('all');
    setFileFilterDate('all');
    setFileFilterSender('all');
    setShowFileManager(false);
    setSelectedFiles([]);
    setFileManagerView('grid');
  };

  // Fetch chat messages (moved outside useEffect for access in handlers)
  const fetchMessages = async (opts = {}) => {
    try {
      let url = `/api/chatbox/events/${eventId}/messages?limit=20`;
      if (opts.before) url += `&before=${opts.before}`;
      const res = await axiosInstance.get(url);
      const newMessages = res.data;
      if (opts.before) {
        // Prepend older messages
        setMessages(prev => [...newMessages, ...prev]);
      } else {
        setMessages(newMessages);
      }
      setPinnedMessage((prev) => {
        // If loading earlier, keep the current pinned message; else, find in new batch
        return opts.before ? prev : newMessages.find(m => m.isPinned) || null;
      });
      setHasMore(newMessages.length === 20); // If we got a full batch, there may be more
      setIsInitialLoad(false);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
      setIsInitialLoad(false); // Also set on error to avoid getting stuck
    }
  };

  useEffect(() => {
    // Fetch initial chat history
    fetchMessages();

    // Connect and set up socket listeners
    if (!socket.connected) {
      socket.connect();
    }
    
    socket.on('connect', () => {
      // Small delay to ensure connection is stable
      setTimeout(() => {
        socket.emit('joinEventRoom', eventId);
      }, 100);
    });

    const receiveMessageHandler = (message) => {
      // 1. Robustly get the sender's ID, whether userId is a string or an object.
      const senderId = typeof message.userId === 'object' && message.userId !== null
        ? message.userId._id
        : message.userId;


      // 2. The 'isFromMe' check now works reliably.
      const isFromMe = String(senderId) === String(currentUser._id);

      const container = chatContainerRef.current;
      let isNearBottom = true;
      if (container) {
        isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      }

      setMessages((prev) => [...prev, message]);

      // 3. This condition will now be true when you send a message.
      if (isFromMe || isNearBottom) {
        // This is the new, more reliable scroll logic
        setTimeout(() => {
          const chatContainer = chatContainerRef.current;
          if (chatContainer) {
            // Directly set the scroll position to the bottom
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }
        }, 50); // Increased timeout to ensure rendering is complete
      }
    };

    socket.on('receiveMessage', receiveMessageHandler);

    const messagePinnedHandler = (updatedMessage) => {
      setMessages(prevMsgs => prevMsgs.map(m =>
        m._id === updatedMessage._id ? { ...m, isPinned: updatedMessage.isPinned } : m
      ));
      setPinnedMessage(updatedMessage.isPinned ? updatedMessage : null);
    };

    socket.on('messagePinned', messagePinnedHandler);

    const reactionUpdateHandler = (updatedMessage) => {
      setMessages(prevMsgs =>
        prevMsgs.map(m => (m._id === updatedMessage._id ? updatedMessage : m))
      );
      if (pinnedMessage && pinnedMessage._id === updatedMessage._id) {
        setPinnedMessage(updatedMessage);
      }
    };

    socket.on('messageReactionUpdate', reactionUpdateHandler);

    const userTypingHandler = ({ userId, userName }) => {
      if (userId !== currentUser._id) {
        setTypingUsers((prev) => ({ ...prev, [userId]: userName }));
      }
    };

    const userStoppedTypingHandler = ({ userId }) => {
      setTypingUsers((prev) => {
        const newTypingUsers = { ...prev };
        delete newTypingUsers[userId];
        return newTypingUsers;
      });
    };

    socket.on('userTyping', userTypingHandler);
    socket.on('userStoppedTyping', userStoppedTypingHandler);

    const messageEditedHandler = (updatedMessage) => {
      setMessages(prevMsgs => prevMsgs.map(m => m._id === updatedMessage._id ? updatedMessage : m));
      if (pinnedMessage && pinnedMessage._id === updatedMessage._id) {
        setPinnedMessage(updatedMessage);
      }
      setEditingMessageId(null);
      setEditingText('');
    };
    socket.on('messageEdited', messageEditedHandler);

    const messageUnsentHandler = ({ messageId }) => {
      setMessages(prevMsgs => prevMsgs.filter(m => m._id !== messageId));
      if (pinnedMessage && pinnedMessage._id === messageId) setPinnedMessage(null);
    };
    socket.on('messageUnsent', messageUnsentHandler);

    return () => {
      // Only cleanup event listeners, don't disconnect the socket
      // The socket will be managed by the singleton pattern
      socket.emit('leaveEventRoom', eventId);
      socket.off('receiveMessage', receiveMessageHandler);
      socket.off('messagePinned', messagePinnedHandler);
      socket.off('messageReactionUpdate', reactionUpdateHandler);
      socket.off('userTyping', userTypingHandler);
      socket.off('userStoppedTyping', userStoppedTypingHandler);
      socket.off('messageEdited', messageEditedHandler);
      socket.off('messageUnsent', messageUnsentHandler);
      
      // Clean up download states
      resetDownloadStates();
      
      // Clean up file manager states
      resetFileManagerStates();
    };
  }, [eventId, currentUser._id]);

  useEffect(() => {
    // When chatbox is opened, scroll to bottom (latest message)
    if (eventChatOpen) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 0);
    }
  }, [eventChatOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPickerFor(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcuts for file manager
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ctrl/Cmd + F to toggle file manager
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        setShowFileManager(prev => !prev);
      }
      // Escape to close file manager
      if (event.key === 'Escape' && showFileManager) {
        setShowFileManager(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showFileManager]);

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    socket.emit('typing', { eventId, userName: currentUser.username || currentUser.name || 'User' });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stopTyping', eventId);
    }, 2000); // 2 seconds of inactivity
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (fileToSend) {
      // Handle file message with enhanced progress tracking
      const fileName = fileToSend.name;
      const formData = new FormData();
      formData.append('file', fileToSend);
      
      // Initialize upload progress and status
      setUploadProgress(prev => ({ ...prev, [fileName]: 0 }));
      setUploadStatus(prev => ({ ...prev, [fileName]: 'uploading' }));
      setIsUploading(true);
      
      try {
        // Simulate upload progress (in real implementation, this would come from Cloudinary)
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            const current = prev[fileName] || 0;
            if (current >= 90) {
              clearInterval(progressInterval);
              return { ...prev, [fileName]: 90 };
            }
            return { ...prev, [fileName]: current + 10 };
          });
        }, 100);

        const res = await axiosInstance.post('/api/chatbox/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        
        // Clear progress interval
        clearInterval(progressInterval);
        
        const { fileUrl, fileType } = res.data;
        
        if (!fileUrl || !fileUrl.url) {
          showAlert.error("Invalid response from server. Please try again.");
          setUploadStatus(prev => ({ ...prev, [fileName]: 'error' }));
          return;
        }
        
        // Mark upload as successful
        setUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
        setUploadStatus(prev => ({ ...prev, [fileName]: 'completed' }));
        
        socket.emit('sendMessage', { eventId, fileUrl, fileType, message: fileToSend.name, replyTo: replyToMessage?._id });
        setFileToSend(null); // Clear file after sending
        setReplyToMessage(null);
        
        // Clear upload states after a short delay
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileName];
            return newProgress;
          });
          setUploadStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[fileName];
            return newStatus;
          });
          setIsUploading(false);
        }, 1000);
        
        showAlert.success(`File "${fileName}" uploaded successfully and sent to chat!`);
      } catch (err) {
        console.error("File upload failed:", err);
        let errorMessage = "File upload failed. Please try again.";
        let errorType = 'error';
        
        // Enhanced error handling with specific messages
        if (err.response?.status === 413) {
          errorMessage = "File too large. Please upload a file smaller than 10MB.";
          errorType = 'warning';
        } else if (err.response?.status === 400) {
          errorMessage = "Invalid file type. Please upload images, PDFs, or common document types.";
          errorType = 'warning';
        } else if (err.response?.status === 401) {
          errorMessage = "Authentication required. Please log in again.";
          errorType = 'error';
        } else if (err.response?.status === 403) {
          errorMessage = "Permission denied. You may not have access to upload files.";
          errorType = 'error';
        } else if (err.response?.status === 429) {
          errorMessage = "Too many uploads. Please wait a moment before trying again.";
          errorType = 'warning';
        } else if (err.response?.status >= 500) {
          errorMessage = "Server error. Please try again in a few minutes.";
          errorType = 'error';
        } else if (err.code === 'NETWORK_ERROR' || err.message?.includes('Network Error')) {
          errorMessage = "Network error. Please check your connection and try again.";
          errorType = 'error';
        } else if (err.message?.includes('timeout')) {
          errorMessage = "Upload timeout. Please try again with a smaller file or check your connection.";
          errorType = 'warning';
        } else if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
          errorType = 'error';
        }
        
        // Mark upload as failed
        setUploadStatus(prev => ({ ...prev, [fileName]: 'error' }));
        setUploadProgress(prev => ({ ...prev, [fileName]: 0 }));
        
        // Show appropriate error message
        if (errorType === 'warning') {
          showAlert.warning(errorMessage);
        } else {
          showAlert.error(errorMessage);
        }
        
        // Keep error state visible for longer to allow retry
        setTimeout(() => {
          // Only clear if user hasn't retried
          if (uploadStatus[fileName] === 'error') {
            setUploadProgress(prev => {
              const newProgress = { ...prev };
              delete newProgress[fileName];
              return newProgress;
            });
            setUploadStatus(prev => {
              const newStatus = { ...prev };
              delete newStatus[fileName];
              return newStatus;
            });
            setIsUploading(false);
          }
        }, 5000); // Keep error visible for 5 seconds
      }
    } else if (newMessage.trim()) {
      // Handle text message
      socket.emit('sendMessage', { eventId, message: newMessage, replyTo: replyToMessage?._id });
      socket.emit('stopTyping', eventId);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setNewMessage('');
      setReplyToMessage(null);
    }
  };

  const handlePinMessage = async (message) => {
    try {
      const res = await axiosInstance.patch(`/api/chatbox/messages/${message._id}/pin`, { eventId });
      // Emit an event to notify all clients (including this one) about the pin status change
      socket.emit('pinMessage', { eventId, message: res.data });
    } catch (err) {
      console.error("Failed to pin message:", err);
      showAlert.warning("Only organizers can pin messages.");
    }
  };

  const handleReaction = (messageId, emoji) => {
    socket.emit('reactToMessage', { eventId, messageId, emoji });
    setShowEmojiPickerFor(null);
  };

  const onEmojiClick = (emojiObject) => {
    setNewMessage(prevInput => prevInput + emojiObject.emoji);
    setShowInputEmojiPicker(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Enhanced file validation with better user feedback
      
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
        showAlert.warning(
          `File "${file.name}" is too large (${fileSizeMB} MB). Maximum size is 10MB. ` +
          `Please compress the file or choose a smaller one.`
        );
        return;
      }
      
      // Validate file type with better descriptions
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        const fileType = file.type || 'unknown';
        const fileName = file.name;
        const fileExtension = fileName.split('.').pop()?.toLowerCase();
        
        let suggestion = '';
        if (fileExtension === 'jpg' || fileExtension === 'jpeg') {
          suggestion = ' Please ensure the file is a valid JPEG image.';
        } else if (fileExtension === 'png') {
          suggestion = ' Please ensure the file is a valid PNG image.';
        } else if (fileExtension === 'pdf') {
          suggestion = ' Please ensure the file is a valid PDF document.';
        } else if (fileExtension === 'doc' || fileExtension === 'docx') {
          suggestion = ' Please ensure the file is a valid Word document.';
        } else if (fileExtension === 'xls' || fileExtension === 'xlsx') {
          suggestion = ' Please ensure the file is a valid Excel spreadsheet.';
        } else if (fileExtension === 'txt') {
          suggestion = ' Please ensure the file is a valid text file.';
        } else {
          suggestion = ' Please convert to a supported format: images (JPG, PNG, GIF, WebP), documents (PDF, Word, Excel), or text files.';
        }
        
        showAlert.warning(
          `File "${fileName}" (${fileType}) is not supported.${suggestion}`
        );
        return;
      }
      
      // File validation passed - show success message
      showAlert.success(
        `File "${file.name}" selected successfully. Ready to upload.`
      );
      
      setFileToSend(file);
      setNewMessage(''); // Clear text when file is selected
    }
  };

  // Cancel ongoing file upload
  const handleCancelUpload = () => {
    if (fileToSend) {
      const fileName = fileToSend.name;
      
      // Clear upload progress and status for this file
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[fileName];
        return newProgress;
      });
      setUploadStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[fileName];
        return newStatus;
      });
      
      // Clear file and reset upload state
      setFileToSend(null);
      setIsUploading(false);
      
      showAlert.info("File upload cancelled");
    }
  };

  // Retry failed upload with enhanced error handling
  const handleRetryUpload = async (fileName) => {
    if (!fileToSend || fileToSend.name !== fileName) {
      showAlert.error("File not found for retry. Please select the file again.");
      return;
    }

    // Reset error state and start fresh upload
    setUploadStatus(prev => ({ ...prev, [fileName]: 'uploading' }));
    setUploadProgress(prev => ({ ...prev, [fileName]: 0 }));
    setIsUploading(true);

    showAlert.info(`Retrying upload for "${fileName}"...`);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const current = prev[fileName] || 0;
          if (current >= 90) {
            clearInterval(progressInterval);
            return { ...prev, [fileName]: 90 };
          }
          return { ...prev, [fileName]: current + 10 };
        });
      }, 100);

      const formData = new FormData();
      formData.append('file', fileToSend);

      const res = await axiosInstance.post('/api/chatbox/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Clear progress interval
      clearInterval(progressInterval);

      const { fileUrl, fileType } = res.data;

      if (!fileUrl || !fileUrl.url) {
        throw new Error("Invalid response from server");
      }

      // Mark upload as successful
      setUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
      setUploadProgress(prev => ({ ...prev, [fileName]: 'completed' }));

      socket.emit('sendMessage', { eventId, fileUrl, fileType, message: fileToSend.name, replyTo: replyToMessage?._id });
      setFileToSend(null);
      setReplyToMessage(null);

      // Clear upload states after success
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileName];
          return newProgress;
        });
        setUploadStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[fileName];
          return newStatus;
        });
        setIsUploading(false);
      }, 1000);

      showAlert.success("File upload retry successful!");
    } catch (err) {
      console.error("Retry upload failed:", err);
      
      // Show retry-specific error message
      let retryMessage = "Retry failed. Please try again or select a different file.";
      
      if (err.response?.status === 413) {
        retryMessage = "File is still too large. Please compress it or choose a smaller file.";
      } else if (err.response?.status === 400) {
        retryMessage = "File format issue persists. Please check the file and try again.";
      } else if (err.response?.status >= 500) {
        retryMessage = "Server is still experiencing issues. Please try again in a few minutes.";
      }
      
      showAlert.error(retryMessage);
      
      // Mark as failed again
      setUploadStatus(prev => ({ ...prev, [fileName]: 'error' }));
      setUploadProgress(prev => ({ ...prev, [fileName]: 0 }));
    }
  };

  const typingDisplay = Object.values(typingUsers).join(', ');

  // Provide helpful upload guidance
  const getUploadGuidance = (errorType) => {
    switch (errorType) {
      case 'size':
        return "Try compressing the file or choosing a smaller one.";
      case 'type':
        return "Convert to supported format: JPG, PNG, PDF, Word, Excel, or TXT.";
      case 'network':
        return "Check your internet connection and try again.";
      case 'server':
        return "Server is busy. Please try again in a few minutes.";
      case 'auth':
        return "Please log in again to continue uploading.";
      default:
        return "Please try again or contact support if the issue persists.";
    }
  };

  // File utility functions
  const getFileTypeInfo = (fileUrl, fileType) => {
    // Handle both string and object fileUrl formats
    const url = typeof fileUrl === 'string' ? fileUrl : fileUrl?.url || '';
    const filename = typeof fileUrl === 'string' ? '' : fileUrl?.filename || '';
    
    if (fileType && fileType.startsWith('image/')) {
      return { icon: '🖼️', label: 'Image', category: 'media' };
    } else if (fileType && fileType.startsWith('application/')) {
      // Extract extension from filename or URL
      const extension = (filename || url).split('.').pop()?.toLowerCase();
      if (extension === 'pdf') return { icon: '📄', label: 'PDF Document', category: 'document' };
      if (['doc', 'docx'].includes(extension)) return { icon: '📝', label: 'Word Document', category: 'document' };
      if (['xls', 'xlsx'].includes(extension)) return { icon: '📊', label: 'Excel Spreadsheet', category: 'document' };
      if (extension === 'txt') return { icon: '📄', label: 'Text File', category: 'document' };
      return { icon: '📎', label: 'Document', category: 'document' };
    }
    return { icon: '📎', label: 'File', category: 'other' };
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileExtension = (filename) => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  const isImageFile = (fileType, filename) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    return fileType && fileType.startsWith('image/') || imageExtensions.includes(getFileExtension(filename));
  };

  const isDocumentFile = (fileType, filename) => {
    const docExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'];
    return fileType && fileType.startsWith('application/') || docExtensions.includes(getFileExtension(filename));
  };

  // File search and filtering utilities
  const getAllFilesFromMessages = () => {
    const files = [];
    messages.forEach(msg => {
      if (msg.fileUrl) {
        files.push({
          id: msg._id,
          fileName: msg.fileUrl.filename || msg.message || 'Unknown file',
          fileUrl: msg.fileUrl.url || msg.fileUrl,
          fileType: msg.fileType || 'unknown',
          fileSize: msg.fileUrl.size || 0,
          sender: msg.userId,
          senderName: getDisplayName(msg.userId),
          timestamp: msg.createdAt,
          messageId: msg._id,
          isPinned: msg.isPinned || false
        });
      }
    });
    return files;
  };

  const filterFiles = (files, searchQuery, filterType, filterDate, filterSender) => {
    let filtered = files;

    // Search by query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(file => 
        file.fileName.toLowerCase().includes(query) ||
        file.senderName.toLowerCase().includes(query) ||
        getFileTypeInfo(file.fileUrl, file.fileType).label.toLowerCase().includes(query)
      );
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(file => {
        if (filterType === 'images') return isImageFile(file.fileType, file.fileName);
        if (filterType === 'documents') return isDocumentFile(file.fileType, file.fileName);
        if (filterType === 'other') return !isImageFile(file.fileType, file.fileName) && !isDocumentFile(file.fileType, file.fileName);
        return true;
      });
    }

    // Filter by date
    if (filterDate !== 'all') {
      const now = new Date();
      const oneDay = 24 * 60 * 60 * 1000;
      const oneWeek = 7 * oneDay;
      const oneMonth = 30 * oneDay;

      filtered = filtered.filter(file => {
        const fileDate = new Date(file.timestamp);
        const diff = now - fileDate;

        if (filterDate === 'today') return diff < oneDay;
        if (filterDate === 'week') return diff < oneWeek;
        if (filterDate === 'month') return diff < oneMonth;
        return true;
      });
    }

    // Filter by sender
    if (filterSender !== 'all') {
      if (filterSender === 'me') {
        filtered = filtered.filter(file => file.sender._id === currentUser._id);
      } else if (filterSender === 'others') {
        filtered = filtered.filter(file => file.sender._id !== currentUser._id);
      }
    }

    return filtered;
  };

  const getFileStatistics = () => {
    const files = getAllFilesFromMessages();
    const totalFiles = files.length;
    
    const byType = {
      images: files.filter(f => isImageFile(f.fileType, f.fileName)).length,
      documents: files.filter(f => isDocumentFile(f.fileType, f.fileName)).length,
      other: files.filter(f => !isImageFile(f.fileType, f.fileName) && !isDocumentFile(f.fileType, f.fileName)).length
    };

    const bySender = {
      me: files.filter(f => f.sender._id === currentUser._id).length,
      others: files.filter(f => f.sender._id !== currentUser._id).length
    };

    return { totalFiles, byType, bySender };
  };

  const sortFiles = (files, sortBy = 'date', sortOrder = 'desc') => {
    const sorted = [...files];
    
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => {
          const nameA = a.fileName.toLowerCase();
          const nameB = b.fileName.toLowerCase();
          return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });
        break;
      case 'size':
        sorted.sort((a, b) => {
          const sizeA = a.fileSize || 0;
          const sizeB = b.fileSize || 0;
          return sortOrder === 'asc' ? sizeA - sizeB : sizeB - sizeA;
        });
        break;
      case 'sender':
        sorted.sort((a, b) => {
          const senderA = a.senderName.toLowerCase();
          const senderB = b.senderName.toLowerCase();
          return sortOrder === 'asc' ? senderA.localeCompare(senderB) : senderB.localeCompare(senderA);
        });
        break;
      case 'date':
      default:
        sorted.sort((a, b) => {
          const dateA = new Date(a.timestamp);
          const dateB = new Date(b.timestamp);
          return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });
        break;
    }
    
    return sorted;
  };

  // Enhanced file download with progress tracking
  const handleFileDownload = async (fileUrl, fileName, fileType) => {
    const fileId = `${fileName}-${Date.now()}`;
    
    // Add to download queue
    setDownloadQueue(prev => [...prev, { id: fileId, fileName, fileUrl, fileType }]);
    setDownloadStatus(prev => ({ ...prev, [fileId]: 'starting' }));
    setDownloadProgress(prev => ({ ...prev, [fileId]: 0 }));
    setIsDownloading(true);

    try {
      showAlert.info(`Starting download of "${fileName}"...`);

      // For Cloudinary URLs, add download parameters to force download
      let downloadUrl = fileUrl;
      if (fileUrl.includes('cloudinary.com')) {
        const separator = fileUrl.includes('?') ? '&' : '?';
        downloadUrl = `${fileUrl}${separator}fl_attachment`;
      }

      // Create a temporary link element for download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      link.style.display = 'none';
      
      // For images, use blob to force download
      if (fileType && fileType.startsWith('image/')) {
        try {
          const response = await fetch(downloadUrl);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          
          link.href = blobUrl;
          link.download = fileName;
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up blob URL
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        } catch (blobError) {
          // Fallback to direct download
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        // For documents, use direct download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // Mark as completed
      setDownloadStatus(prev => ({ ...prev, [fileId]: 'completed' }));
      setDownloadProgress(prev => ({ ...prev, [fileId]: 100 }));
      
      showAlert.success(`"${fileName}" download started!`);

      // Clean up after success
      setTimeout(() => {
        setDownloadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
        setDownloadStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[fileId];
          return newStatus;
        });
        setDownloadQueue(prev => prev.filter(item => item.id !== fileId));
        
        if (downloadQueue.length === 1) {
          setIsDownloading(false);
        }
      }, 2000);

    } catch (error) {
      console.error('Download failed:', error);
      
      setDownloadStatus(prev => ({ ...prev, [fileId]: 'error' }));
      setDownloadProgress(prev => ({ ...prev, [fileId]: 0 }));
      
      let errorMessage = 'Download failed. Please try again.';
      if (error.message.includes('HTTP 404')) {
        errorMessage = 'File not found. It may have been deleted.';
      } else if (error.message.includes('HTTP 403')) {
        errorMessage = 'Access denied. You may not have permission to download this file.';
      } else if (error.message.includes('Network Error')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      showAlert.error(errorMessage);

      // Clean up after error
      setTimeout(() => {
        setDownloadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
        setDownloadStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[fileId];
          return newStatus;
        });
        setDownloadQueue(prev => prev.filter(item => item.id !== fileId));
        
        if (downloadQueue.length === 1) {
          setIsDownloading(false);
        }
      }, 3000);
    }
  };

  // Cancel download
  const handleCancelDownload = (fileId) => {
    setDownloadStatus(prev => ({ ...prev, [fileId]: 'cancelled' }));
    setDownloadProgress(prev => ({ ...prev, [fileId]: 0 }));
    
    // Remove from queue
    setDownloadQueue(prev => prev.filter(item => item.id !== fileId));
    
    if (downloadQueue.length === 1) {
      setIsDownloading(false);
    }
    
    showAlert.info('Download cancelled');
  };

  // Retry download
  const handleRetryDownload = (fileId) => {
    const downloadItem = downloadQueue.find(item => item.id === fileId);
    if (downloadItem) {
      handleFileDownload(downloadItem.fileUrl, downloadItem.fileName, downloadItem.fileType);
    }
  };

  // Bulk file operations
  const handleBulkDownload = async (files) => {
    if (!files || files.length === 0) {
      showAlert.warning('No files selected for download');
      return;
    }

    showAlert.info(`Starting bulk download of ${files.length} files...`);

    // Add all files to download queue
    files.forEach(file => {
      handleFileDownload(file.fileUrl, file.fileName, file.fileType);
    });

    // Clear selection after starting downloads
    setSelectedFiles([]);
  };

  const handleSelectFile = (fileId) => {
    setSelectedFiles(prev => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId);
      } else {
        return [...prev, fileId];
      }
    });
  };

  const handleSelectAllFiles = (files) => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]); // Deselect all
    } else {
      setSelectedFiles(files.map(f => f.id)); // Select all
    }
  };

  const handleClearSelection = () => {
    setSelectedFiles([]);
  };

  const handleEditClick = (msg) => {
    setEditingMessageId(msg._id);
    setEditingText(msg.message);
  };

  const handleEditSave = (msg) => {
    if (editingText.trim() && editingText !== msg.message) {
      socket.emit('editMessage', { eventId, messageId: msg._id, newText: editingText });
    } else {
      setEditingMessageId(null);
      setEditingText('');
    }
  };

  const canEditMessage = (msg) => {
    const safeUser = getSafeUserData(msg.userId);
    if (safeUser.isDeleted || safeUser._id !== currentUser._id) return false;
    if (msg.editCount > 0) return false;
    const now = new Date();
    const created = new Date(msg.createdAt);
    return (now - created) <= 5 * 60 * 1000;
  };

  const canUnsendMessage = (msg) => {
    const safeUser = getSafeUserData(msg.userId);
    if (safeUser.isDeleted || safeUser._id !== currentUser._id) return false;
    const now = new Date();
    const created = new Date(msg.createdAt);
    return (now - created) <= 5 * 60 * 1000;
  };

  const handleUnsendClick = (msg) => {
    setUnsendConfirm({ show: true, msg });
  };

  const handleUnsendConfirm = () => {
    if (unsendConfirm.msg) {
      socket.emit('unsendMessage', { eventId, messageId: unsendConfirm.msg._id });
    }
    setUnsendConfirm({ show: false, msg: null });
  };

  const handleUnsendCancel = () => {
    setUnsendConfirm({ show: false, msg: null });
  };

  const handleUsernameClick = (user) => {
    if (!user || user.isDeleted || !user._id) {
      // Show an alert for deleted users instead of navigation
      showAlert.warning('This user account has been deleted');
      return;
    }
    
    if (user.role === 'organizer') {
      navigate(`/organizer/${user._id}`);
    } else {
      navigate(`/volunteer/${user._id}`);
    }
  };

  const handleBubbleClick = () => {
    setIsChatOpen(prev => !prev);
  };

  const handleLoadEarlier = async () => {
    if (messages.length === 0) return;
    setLoadingEarlier(true);
    // Record scrollHeight and scrollTop before loading
    const container = chatContainerRef.current;
    const prevScrollHeight = container ? container.scrollHeight : 0;
    const prevScrollTop = container ? container.scrollTop : 0;
    isLoadingEarlierRef.current = true;

    await fetchMessages({ before: messages[0]._id });
    setLoadingEarlier(false);

    // After loading, adjust scrollTop to keep the view anchored
    setTimeout(() => {
      const containerNow = chatContainerRef.current;
      if (containerNow) {
        const newScrollHeight = containerNow.scrollHeight;
        containerNow.scrollTop = newScrollHeight - prevScrollHeight + prevScrollTop;
      }
      isLoadingEarlierRef.current = false;
    }, 0);
  };


  return (
    <>
      {/* Draggable Floating Chat Bubble (only shows when chat is closed AND root chatbot is closed) */}
       {!isChatOpen && !rootChatOpen && (
        <div
          ref={bubbleRef}
          style={{
            position: 'fixed',
            left: chatPos.x,
            top: chatPos.y,
            width: BUBBLE_DIMS.w,
            height: BUBBLE_DIMS.h,
            zIndex: 1051,
            borderRadius: '50%',
            background: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 24px rgba(0,0,0,0.15), 0 0 0 2px rgba(37, 99, 235, 0.1)',
            cursor: dragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            transition: dragging ? 'none' : 'transform 0.2s',
          }}
          onMouseDown={startDrag}
          onTouchStart={startDrag}
          onClick={() => {
            if (dragging) return;
            // Open the chat window at the bubble's current position
            // Clamp to window for chatbox size
            const clampedX = Math.max(PADDING, Math.min(window.innerWidth - CHATBOX_DIMS.w - PADDING, chatPos.x));
            const clampedY = Math.max(PADDING, Math.min(window.innerHeight - CHATBOX_DIMS.h - PADDING, chatPos.y));
            setChatPos({ x: clampedX, y: clampedY });
            openEventChat();
          }}
        >
          <span className="text-3xl" style={{ color: 'white' }}>💬</span>
        </div>
      )}

      {/* Draggable Chat Window */}
      {isChatOpen && (
        <div 
          style={{
            position: 'fixed',
            left: chatPos.x,
            top: chatPos.y,
            width: 384,
            height: 500,
            zIndex: 1050,
            display: 'flex',
            flexDirection: 'column',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
            border: '1px solid #e5e7eb',
            userSelect: dragging ? 'none' : 'auto',
          }}
        >
          {/* The header is now the drag handle for the window. */}
          <div 
            className="bg-blue-600 text-white p-3 rounded-t-lg flex justify-between items-center"
            style={{ cursor: dragging ? 'grabbing' : 'grab' }}
            onMouseDown={startDrag}
            onTouchStart={startDrag}
          >
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-lg">Event Chat</h3>
              <button
                onClick={() => setShowFileManager(!showFileManager)}
                className={`px-2 py-1 text-white text-xs rounded transition-colors ${
                  showFileManager 
                    ? 'bg-green-600 hover:bg-green-500' 
                    : 'bg-blue-500 hover:bg-blue-400'
                }`}
                onMouseDown={(e) => e.stopPropagation()}
                title={showFileManager ? "Close File Manager" : "Open File Manager"}
              >
                {showFileManager ? '📁 Files ✓' : '📁 Files'}
              </button>
            </div>
            <button 
              onClick={() => {
                closeEventChat();
                resetToDefaultPosition();
                // Clear saved chat window position
                localStorage.removeItem('chatPosition');
              }} 
              className="text-white text-2xl leading-none"
              onMouseDown={(e) => e.stopPropagation()}
            >
              &times;
            </button>
          </div>

          {/* File Manager Panel */}
          {showFileManager && (
            <div className="bg-gray-50 border-b border-gray-200 flex flex-col flex-1 overflow-hidden transition-all duration-300 ease-in-out">
              <div className="flex items-center justify-between p-3 border-b border-gray-200">
                <h4 className="font-semibold text-gray-800 text-sm">📁 File Manager</h4>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setFileManagerView(fileManagerView === 'grid' ? 'list' : 'grid')}
                    className="px-1.5 py-0.5 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 transition-colors"
                    title={`Switch to ${fileManagerView === 'grid' ? 'list' : 'grid'} view`}
                  >
                    {fileManagerView === 'grid' ? '📋 List' : '🔲 Grid'}
                  </button>
                  <button
                    onClick={() => setShowFileManager(false)}
                    className="px-1.5 py-0.5 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 transition-colors"
                    title="Close File Manager"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* File Statistics */}
              <div className="grid grid-cols-3 gap-2 p-3 border-b border-gray-200">
                {(() => {
                  const stats = getFileStatistics();
                  return (
                    <>
                      <div className="bg-white p-2 rounded border border-gray-200 text-center">
                        <div className="text-lg font-bold text-blue-600">{stats.totalFiles}</div>
                        <div className="text-xs text-gray-600">Files</div>
                      </div>
                      <div className="bg-white p-2 rounded border border-gray-200 text-center">
                        <div className="text-lg font-bold text-green-600">{stats.byType.images}</div>
                        <div className="text-xs text-gray-600">Images</div>
                      </div>
                      <div className="bg-white p-2 rounded border border-gray-200 text-center">
                        <div className="text-lg font-bold text-purple-600">{stats.byType.documents}</div>
                        <div className="text-xs text-gray-600">Docs</div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Search and Filters */}
              <div className="space-y-2 p-3 border-b border-gray-200">
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={fileSearchQuery}
                    onChange={(e) => setFileSearchQuery(e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex gap-1 min-w-0">
                    <select
                      value={fileFilterType}
                      onChange={(e) => setFileFilterType(e.target.value)}
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
                    >
                      <option value="all">All Types</option>
                      <option value="images">Images</option>
                      <option value="documents">Documents</option>
                      <option value="other">Other</option>
                    </select>
                    <select
                      value={fileFilterDate}
                      onChange={(e) => setFileFilterDate(e.target.value)}
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                    </select>
                    <select
                      value={fileFilterSender}
                      onChange={(e) => setFileFilterSender(e.target.value)}
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
                    >
                      <option value="all">All Senders</option>
                      <option value="me">My Files</option>
                      <option value="others">Others' Files</option>
                    </select>
                  </div>
                </div>

                {/* Bulk Actions */}
                {selectedFiles.length > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded mx-3 mb-3">
                    <span className="text-xs text-blue-800">
                      {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                    </span>
                    <button
                      onClick={() => {
                        const files = getAllFilesFromMessages().filter(f => selectedFiles.includes(f.id));
                        handleBulkDownload(files);
                      }}
                      className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                    >
                      📥 Download All
                    </button>
                    <button
                      onClick={handleClearSelection}
                      className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* File List */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-3">
                {(() => {
                  const allFiles = getAllFilesFromMessages();
                  const filteredFiles = filterFiles(allFiles, fileSearchQuery, fileFilterType, fileFilterDate, fileFilterSender);
                  const sortedFiles = sortFiles(filteredFiles, 'date', 'desc');

                  if (sortedFiles.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        {fileSearchQuery || fileFilterType !== 'all' || fileFilterDate !== 'all' || fileFilterSender !== 'all' 
                          ? 'No files match your filters' 
                          : 'No files shared yet'}
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {/* Select All */}
                      <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded">
                        <input
                          type="checkbox"
                          checked={selectedFiles.length === sortedFiles.length}
                          onChange={() => handleSelectAllFiles(sortedFiles)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-700">
                          Select All ({sortedFiles.length} files)
                        </span>
                      </div>

                      {/* Files - Conditional Rendering for Grid vs List View */}
                      {fileManagerView === 'grid' ? (
                        // Grid View
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {sortedFiles.map((file) => (
                            <div key={file.id} className="bg-white rounded border border-gray-200 hover:bg-gray-50 p-2">
                              <div className="flex items-start gap-2 mb-2">
                                <input
                                  type="checkbox"
                                  checked={selectedFiles.includes(file.id)}
                                  onChange={() => handleSelectFile(file.id)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 truncate text-sm">{file.fileName}</div>
                                  <div className="text-xs text-gray-500">
                                    {getFileTypeInfo(file.fileUrl, file.fileType).label} • {file.senderName}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {format(new Date(file.timestamp), 'MMM dd, yyyy')}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex-shrink-0">
                                  <span className="text-2xl">
                                    {getFileTypeInfo(file.fileUrl, file.fileType).icon}
                                  </span>
                                </div>
                                
                                <div className="flex gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => handleFileDownload(file.fileUrl, file.fileName, file.fileType)}
                                    className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors flex items-center justify-center min-w-[32px]"
                                    title="Download file"
                                  >
                                    📥
                                  </button>
                                  <a
                                    href={file.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors flex items-center justify-center min-w-[32px]"
                                    title="Open file"
                                  >
                                    🔗
                                  </a>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        // List View
                        <div className="space-y-1.5">
                          {sortedFiles.map((file) => (
                            <div key={file.id} className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200 hover:bg-gray-50">
                              <input
                                type="checkbox"
                                checked={selectedFiles.includes(file.id)}
                                onChange={() => handleSelectFile(file.id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              
                              <div className="flex-shrink-0">
                                <span className="text-2xl">
                                  {getFileTypeInfo(file.fileUrl, file.fileType).icon}
                                </span>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">{file.fileName}</div>
                                <div className="text-xs text-gray-500">
                                  {getFileTypeInfo(file.fileUrl, file.fileType).label} • {file.senderName} • {format(new Date(file.timestamp), 'MMM dd, yyyy')}
                                </div>
                              </div>
                              
                              <div className="flex gap-1 flex-shrink-0">
                                <button
                                  onClick={() => handleFileDownload(file.fileUrl, file.fileName, file.fileType)}
                                  className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors flex items-center justify-center min-w-[32px]"
                                  title="Download file"
                                >
                                  📥
                                </button>
                                <a
                                  href={file.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors flex items-center justify-center min-w-[32px]"
                                  title="Open file"
                                >
                                  🔗
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {pinnedMessage && (
            <div className="p-3 bg-yellow-100 border-b border-yellow-300">
              <div className="flex items-center gap-2 text-yellow-800">
                <FaThumbtack className="text-sm" />
                <span className="font-semibold text-sm">PINNED</span>
                {currentUser.role === 'organizer' && (
                  <button
                    onClick={() => handlePinMessage(pinnedMessage)}
                    className="ml-2 px-2 py-1 bg-yellow-300 text-yellow-900 rounded hover:bg-yellow-400 text-xs font-semibold"
                    title="Unpin Message"
                  >
                    Unpin
                  </button>
                )}
              </div>
                              <div className="text-sm mt-1 text-gray-800">
                  <span 
                    className={`font-semibold ${pinnedMessage.userId && !pinnedMessage.userId.isDeleted ? 'cursor-pointer hover:text-blue-600 hover:underline' : 'text-gray-500 cursor-default'}`}
                    onClick={() => pinnedMessage.userId && !pinnedMessage.userId.isDeleted && handleUsernameClick(pinnedMessage.userId)}
                  >
                    {getDisplayName(pinnedMessage.userId)}:
                  </span> {pinnedMessage.message}
                </div>
              {pinnedMessage.fileUrl && (
                <div className="mt-2 p-2 bg-white rounded-lg border border-gray-200">
                  {pinnedMessage.fileType && pinnedMessage.fileType.startsWith('image/') ? (
                    // Enhanced Pinned Image Display
                    <div className="space-y-1">
                      <img
                        src={pinnedMessage.fileUrl.url || pinnedMessage.fileUrl}
                        alt="Pinned image"
                        className="rounded-lg max-w-full h-auto max-h-32 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          window.open(pinnedMessage.fileUrl.url || pinnedMessage.fileUrl, '_blank');
                        }}
                        title="Click to view full size"
                      />
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleFileDownload(
                              pinnedMessage.fileUrl.url || pinnedMessage.fileUrl,
                              pinnedMessage.fileUrl.filename || pinnedMessage.message || 'pinned-image.jpg',
                              'image'
                            )}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center min-w-[80px]"
                            title="Download pinned image"
                          >
                            <span>📥 Download</span>
                          </button>
                        </div>
                        <div className="text-xs text-gray-600 text-right">
                          📷 Pinned Image • {format(new Date(pinnedMessage.createdAt), 'MMM dd, yyyy HH:mm')}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Enhanced Pinned Document Display
                    <div className="space-y-1">
                      <div className="mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {pinnedMessage.fileType === 'application/pdf' ? '📄' : 
                             pinnedMessage.fileType.startsWith('application/msword') || pinnedMessage.fileType.includes('wordprocessingml') ? '📝' :
                             pinnedMessage.fileType.startsWith('application/vnd.ms-excel') || pinnedMessage.fileType.includes('spreadsheetml') ? '📊' :
                             pinnedMessage.fileType === 'text/plain' ? '📄' : '📎'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm truncate">
                              {pinnedMessage.fileUrl.filename || pinnedMessage.message}
                            </div>
                            <div className="text-xs text-gray-500">
                              {pinnedMessage.fileType === 'application/pdf' ? 'PDF Document' :
                               pinnedMessage.fileType.startsWith('application/msword') || pinnedMessage.fileType.includes('wordprocessingml') ? 'Word Document' :
                               pinnedMessage.fileType.startsWith('application/vnd.ms-excel') || pinnedMessage.fileType.includes('spreadsheetml') ? 'Excel Spreadsheet' :
                               pinnedMessage.fileType === 'text/plain' ? 'Text File' : 'Document'}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex gap-1">
                          <a
                            href={pinnedMessage.fileUrl.url || pinnedMessage.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center min-w-[60px]"
                            title="Open file"
                          >
                            <span>Open</span>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                          <button
                            onClick={() => handleFileDownload(
                              pinnedMessage.fileUrl.url || pinnedMessage.fileUrl,
                              pinnedMessage.fileUrl.filename || pinnedMessage.message || 'pinned-document',
                              'document'
                            )}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center min-w-[80px]"
                            title="Download pinned file"
                          >
                            <span>📥 Download</span>
                          </button>
                        </div>
                        <div className="text-xs text-gray-600 text-right">
                          📎 Pinned Document • {format(new Date(pinnedMessage.createdAt), 'MMM dd, yyyy HH:mm')}
                        </div>
                      </div>
                      
                    </div>
                  )}
                </div>
              )}
              <div className="text-xs text-right mt-1 opacity-70">
                {format(new Date(pinnedMessage.createdAt), 'MMM dd, yyyy HH:mm')}
              </div>
            </div>
          )}
          {!showFileManager && (
            <div className="flex-1 p-4 overflow-y-auto" ref={chatContainerRef}>
            {hasMore && (
              <div className="flex justify-center mb-2">
                <button
                  onClick={handleLoadEarlier}
                  className="text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 border border-gray-300"
                  disabled={loadingEarlier}
                >
                  {loadingEarlier ? 'Loading...' : 'Load earlier messages'}
                </button>
              </div>
            )}
            {messages.length === 0 ? (
              <>
                <div className="text-center italic text-gray-400 py-8">
                  No messages yet. Start the conversation!
                </div>
                <div ref={chatEndRef} />
              </>
            ) : <>
              {messages.map((msg, idx) => {
                const safeUser = getSafeUserData(msg.userId);
                const isMe = safeUser._id === currentUser._id;
                const role = safeUser.role;
                const roleLabel = role === 'organizer' ? 'Organizer' : 'Volunteer';
                const roleColor = role === 'organizer' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white';
                // Improved color scheme for sender's own messages
                const bubbleColor = isMe
                  ? (role === 'organizer'
                      ? 'bg-blue-200 text-blue-900 border border-blue-400'
                      : 'bg-green-200 text-green-900 border border-green-400')
                  : (role === 'organizer'
                      ? 'bg-blue-100 text-blue-900'
                      : 'bg-green-100 text-green-900');
                const isPinned = pinnedMessage && msg._id === pinnedMessage._id;

                const aggregatedReactions = msg.reactions.reduce((acc, reaction) => {
                  acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                  return acc;
                }, {});

                // For reply display
                const reply = msg.replyTo;

                return (
                  <div
                    key={msg._id}
                    ref={idx === 0 ? firstMsgRef : null}
                    className={`group flex items-start gap-3 my-2 ${isMe ? 'flex-row-reverse' : ''}`}
                  >
                    {getProfileImageUrl(safeUser) ? (
                      <img
                        src={getProfileImageUrl(safeUser)}
                        alt={getDisplayName(safeUser)}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-100 to-emerald-100 flex items-center justify-center border border-blue-200 shadow-sm">
                        <span className="text-xs font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">{getAvatarInitial(safeUser)}</span>
                      </div>
                    )}
                    <div className={`relative p-3 rounded-lg max-w-[70%] ${bubbleColor} ${isPinned ? 'border-2 border-yellow-400' : ''}`}>
                                              {/* Reply preview in chat bubble */}
                                              {reply && (
                          <div className="mb-2 p-2 rounded bg-gray-100 border-l-4 border-blue-400">
                            <div className="text-xs text-gray-500">Replying to <span 
                              className={`font-semibold ${reply.userId && !reply.userId.isDeleted ? 'cursor-pointer hover:text-blue-600 hover:underline' : 'text-gray-500 cursor-default'}`}
                              onClick={() => reply.userId && !reply.userId.isDeleted && handleUsernameClick(reply.userId)}
                            >{getDisplayName(reply.userId)}</span></div>
                            <div className="truncate text-xs text-gray-700 max-w-xs">{reply.message}</div>
                          </div>
                        )}
                      <div className="absolute top-0 right-0 -mt-2 flex items-center gap-1">
                        {currentUser.role === 'organizer' && (
                          isPinned ? (
                            <button
                              onClick={() => handlePinMessage(msg)}
                              className={`p-1 rounded-full bg-white text-yellow-500 hover:text-yellow-700 border border-yellow-400`}
                              title="Unpin Message"
                            >
                              <FaThumbtack size={12} />
                            </button>
                          ) : (
                            !pinnedMessage && (
                              <button
                                onClick={() => handlePinMessage(msg)}
                                className="p-1 rounded-full bg-white text-gray-500 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Pin Message"
                              >
                                <FaThumbtack size={12} />
                              </button>
                            )
                          )
                        )}
                        <button
                          onClick={() => setShowEmojiPickerFor(showEmojiPickerFor === msg._id ? null : msg._id)}
                          className="p-1 rounded-full bg-white text-gray-500 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Add reaction"
                        >
                          <FaSmile size={12} />
                        </button>
                        <button
                          onClick={() => setReplyToMessage(msg)}
                          className="p-1 rounded-full bg-white text-gray-500 hover:text-green-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Reply"
                        >
                          ↩️
                        </button>
                        {canEditMessage(msg) && (
                          <button
                            onClick={() => handleEditClick(msg)}
                            className="p-1 rounded-full bg-white text-gray-500 hover:text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Edit"
                          >
                            <FiEdit2 size={12} />
                          </button>
                        )}
                        {canUnsendMessage(msg) && (
                          <button
                            onClick={() => handleUnsendClick(msg)}
                            className="p-1 rounded-full bg-white text-gray-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Unsend"
                          >
                            <MdDelete size={14} />
                          </button>
                        )}
                      </div>

                      {showEmojiPickerFor === msg._id && (
                        <div ref={emojiPickerRef} className="absolute z-10 -top-8 left-0 bg-white border rounded-full px-2 py-1 flex gap-1 shadow-lg">
                          {EMOJIS.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg._id, emoji)}
                              className="text-lg hover:scale-125 transition-transform"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mb-1">
                        <span 
                          className={`font-semibold text-sm ${safeUser.isDeleted ? 'text-gray-500 cursor-default' : 'cursor-pointer hover:text-blue-600 hover:underline'}`}
                          onClick={() => !safeUser.isDeleted && handleUsernameClick(safeUser)}
                        >
                          {getDisplayName(safeUser)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${roleColor}`}>{roleLabel}</span>
                        {isPinned && (
                          <FaThumbtack className="ml-1 text-yellow-500" title="Pinned" />
                        )}
                      </div>
                      {editingMessageId === msg._id ? (
                        <div className="flex gap-2 items-center mt-1">
                          <input
                            type="text"
                            value={editingText}
                            onChange={e => setEditingText(e.target.value)}
                            className="flex-1 p-1 border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            maxLength={500}
                          />
                          <button
                            type="button"
                            className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 border border-blue-700 font-semibold"
                            onClick={() => handleEditSave(msg)}
                          >Save</button>
                          <button
                            type="button"
                            className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 border border-gray-400 font-semibold"
                            onClick={() => { setEditingMessageId(null); setEditingText(''); }}
                          >Cancel</button>
                        </div>
                      ) : (
                        <p className="text-sm break-words whitespace-pre-line">{msg.message}</p>
                      )}
                      {msg.fileUrl && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          {msg.fileType && msg.fileType.startsWith('image/') ? (
                            // Enhanced Image Display with Download
                            <div className="space-y-2">
                              <img
                                src={msg.fileUrl.url || msg.fileUrl}
                                alt="Shared image"
                                className="rounded-lg max-w-full h-auto max-h-80 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => {
                                  // Open image in new tab for full view
                                  window.open(msg.fileUrl.url || msg.fileUrl, '_blank');
                                }}
                                title="Click to view full size"
                              />
                              <div className="space-y-2">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleFileDownload(
                                      msg.fileUrl.url || msg.fileUrl,
                                      msg.fileUrl.filename || msg.message || 'image.jpg',
                                      'image'
                                    )}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center min-w-[80px]"
                                    title="Download image"
                                  >
                                    <span>📥 Download</span>
                                  </button>
                                </div>
                                <div className="text-xs text-gray-600 text-right">
                                  📷 Image • {format(new Date(msg.createdAt), 'MMM dd, yyyy HH:mm')}
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Enhanced Document Display with Download
                            <div className="space-y-2">
                              <div className="p-2 bg-white rounded-lg border border-gray-200">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="flex-shrink-0">
                                    <span className="text-2xl">
                                      {msg.fileType === 'application/pdf' ? '📄' : 
                                       msg.fileType.startsWith('application/msword') || msg.fileType.includes('wordprocessingml') ? '📝' :
                                       msg.fileType.startsWith('application/vnd.ms-excel') || msg.fileType.includes('spreadsheetml') ? '📊' :
                                       msg.fileType === 'text/plain' ? '📄' : '📎'}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 truncate">
                                      {msg.fileUrl.filename || msg.message}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {msg.fileType === 'application/pdf' ? 'PDF Document' :
                                       msg.fileType.startsWith('application/msword') || msg.fileType.includes('wordprocessingml') ? 'Word Document' :
                                       msg.fileType.startsWith('application/vnd.ms-excel') || msg.fileType.includes('spreadsheetml') ? 'Excel Spreadsheet' :
                                       msg.fileType === 'text/plain' ? 'Text File' : 'Document'}
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <a
                                      href={msg.fileUrl.url || msg.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center min-w-[60px]"
                                      title="Open file"
                                    >
                                      <span>Open</span>
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </a>
                                    <button
                                      onClick={() => handleFileDownload(
                                        msg.fileUrl.url || msg.fileUrl,
                                        msg.fileUrl.filename || msg.message || 'document',
                                        'document'
                                      )}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center min-w-[80px]"
                                      title="Download file"
                                    >
                                      <span>📥 Download</span>
                                    </button>
                                  </div>
                                  <div className="text-xs text-gray-600 text-right">
                                    {format(new Date(msg.createdAt), 'MMM dd, yyyy HH:mm')}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {msg.edited && (
                        <div className="text-xs text-gray-400 mt-1">edited</div>
                      )}
                      <div className="text-xs text-right mt-1 opacity-70">
                        {format(new Date(msg.createdAt), 'MMM dd, yyyy HH:mm')}
                        {msg.fileUrl && (
                          <span className="ml-2 text-blue-600">
                            📎 {msg.fileType && msg.fileType.startsWith('image/') ? 'Image' : 'File'}
                          </span>
                        )}
                      </div>
                      {Object.keys(aggregatedReactions).length > 0 && (
                        <div className="mt-2 flex gap-1 flex-wrap">
                          {Object.entries(aggregatedReactions).map(([emoji, count]) => (
                            <div
                              key={emoji}
                              className="bg-gray-200 bg-opacity-50 rounded-full px-2 py-0.5 flex items-center text-xs"
                            >
                              <span>{emoji}</span>
                              <span className="ml-1 font-semibold">{count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </>}
          </div>
          )}
          <div className="h-6 px-4 text-sm text-gray-500 italic">
            {typingDisplay && `${typingDisplay} is typing...`}
            {isUploading && Object.keys(uploadProgress).length > 0 && (
              <span className="ml-2 text-blue-600 font-medium">
                📤 Uploading {Object.keys(uploadProgress)[0]}... {Object.values(uploadProgress)[0]}%
              </span>
            )}
            {isDownloading && downloadQueue.length > 0 && (
              <span className="ml-2 text-green-600 font-medium">
                📥 Downloading {downloadQueue.length} file{downloadQueue.length > 1 ? 's' : ''}...
              </span>
            )}
          </div>

          {/* Download Queue Display */}
          {downloadQueue.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
              <div className="text-xs text-gray-600 mb-2 font-medium">
                📥 Active Downloads ({downloadQueue.length})
              </div>
              {downloadQueue.map((item) => (
                <div key={item.id} className="flex items-center justify-between mb-2 p-2 bg-white rounded border">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <span className="text-sm text-gray-700 truncate">{item.fileName}</span>
                    <span className="text-xs text-gray-500">
                      {downloadStatus[item.id] === 'starting' && 'Starting...'}
                      {downloadStatus[item.id] === 'downloading' && `${downloadProgress[item.id] || 0}%`}
                      {downloadStatus[item.id] === 'completed' && '✅ Complete'}
                      {downloadStatus[item.id] === 'error' && '❌ Failed'}
                      {downloadStatus[item.id] === 'cancelled' && '⏹️ Cancelled'}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  {downloadStatus[item.id] === 'downloading' && (
                    <div className="flex-1 mx-2">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${downloadProgress[item.id] || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex space-x-1">
                    {downloadStatus[item.id] === 'error' && (
                      <button
                        type="button"
                        onClick={() => handleRetryDownload(item.id)}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        Retry
                      </button>
                    )}
                    {downloadStatus[item.id] === 'downloading' && (
                      <button
                        type="button"
                        onClick={() => handleCancelDownload(item.id)}
                        className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="p-4 border-t relative">
            {/* Unsend confirmation dialog */}
            {unsendConfirm.show && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
                <div className="bg-white rounded-lg shadow-lg p-6 w-80">
                  <div className="mb-4 text-gray-800 font-semibold">Unsend this message?</div>
                  <div className="mb-4 text-gray-600 text-sm truncate">{unsendConfirm.msg?.message}</div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleUnsendCancel}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >Cancel</button>
                    <button
                      onClick={handleUnsendConfirm}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >Unsend</button>
                  </div>
                </div>
              </div>
            )}
            {replyToMessage && (
                              <div className="p-2 bg-gray-100 rounded-lg mb-2 relative flex items-center gap-2">
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Replying to <span 
                      className={`font-semibold ${replyToMessage.userId && !replyToMessage.userId.isDeleted ? 'cursor-pointer hover:text-blue-600 hover:underline' : 'text-gray-500 cursor-default'}`}
                      onClick={() => replyToMessage.userId && !replyToMessage.userId.isDeleted && handleUsernameClick(replyToMessage.userId)}
                    >{getDisplayName(replyToMessage.userId)}</span></div>
                    <div className="truncate text-sm text-gray-700 max-w-xs">{replyToMessage.message}</div>
                  </div>
                <button type="button" onClick={() => setReplyToMessage(null)} className="w-5 h-5 flex items-center justify-center bg-red-500 text-white rounded-full"><IoMdClose size={16} /></button>
              </div>
            )}
            {showInputEmojiPicker && (
              <div className="absolute bottom-16">
                <EmojiPicker onEmojiClick={onEmojiClick} />
              </div>
            )}
            {fileToSend && (
              <div className="p-3 bg-gray-50 rounded-lg mb-3 relative border border-gray-200">
                {/* File Preview */}
                <div className="mb-3">
                  {fileToSend.type.startsWith('image/') ? (
                    <img
                      src={URL.createObjectURL(fileToSend)}
                      alt="Preview"
                      className="max-h-40 rounded-lg mx-auto"
                    />
                  ) : (
                    <div className="text-sm p-2 flex items-center gap-2">
                      <span className="text-lg">
                        {fileToSend.type === 'application/pdf' ? '📄' : 
                         fileToSend.type.startsWith('application/msword') || fileToSend.type.includes('wordprocessingml') ? '📝' :
                         fileToSend.type.startsWith('application/vnd.ms-excel') || fileToSend.type.includes('spreadsheetml') ? '📊' :
                         fileToSend.type === 'text/plain' ? '📄' : '📎'}
                      </span>
                      <span className="font-medium">{fileToSend.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(fileToSend.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  )}
                </div>

                {/* Upload Progress Display */}
                {Object.keys(uploadProgress).length > 0 && uploadProgress[fileToSend.name] !== undefined && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {uploadStatus[fileToSend.name] === 'uploading' ? 'Uploading...' :
                         uploadStatus[fileToSend.name] === 'completed' ? 'Upload completed' :
                         uploadStatus[fileToSend.name] === 'error' ? 'Upload failed' : 'Preparing...'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {uploadProgress[fileToSend.name]}%
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          uploadStatus[fileToSend.name] === 'error' ? 'bg-red-500' : 
                          uploadStatus[fileToSend.name] === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${uploadProgress[fileToSend.name]}%` }}
                      ></div>
                    </div>
                    
                    {/* Status Text */}
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`text-xs ${
                        uploadStatus[fileToSend.name] === 'error' ? 'text-red-600' : 
                        uploadStatus[fileToSend.name] === 'completed' ? 'text-green-600' : 'text-blue-600'
                      }`}>
                        {uploadStatus[fileToSend.name] === 'error' ? 'Upload failed' : 
                         uploadStatus[fileToSend.name] === 'completed' ? 'Ready to send' : 
                         `Uploading... ${uploadProgress[fileToSend.name]}%`}
                      </span>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {uploadStatus[fileToSend.name] === 'uploading' && (
                          <button
                            type="button"
                            onClick={handleCancelUpload}
                            className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                        {uploadStatus[fileToSend.name] === 'error' && (
                          <button
                            type="button"
                            onClick={() => handleRetryUpload(fileToSend.name)}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* File Actions */}
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    {uploadStatus[fileToSend.name] === 'completed' ? 'Ready to send' :
                     uploadStatus[fileToSend.name] === 'error' ? 'Upload failed' :
                     uploadStatus[fileToSend.name] === 'uploading' ? 'Uploading...' : 'Preparing...'}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setFileToSend(null)}
                    className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={handleTyping}
                placeholder="Type your message..."
                className="flex-1 min-w-0 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!!fileToSend} // Disable text input when file is selected
              />
              <button
                type="button"
                onClick={() => setShowInputEmojiPicker(val => !val)}
                className="flex-shrink-0 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                <FaSmile />
              </button>
              <label className="flex-shrink-0 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 cursor-pointer">
                📎
                <input type="file" hidden onChange={handleFileSelect} />
              </label>
              <button 
                type="submit" 
                disabled={isUploading}
                className={`flex-shrink-0 px-4 py-2 rounded-lg transition-colors ${
                  isUploading 
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isUploading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Uploading...</span>
                  </div>
                ) : (
                  'Send'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
} 