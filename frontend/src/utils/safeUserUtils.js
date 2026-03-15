// Utility functions for safely handling user data, especially for deleted users

// Safe user data access - handles deleted users gracefully
export const getSafeUserData = (user) => {
  if (!user) {
    return {
      _id: null,
      name: 'Unknown User',
      username: 'unknown',
      email: 'unknown@email.com',
      phone: 'N/A',
      role: 'user',
      profileImage: null,
      isDeleted: false
    };
  }
  
  // If user is deleted, preserve the original username and name from the userInfo
  if (user.isDeleted) {
    return {
      _id: user._id || user.userId,
      name: user.name || 'Deleted User',
      username: user.username || 'deleted_user',
      email: user.email || 'deleted@user.com',
      phone: user.phone || 'N/A',
      role: user.role || 'user',
      profileImage: user.profileImage || null,
      isDeleted: true
    };
  }
  
  return user;
};

// Safe display name function
export const getDisplayName = (user) => {
  const safeUser = getSafeUserData(user);
  if (safeUser.isDeleted) {
    // For deleted users, show the original username if available, otherwise name
    return safeUser.username ? `@${safeUser.username}` : safeUser.name || 'Deleted User';
  }
  return safeUser.username ? `@${safeUser.username}` : safeUser.name || 'Unknown User';
};

// Safe username display
export const getUsernameDisplay = (user) => {
  const safeUser = getSafeUserData(user);
  if (safeUser.isDeleted) {
    // For deleted users, show the original username if available, otherwise name
    return safeUser.username ? `@${safeUser.username}` : safeUser.name || 'Deleted User';
  }
  return safeUser.username ? `@${safeUser.username}` : safeUser.name || 'Unknown User';
};

// Safe email display
export const getEmailDisplay = (user) => {
  const safeUser = getSafeUserData(user);
  if (safeUser.isDeleted) return 'deleted@user.com';
  return safeUser.email || 'N/A';
};

// Safe phone display
export const getPhoneDisplay = (user) => {
  const safeUser = getSafeUserData(user);
  if (safeUser.isDeleted) return 'N/A';
  return safeUser.phone || 'N/A';
};

// Safe profile image URL
export const getSafeProfileImageUrl = (user) => {
  const safeUser = getSafeUserData(user);
  if (safeUser.isDeleted) return null;
  return safeUser.profileImage;
};

// Check if user can be clicked/navigated to
export const canNavigateToUser = (user) => {
  const safeUser = getSafeUserData(user);
  return !safeUser.isDeleted && safeUser._id;
};

// Safe user ID for navigation
export const getSafeUserId = (user) => {
  const safeUser = getSafeUserData(user);
  return safeUser.isDeleted ? null : safeUser._id;
};

// Safe user role
export const getSafeUserRole = (user) => {
  const safeUser = getSafeUserData(user);
  return safeUser.isDeleted ? 'user' : safeUser.role;
};

// Safe user name for alt text and labels
export const getSafeUserName = (user) => {
  const safeUser = getSafeUserData(user);
  if (safeUser.isDeleted) {
    // For deleted users, show the original name if available
    return safeUser.name || 'Deleted User';
  }
  return safeUser.username || safeUser.name || 'Unknown User';
};

// ============================================================================
// ATTENDANCE-SPECIFIC UTILITIES
// These functions preserve actual user data for attendance records
// even if the user is deleted, as these are official records
// ============================================================================

export const getAttendanceUserData = (user) => {
  // For attendance records, we want to preserve the actual user information
  // even if the user is deleted, as these are official records
  if (!user) {
    return {
      _id: null,
      name: 'Unknown User',
      username: 'unknown',
      email: 'unknown@email.com',
      phone: 'N/A',
      role: 'user',
      profileImage: null,
      isDeleted: true
    };
  }
  
  // If user has isDeleted flag but also has actual data, preserve the actual data
  if (user.isDeleted) {
    return {
      _id: user._id,
      name: user.name || 'Deleted User',
      username: user.username || 'deleted_user',
      email: user.email || 'deleted@user.com',
      phone: user.phone || 'N/A',
      role: user.role || 'user',
      profileImage: user.profileImage || null,
      isDeleted: true
    };
  }
  
  return user;
};

export const getAttendanceDisplayName = (user) => {
  const attendanceUser = getAttendanceUserData(user);
  if (attendanceUser.isDeleted) {
    // For deleted users in attendance, show their actual name if available
    return attendanceUser.name || 'Deleted User';
  }
  return attendanceUser.username ? `@${attendanceUser.username}` : attendanceUser.name || 'Unknown User';
};

export const getAttendanceUsernameDisplay = (user) => {
  const attendanceUser = getAttendanceUserData(user);
  if (attendanceUser.isDeleted) {
    // For deleted users in attendance, show their actual username if available
    return attendanceUser.username ? `@${attendanceUser.username}` : attendanceUser.name || 'Deleted User';
  }
  return attendanceUser.username ? `@${attendanceUser.username}` : attendanceUser.name || 'Unknown User';
};

export const getAttendanceEmailDisplay = (user) => {
  const attendanceUser = getAttendanceUserData(user);
  if (attendanceUser.isDeleted) {
    // For deleted users in attendance, show their actual email if available
    return attendanceUser.email || 'N/A';
  }
  return attendanceUser.email || 'N/A';
};

export const getAttendancePhoneDisplay = (user) => {
  const attendanceUser = getAttendanceUserData(user);
  if (attendanceUser.isDeleted) {
    // For deleted users in attendance, show their actual phone if available
    return attendanceUser.phone || 'N/A';
  }
  return attendanceUser.phone || 'N/A';
};

// Get attendance profile image URL
export const getAttendanceProfileImageUrl = (attendanceUser) => {
  if (!attendanceUser || attendanceUser.isDeleted) {
    return null;
  }
  
  // Check for uploaded profile image first (user's custom choice)
  if (attendanceUser?.profileImage) {
    // If profileImage is already a URL (Cloudinary or OAuth), return it directly
    if (attendanceUser.profileImage.startsWith('http')) {
      return attendanceUser.profileImage;
    }
    // No legacy support - only Cloudinary URLs
    return null;
  }
  
  // Check for OAuth profile image
  if (attendanceUser?.oauthProfileImage) {
    return attendanceUser.oauthProfileImage;
  }
  
  return null;
};

export const getAttendanceAvatarInitial = (user) => {
  const attendanceUser = getAttendanceUserData(user);
  if (attendanceUser.isDeleted) {
    // For deleted users in attendance, use their actual name/username for initial
    const displayName = attendanceUser.name || attendanceUser.username || 'D';
    return displayName.charAt(0).toUpperCase();
  }
  const displayName = attendanceUser.username || attendanceUser.name || 'U';
  return displayName.charAt(0).toUpperCase();
};
