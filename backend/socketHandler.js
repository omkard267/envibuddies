const jwt = require('jsonwebtoken');
const User = require('./models/user');
const Message = require('./models/Message');

const initializeSocket = (io) => {
  // Socket.IO authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: Token not provided.'));
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return next(new Error('Authentication error: Invalid token.'));
      }
      socket.user = decoded;
      next();
    });
  });

  // Socket.IO connection handler with chat logic
  io.on('connection', (socket) => {

    // Join an event-specific room
    socket.on('joinEventRoom', (eventId) => {
      socket.join(`event:${eventId}`);
    });

    // Leave an event-specific room
    socket.on('leaveEventRoom', (eventId) => {
      socket.leave(`event:${eventId}`);
    });

    // --- Slot update rooms for live slot updates ---
    socket.on('joinEventSlotsRoom', (eventId) => {
      socket.join(`eventSlotsRoom:${eventId}`);
    });
    socket.on('leaveEventSlotsRoom', (eventId) => {
      socket.leave(`eventSlotsRoom:${eventId}`);
    });

    // Handle new messages
    socket.on('sendMessage', async ({ eventId, message, fileUrl, fileType, replyTo }) => {
      try {
        const newMessage = new Message({
          eventId,
          userId: socket.user.id,
          message,
          fileUrl,
          fileType,
          replyTo: replyTo || null,
        });
        await newMessage.save();

        const populatedMessage = await Message.findById(newMessage._id)
          .populate('userId', 'name username profileImage role')
          .populate({
            path: 'replyTo',
            select: 'message userId',
            populate: { path: 'userId', select: 'name username profileImage role' }
          })
          .lean();

        // Handle deleted users in new messages
        if (!populatedMessage.userId) {
          populatedMessage.userId = {
            _id: populatedMessage.userInfo?.userId || null,
            name: populatedMessage.userInfo?.name || 'Deleted User',
            username: populatedMessage.userInfo?.username || 'deleted_user',
            role: populatedMessage.userInfo?.role || 'user',
            profileImage: populatedMessage.userInfo?.avatar || null,
            isDeleted: true
          };
        }

        // Handle replyTo messages for deleted users
        if (populatedMessage.replyTo && !populatedMessage.replyTo.userId) {
          populatedMessage.replyTo.userId = {
            _id: populatedMessage.replyTo.userInfo?.userId || null,
            name: populatedMessage.replyTo.userInfo?.name || 'Deleted User',
            username: populatedMessage.replyTo.userInfo?.username || 'deleted_user',
            role: populatedMessage.replyTo.userInfo?.role || 'user',
            profileImage: populatedMessage.replyTo.userInfo?.avatar || null,
            isDeleted: true
          };
        }

        io.to(`event:${eventId}`).emit('receiveMessage', populatedMessage);
      } catch (err) {
        console.error('Error sending message:', err);
        socket.emit('sendMessageError', { message: 'Failed to send message.' });
      }
    });

    // Handle typing indicators
    socket.on('typing', ({ eventId, userName }) => {
      socket.to(`event:${eventId}`).emit('userTyping', { userId: socket.user.id, userName });
    });

    socket.on('stopTyping', (eventId) => {
      socket.to(`event:${eventId}`).emit('userStoppedTyping', { userId: socket.user.id });
    });

    // Handle message pinning broadcast
    socket.on('pinMessage', ({ eventId, message }) => {
      // The message object received here is the one returned from the successful API call
      // Broadcast to all clients in the room that a message has been pinned/unpinned
      io.to(`event:${eventId}`).emit('messagePinned', message);
    });

    // Handle message reactions
    socket.on('reactToMessage', async ({ eventId, messageId, emoji }) => {
      try {
        
        const message = await Message.findById(messageId);
        if (!message) {
          return;
        }

        const userId = socket.user.id;

        // Find if the user has an existing reaction on this message
        const existingReactionIndex = message.reactions.findIndex(
          r => r.userId.toString() === userId
        );

        let isTogglingOff = false;

        if (existingReactionIndex > -1) {
          // User has an existing reaction. Check if it's the same emoji.
          isTogglingOff = message.reactions[existingReactionIndex].emoji === emoji;
          // Remove the old reaction regardless
          message.reactions.splice(existingReactionIndex, 1);
        }

        // If the user was not toggling off an existing reaction, add the new one.
        // This handles both adding a new reaction and changing an existing one.
        if (!isTogglingOff) {
          message.reactions.push({ emoji, userId });
        }

        await message.save();
        
        const populatedMessage = await Message.findById(messageId)
          .populate('userId', 'name username profileImage role')
          .lean();

        // Handle deleted users in reaction updates
        if (!populatedMessage.userId) {
          populatedMessage.userId = {
            _id: populatedMessage.userInfo?.userId || null,
            name: populatedMessage.userInfo?.name || 'Deleted User',
            username: populatedMessage.userInfo?.username || 'deleted_user',
            role: populatedMessage.userInfo?.role || 'user',
            profileImage: populatedMessage.userInfo?.avatar || null,
            isDeleted: true
          };
        }

        io.to(`event:${eventId}`).emit('messageReactionUpdate', populatedMessage);
      } catch (err) {
        console.error('Error reacting to message:', err);
        socket.emit('reactionError', { message: 'Failed to react to message.' });
      }
    });

    // Handle message editing
    socket.on('editMessage', async ({ eventId, messageId, newText }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        // Only sender can edit
        if (message.userId.toString() !== socket.user.id) {
          socket.emit('editMessageError', { message: 'You can only edit your own messages.' });
          return;
        }
        // Only within 5 minutes
        const now = new Date();
        const created = new Date(message.createdAt);
        if ((now - created) > 5 * 60 * 1000) {
          socket.emit('editMessageError', { message: 'Edit window expired.' });
          return;
        }
        // Only if not already edited
        if (message.editCount > 0) {
          socket.emit('editMessageError', { message: 'You can only edit a message once.' });
          return;
        }
        // Update message
        message.message = newText;
        message.edited = true;
        message.editedAt = now;
        message.editCount = 1;
        await message.save();

        const populatedMessage = await Message.findById(messageId)
          .populate('userId', 'name username profileImage role')
          .populate({
            path: 'replyTo',
            select: 'message userId',
            populate: { path: 'userId', select: 'name username profileImage role' }
          })
          .lean();

        // Handle deleted users in edited messages
        if (!populatedMessage.userId) {
          populatedMessage.userId = {
            _id: populatedMessage.userInfo?.userId || null,
            name: populatedMessage.userInfo?.name || 'Deleted User',
            username: populatedMessage.userInfo?.username || 'deleted_user',
            role: populatedMessage.userInfo?.role || 'user',
            profileImage: populatedMessage.userInfo?.avatar || null,
            isDeleted: true
          };
        }

        // Handle replyTo messages for deleted users
        if (populatedMessage.replyTo && !populatedMessage.replyTo.userId) {
          populatedMessage.replyTo.userId = {
            _id: populatedMessage.replyTo.userInfo?.userId || null,
            name: populatedMessage.replyTo.userInfo?.name || 'Deleted User',
            username: populatedMessage.replyTo.userInfo?.username || 'deleted_user',
            role: populatedMessage.replyTo.userInfo?.role || 'user',
            profileImage: populatedMessage.replyTo.userInfo?.avatar || null,
            isDeleted: true
          };
        }

        io.to(`event:${eventId}`).emit('messageEdited', populatedMessage);
      } catch (err) {
        console.error('Error editing message:', err);
        socket.emit('editMessageError', { message: 'Failed to edit message.' });
      }
    });

    // Handle message unsending (deletion)
    socket.on('unsendMessage', async ({ eventId, messageId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;
        // Only sender can unsend
        if (message.userId.toString() !== socket.user.id) {
          socket.emit('unsendMessageError', { message: 'You can only unsend your own messages.' });
          return;
        }
        
        // Delete associated file from Cloudinary if it exists
        if (message.fileUrl && message.fileUrl.publicId) {
          try {
            const { deleteFromCloudinary } = require('./utils/cloudinaryUtils');
            await deleteFromCloudinary(message.fileUrl.publicId);
            console.log(`🗑️ Deleted file from Cloudinary: ${message.fileUrl.publicId}`);
          } catch (deleteError) {
            console.error('Failed to delete file from Cloudinary:', deleteError);
            // Continue with message deletion even if file deletion fails
          }
        }
        
        await Message.deleteOne({ _id: messageId });
        io.to(`event:${eventId}`).emit('messageUnsent', { messageId });
      } catch (err) {
        console.error('Error unsending message:', err);
        socket.emit('unsendMessageError', { message: 'Failed to unsend message.' });
      }
    });

    // --- Attendance tracking rooms ---
    socket.on('joinAttendanceRoom', (eventId) => {
      socket.join(`attendance:${eventId}`);
    });

    socket.on('leaveAttendanceRoom', (eventId) => {
      socket.leave(`attendance:${eventId}`);
    });

    socket.on('disconnect', () => {
    });
  });
};

module.exports = initializeSocket; 