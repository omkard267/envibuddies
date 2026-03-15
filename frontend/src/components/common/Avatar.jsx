import React from 'react';
import { getProfileImageUrl, getAvatarInitial, getRoleColors } from '../../utils/avatarUtils';
import { getSafeUserData, getSafeUserName } from '../../utils/safeUserUtils';

const Avatar = ({ 
  user, 
  size = 'md', 
  className = '', 
  showBorder = true,
  onClick = null,
  role = 'user' // 'user', 'volunteer', 'organizer', 'sponsor'
}) => {
  // Get safe user data to handle deleted users
  const safeUser = getSafeUserData(user);
  
  // Size classes
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl',
    '3xl': 'w-24 h-24 text-3xl'
  };

  const profileImageUrl = getProfileImageUrl(safeUser);
  const firstLetter = getAvatarInitial(safeUser);
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const borderClass = showBorder ? 'border-2 border-blue-200' : '';
  const bgClass = 'bg-gradient-to-r from-blue-100 to-emerald-100';
  const textClass = 'bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent';

  const baseClasses = `rounded-full flex items-center justify-center overflow-hidden ${sizeClass} ${bgClass} ${borderClass} shadow-sm ${className}`;

  if (onClick) {
    return (
      <div 
        className={`${baseClasses} cursor-pointer transition-transform hover:scale-105`}
        onClick={onClick}
      >
        {profileImageUrl ? (
          <img
            src={profileImageUrl}
            alt={getSafeUserName(safeUser)}
            className="w-full h-full object-cover"

          />
        ) : null}
        <span className={`font-bold ${profileImageUrl ? 'hidden' : 'flex'} items-center justify-center w-full h-full ${textClass}`}>
          {firstLetter}
        </span>
      </div>
    );
  }

  return (
    <div className={baseClasses}>
      {profileImageUrl ? (
        <img
          src={profileImageUrl}
          alt={getSafeUserName(safeUser)}
          className="w-full h-full object-cover"

        />
      ) : null}
      <span className={`font-bold ${profileImageUrl ? 'hidden' : 'flex'} items-center justify-center w-full h-full ${textClass}`}>
        {firstLetter}
      </span>
    </div>
  );
};

export default Avatar;
