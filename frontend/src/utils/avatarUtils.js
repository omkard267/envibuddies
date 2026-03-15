// Utility functions for avatar handling

// Get user's display name (prefer username, fallback to name)
export const getDisplayName = (user) => {
  if (!user || user.isDeleted) {
    return 'Deleted User';
  }
  return user?.username || user?.name || 'U';
};

// Get first letter of user's name for avatar
export const getAvatarInitial = (user) => {
  if (!user || user.isDeleted) {
    return 'D'; // D for Deleted
  }
  const displayName = getDisplayName(user);
  return displayName.charAt(0).toUpperCase();
};

// Validate and clean Cloudinary URL
export const validateCloudinaryUrl = (url) => {
  if (!url || !isCloudinaryUrl(url)) {
    return null;
  }
  
  try {
    // Check if the URL has a valid format
    const cloudinaryRegex = /https:\/\/res\.cloudinary\.com\/[^\/]+\/image\/upload\/v\d+\/[^\/]+\/[^\/]+\.(jpg|jpeg|png|gif|webp)/i;
    if (!cloudinaryRegex.test(url)) {
      console.warn('Invalid Cloudinary URL format:', url);
      return null;
    }
    
    // Check if the URL has a reasonable length (not too short or too long)
    if (url.length < 50 || url.length > 500) {
      console.warn('Suspicious Cloudinary URL length:', url.length, url);
      return null;
    }
    
    return url;
  } catch (error) {
    console.error('Error validating Cloudinary URL:', error, url);
    return null;
  }
};

// Get profile image URL
export const getProfileImageUrl = (user) => {
  // Handle deleted users
  if (!user || user.isDeleted) {
    return null;
  }
  
  // Check for uploaded profile image first (user's custom choice)
  if (user?.profileImage) {
    // If profileImage is already a URL (Cloudinary or OAuth), return it directly
    if (user.profileImage.startsWith('http')) {
      // Validate Cloudinary URL format
      if (isCloudinaryUrl(user.profileImage)) {
        return validateCloudinaryUrl(user.profileImage);
      }
      return user.profileImage;
    }
    // No legacy support - only Cloudinary URLs
    return null;
  }
  
  // Check for OAuth profile image
  if (user?.oauthProfileImage) {
    return user.oauthProfileImage;
  }
  
  return null;
};

// Get government ID proof URL
export const getGovtIdProofUrl = (user) => {
  if (!user || user.isDeleted) {
    return null;
  }
  
  if (user?.govtIdProofUrl) {
    // If it's already a URL (Cloudinary), return it directly
    if (user.govtIdProofUrl.startsWith('http')) {
      return user.govtIdProofUrl;
    }
    // No legacy support - only Cloudinary URLs
    return null;
  }
  
  return null;
};

// Check if URL is from Cloudinary
export const isCloudinaryUrl = (url) => {
  return url && url.includes('cloudinary.com');
};

// Check if URL is legacy local uploads
export const isLegacyUrl = (url) => {
  return url && (url.includes('localhost:5000/uploads') || url.includes('/uploads/'));
};

// Get organization logo URL
export const getOrganizationLogoUrl = (organization) => {
  if (!organization) return null;
  
  if (organization.logo) {
    // If logo is already a URL (Cloudinary), return it directly
    if (organization.logo.startsWith('http')) {
      return organization.logo;
    }
    // No legacy support - only Cloudinary URLs
    return null;
  }
  
  return null;
};

// Check if organization has a logo
export const hasOrganizationLogo = (organization) => {
  return !!getOrganizationLogoUrl(organization);
};

// Get organization document URL
export const getOrganizationDocumentUrl = (organization, documentType) => {
  if (!organization || !documentType) return null;
  
  const document = organization.documents?.[documentType];
  if (!document) return null;
  
  // If document is already a URL (Cloudinary), return it directly
  if (document.startsWith('http')) {
    return document;
  }
  
  // No legacy support - only Cloudinary URLs
  return null;
};

// Get role-based avatar colors
export const getRoleColors = (role) => {
  const colors = {
    volunteer: 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-200 text-green-600',
    organizer: 'bg-gradient-to-r from-blue-100 to-emerald-100 border-blue-200 text-blue-600',
    sponsor: 'bg-gradient-to-r from-purple-100 to-blue-100 border-purple-200 text-purple-600',
    admin: 'bg-gradient-to-r from-red-100 to-pink-100 border-red-200 text-red-600',
    user: 'bg-gradient-to-r from-gray-100 to-slate-100 border-gray-200 text-gray-600'
  };
  
  return colors[role] || colors.user;
};

// Handle image loading errors
export const handleImageError = (event, user) => {
  // Hide the image
  event.target.style.display = 'none';
  
  // Find the fallback avatar element (next sibling)
  const fallbackElement = event.target.nextElementSibling;
  if (fallbackElement) {
    // Remove the 'hidden' class to make it visible
    fallbackElement.classList.remove('hidden');
    fallbackElement.style.display = 'flex';
  }
  
  // Also try to find any parent container that might need to show fallback
  const parentContainer = event.target.parentElement;
  if (parentContainer) {
    // Look for any fallback elements within the parent
    const fallbackInParent = parentContainer.querySelector('.fallback-avatar');
    if (fallbackInParent) {
      fallbackInParent.classList.remove('hidden');
      fallbackInParent.style.display = 'flex';
    }
  }
  
  // Log the error for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.warn('Profile image failed to load:', event.target.src, 'for user:', user?.username || user?.name);
  }
};

// Get fallback avatar component
export const getFallbackAvatar = (user, sizeClasses = 'w-8 h-8', displayClass = 'hidden') => {
  const initial = getAvatarInitial(user);
  const colors = getRoleColors(user?.role || 'user');
  
  return {
    initial,
    sizeClasses,
    displayClass,
    colors
  };
};
