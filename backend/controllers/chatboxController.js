const Message = require('../models/Message');
const { uploadToCloudinary } = require('../utils/cloudinaryUtils');

// GET /api/events/:eventId/messages - Fetch chat history for an event
exports.getMessages = async (req, res) => {
  try {
    const { eventId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 20;
    const before = req.query.before; // messageId

    let query = { eventId };
    if (before) {
      // Find the message to get its createdAt
      const beforeMsg = await Message.findById(before);
      if (beforeMsg) {
        query.createdAt = { $lt: beforeMsg.createdAt };
      }
    }

    // Always sort by newest first, then reverse on frontend if needed
    let messages = await Message.find(query)
      .sort({ createdAt: -1 }) // Newest first
      .limit(limit)
      .populate('userId', 'name username profileImage role')
      .populate({
        path: 'replyTo',
        select: 'message userId',
        populate: { path: 'userId', select: 'name username profileImage role' }
      })
      .lean(); // Convert to plain objects for easier manipulation

    // Transform messages to handle deleted users consistently
    messages = messages.map(msg => {
      if (!msg.userId) {
        // Use denormalized data for deleted users
        return {
          ...msg,
          userId: {
            _id: msg.userInfo?.userId || null,
            name: msg.userInfo?.name || 'Deleted User',
            username: msg.userInfo?.username || 'deleted_user',
            role: msg.userInfo?.role || 'user',
            profileImage: msg.userInfo?.avatar || null,
            isDeleted: true
          }
        };
      }
      return msg;
    });

    // Handle replyTo messages for deleted users
    messages = messages.map(msg => {
      if (msg.replyTo && !msg.replyTo.userId) {
        msg.replyTo.userId = {
          _id: msg.replyTo.userInfo?.userId || null,
          name: msg.replyTo.userInfo?.name || 'Deleted User',
          username: msg.replyTo.userInfo?.username || 'deleted_user',
          role: msg.replyTo.userInfo?.role || 'user',
          profileImage: msg.replyTo.userInfo?.avatar || null,
          isDeleted: true
        };
      }
      return msg;
    });

    // Reverse to oldest-to-newest for display
    messages = messages.reverse();
    res.json(messages);
  } catch (err) {
    console.error("Failed to fetch messages:", err);
    res.status(500).json({ message: 'Server error fetching messages.' });
  }
};

// POST /api/chatbox/upload - Upload a file for chat
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    // Upload file to Cloudinary
    console.log(`📤 Uploading file to Cloudinary: ${req.file.originalname} (${req.file.mimetype}, ${req.file.size} bytes)`);
    const uploadResult = await uploadToCloudinary(req.file, 'chat');

    if (!uploadResult.success) {
      console.error('❌ Cloudinary upload failed:', uploadResult.error);
      return res.status(500).json({
        message: 'Failed to upload file to Cloudinary',
        error: uploadResult.error
      });
    }
    
    console.log(`✅ File uploaded successfully to Cloudinary: ${uploadResult.publicId}`);

    res.json({
      fileUrl: {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        filename: uploadResult.filename
      },
      fileType: req.file.mimetype
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      message: 'Server error uploading file',
      error: error.message
    });
  }
};

// PATCH /api/chatbox/messages/:messageId/pin - Pin or unpin a message
exports.pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { eventId } = req.body; // Passed from frontend to scope the update
    const { userId, role } = req.user; // Assuming user is populated from auth middleware

    if (role !== 'organizer') {
      return res.status(403).json({ message: 'Only organizers can pin messages.' });
    }

    const messageToPin = await Message.findById(messageId);

    if (!messageToPin || messageToPin.eventId.toString() !== eventId) {
      return res.status(404).json({ message: 'Message not found in this event.' });
    }

    const newPinStatus = !messageToPin.isPinned;

    // If we are pinning a NEW message, first unpin any existing pinned message for this event.
    if (newPinStatus) {
      await Message.updateMany(
        { eventId: eventId, isPinned: true },
        { $set: { isPinned: false } }
      );
    }

    // Now, set the pin status for the target message
    messageToPin.isPinned = newPinStatus;
    await messageToPin.save();

    const populatedMessage = await Message.findById(messageToPin._id)
      .populate('userId', 'name username profileImage role')
      .lean();

    // Handle deleted users in pinned message
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

    res.json(populatedMessage);

  } catch (err) {
    console.error("Failed to pin message:", err);
    res.status(500).json({ message: 'Server error pinning message.' });
  }
}; 