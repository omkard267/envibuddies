import React, { createContext, useContext, useState } from 'react';

const ChatContext = createContext();

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const [rootChatOpen, setRootChatOpen] = useState(false);
  const [eventChatOpen, setEventChatOpen] = useState(false);

  // Function to open root chatbot and close event chat
  const openRootChat = () => {
    setRootChatOpen(true);
    setEventChatOpen(false);
  };

  // Function to close root chatbot
  const closeRootChat = () => {
    setRootChatOpen(false);
  };

  // Function to open event chat and close root chatbot
  const openEventChat = () => {
    setEventChatOpen(true);
    setRootChatOpen(false);
  };

  // Function to close event chat
  const closeEventChat = () => {
    setEventChatOpen(false);
  };

  // Function to close all chats
  const closeAllChats = () => {
    setRootChatOpen(false);
    setEventChatOpen(false);
  };

  const value = {
    rootChatOpen,
    eventChatOpen,
    openRootChat,
    closeRootChat,
    openEventChat,
    closeEventChat,
    closeAllChats,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
