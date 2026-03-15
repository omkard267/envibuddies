# Confirmation Modal Migration Guide

## 🎯 **Overview**
This guide helps you migrate existing `window.confirm()` calls to use the new beautiful `showConfirm` system.

## 🔄 **Migration Pattern**

### **Before (Old Way):**
```javascript
if (window.confirm("Are you sure you want to delete this event?")) {
  // Delete event
  deleteEvent();
}
```

### **After (New Way):**
```javascript
showConfirm.danger(
  "Are you sure you want to delete this event?",
  () => {
    // Delete event
    deleteEvent();
  },
  {
    title: "⚠️ Delete Event",
    confirmText: "Yes, delete it",
    cancelText: "Cancel"
  }
);
```

## 📋 **Available Confirmation Types**

### **1. Basic Confirmation (`showConfirm.action`)**
```javascript
showConfirm.action(
  "Are you sure you want to proceed?",
  () => { /* action */ },
  {
    title: "Confirm Action",
    confirmText: "Yes, proceed",
    cancelText: "Cancel"
  }
);
```

### **2. Danger Confirmation (`showConfirm.danger`)**
```javascript
showConfirm.danger(
  "This action cannot be undone. Are you sure?",
  () => { /* dangerous action */ },
  {
    title: "⚠️ Danger Zone",
    confirmText: "Yes, I understand the risk",
    cancelText: "Cancel, keep me safe"
  }
);
```

### **3. Warning Confirmation (`showConfirm.warning`)**
```javascript
showConfirm.warning(
  "This will affect multiple items. Continue?",
  () => { /* action */ },
  {
    title: "⚠️ Warning",
    confirmText: "I understand, proceed",
    cancelText: "Let me review again"
  }
);
```

### **4. Info Confirmation (`showConfirm.info`)**
```javascript
showConfirm.info(
  "This will create a backup. Continue?",
  () => { /* action */ },
  {
    title: "ℹ️ Information",
    confirmText: "Yes, create backup",
    cancelText: "No, proceed without backup"
  }
);
```

## 🚀 **Migration Examples**

### **Event Deletion:**
```javascript
// OLD
if (!window.confirm("Are you sure you want to delete this event?")) return;

// NEW
showConfirm.danger(
  "Are you sure you want to delete this event?",
  () => {
    // Delete event logic here
    deleteEvent();
  },
  {
    title: "🗑️ Delete Event",
    confirmText: "Yes, delete it",
    cancelText: "Cancel"
  }
);
```

### **Registration Withdrawal:**
```javascript
// OLD
if (!window.confirm('Are you sure you want to withdraw your registration for this event?')) return;

// NEW
showConfirm.warning(
  'Are you sure you want to withdraw your registration for this event?',
  () => {
    // Withdraw logic here
    withdrawRegistration();
  },
  {
    title: "📝 Withdraw Registration",
    confirmText: "Yes, withdraw",
    cancelText: "Keep my registration"
  }
);
```

### **File Replacement:**
```javascript
// OLD
const confirmReplace = window.confirm("File already exists. Replace it?");

// NEW
showConfirm.warning(
  "File already exists. Replace it?",
  () => {
    // Replace file logic
    replaceFile();
  },
  {
    title: "📁 File Conflict",
    confirmText: "Yes, replace it",
    cancelText: "Keep existing file"
  }
);
```

## 📁 **Files That Need Migration**

### **High Priority (Dangerous Actions):**
- `EventDetailsPage.jsx` - Event deletion, user removal/banning
- `EventModal.jsx` - Registration withdrawal
- `SponsorProfileForm.jsx` - File replacement

### **Medium Priority:**
- Any other files using `window.confirm()`

## ✅ **Benefits of Migration**

1. **Better UX** - Beautiful, consistent modals across the app
2. **Accessibility** - Proper keyboard navigation (Escape key)
3. **Customization** - Different styles for different action types
4. **Consistency** - Same look and feel as notification system
5. **Mobile Friendly** - Responsive design that works on all devices

## 🧪 **Testing**

Use the confirmation test section on the homepage to test all confirmation types:
- Basic confirmation
- Danger confirmation (red styling)
- Warning confirmation (orange styling)
- Info confirmation (blue styling)
- Long message handling

## 🔧 **Troubleshooting**

### **If confirmation doesn't show:**
1. Check browser console for errors
2. Ensure `showConfirm` is properly imported
3. Verify the callback function is valid

### **Fallback:**
The system automatically falls back to `window.confirm()` if there's an error, so your app won't break.

## 📝 **Import Statement**

Make sure you have this import in your file:
```javascript
import { showConfirm } from '../utils/notifications';
```

## 🎨 **Customization Options**

All confirmation types support these options:
- `title` - Modal title
- `confirmText` - Confirm button text
- `cancelText` - Cancel button text
- `type` - Visual style (danger, warning, info, default)
- `icon` - Custom icon (optional)

---

**Happy Migrating! 🚀**
