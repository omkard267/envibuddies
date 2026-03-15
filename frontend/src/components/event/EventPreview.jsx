// src/components/event/EventPreview.jsx

import React from "react";
import {
  Box,
  Typography,
  Divider,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
} from "@mui/material";
import { SubmitButton } from '../common/LoaderComponents';

export default function EventPreview({ formData, questionnaireData, onBack, onSubmit, existingLetter, existingImages }) {
  const displayListItem = (label, value) => (
    <ListItem>
      <ListItemText
        primary={label}
        secondary={value || <em>Not provided</em>}
        primaryTypographyProps={{ fontWeight: "bold" }}
      />
    </ListItem>
  );

  // Helper for letter preview
  const renderGovtApprovalLetter = () => {
    console.log('renderGovtApprovalLetter - formData.govtApprovalLetter:', formData.govtApprovalLetter);
    console.log('renderGovtApprovalLetter - existingLetter:', existingLetter);
    // Check for uploaded letter with cloudinaryUrl first
    if (formData.govtApprovalLetter && formData.govtApprovalLetter.cloudinaryUrl) {
      if (formData.govtApprovalLetter.type && formData.govtApprovalLetter.type.startsWith('image/')) {
        return (
          <img
            src={formData.govtApprovalLetter.cloudinaryUrl}
            alt="Govt Approval Letter"
            style={{ width: 120, borderRadius: 6, marginTop: 4 }}
          />
        );
      } else if (formData.govtApprovalLetter.type === 'application/pdf') {
        return (
          <a
            href={formData.govtApprovalLetter.cloudinaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#1976d2', textDecoration: 'underline' }}
          >
            View PDF
          </a>
        );
      } else {
        return formData.govtApprovalLetter.name || 'Document';
      }
    }
    
    // Check for new letter file (from formData)
    if (formData.newLetterFile) {
      if (formData.newLetterFile.type && formData.newLetterFile.type.startsWith('image/')) {
        return (
          <img
            src={URL.createObjectURL(formData.newLetterFile)}
            alt="Govt Approval Letter"
            style={{ width: 120, borderRadius: 6, marginTop: 4 }}
          />
        );
      } else if (formData.newLetterFile.type === 'application/pdf') {
        return (
          <a
            href={URL.createObjectURL(formData.newLetterFile)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#1976d2', textDecoration: 'underline' }}
          >
            View PDF
          </a>
        );
      } else {
        return formData.newLetterFile.name || 'Document';
      }
    } else if (formData.govtApprovalLetter) {
      // Legacy letter structure
      if (formData.govtApprovalLetter.type && formData.govtApprovalLetter.type.startsWith('image/')) {
        return (
          <img
            src={URL.createObjectURL(formData.govtApprovalLetter)}
            alt="Govt Approval Letter"
            style={{ width: 120, borderRadius: 6, marginTop: 4 }}
          />
        );
      } else if (formData.govtApprovalLetter.type === 'application/pdf') {
        return (
          <a
            href={URL.createObjectURL(formData.govtApprovalLetter)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#1976d2', textDecoration: 'underline' }}
          >
            View PDF
          </a>
        );
      } else {
        return formData.govtApprovalLetter.name || 'Document';
      }
    } else if (existingLetter) {
      // Existing Cloudinary file
      if (existingLetter.url && existingLetter.url.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return (
          <img
            src={existingLetter.url}
            alt="Govt Approval Letter"
            style={{ width: 120, borderRadius: 6, marginTop: 4 }}
          />
        );
      } else if (existingLetter.url && existingLetter.url.match(/\.pdf$/i)) {
        return (
          <a
            href={existingLetter.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#1976d2', textDecoration: 'underline' }}
          >
            View PDF
          </a>
        );
      } else {
        return existingLetter.filename || 'Document';
      }
    } else {
      return "Not uploaded";
    }
  };

  // Helper for images preview
  const renderEventImages = () => {
    // Combine existing and new images
    const allImages = [
      ...(existingImages || []),
      ...(formData.eventImages || [])
    ];
    
    if (!allImages || allImages.length === 0) {
      return (
        <span style={{ color: '#888', fontStyle: 'italic' }}>
          No images uploaded
        </span>
      );
    }

    return (
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
        {allImages.map((img, idx) => {
          // Handle uploaded images with cloudinaryUrl
          if (typeof img === 'object' && img.cloudinaryUrl) {
            return (
              <img
                key={`uploaded-${idx}`}
                src={img.cloudinaryUrl}
                alt={img.name || `Event Image ${idx + 1}`}
                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }}
                onError={(e) => {
                  console.error('Failed to load image:', img.cloudinaryUrl);
                  e.target.style.display = 'none';
                }}
              />
            );
          }
          
          // Handle new File objects
          if (img instanceof File) {
            return (
              <img
                key={`new-${idx}`}
                src={URL.createObjectURL(img)}
                alt={`Event Image ${idx + 1}`}
                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }}
              />
            );
          }
          
          // Handle existing Cloudinary images (with url property)
          if (typeof img === 'object' && img.url) {
            return (
              <img
                key={`existing-${idx}`}
                src={img.url}
                alt={img.filename || `Event Image ${idx + 1}`}
                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }}
              />
            );
          }
          
          // Handle other object structures (fallback)
          if (typeof img === 'object' && img.name) {
            return (
              <img
                key={`other-${idx}`}
                src={img.url || img.preview || ''}
                alt={img.name || `Event Image ${idx + 1}`}
                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            );
          }
          

          return null;
        })}
      </Box>
    );
  };



  return (
    <Box sx={{ p: 3, bgcolor: "white", borderRadius: 2, boxShadow: 3 }}>
      <Typography variant="h6" color="primary" gutterBottom>
        Event Preview
      </Typography>

      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle1" gutterBottom>
        Event Details
      </Typography>
      <List dense>
        {displayListItem("Title", formData.title)}
        {displayListItem("Description", formData.description)}
        {displayListItem("Location", formData.location)}
        {displayListItem("Start Date & Time", formData.startDateTime)}
        {displayListItem("End Date & Time", formData.endDateTime)}
        {displayListItem(
          "Max Volunteers",
          formData.unlimitedVolunteers ? "Unlimited" : formData.maxVolunteers
        )}
        {displayListItem("Event Type", formData.eventType)}
        {displayListItem("Group Registration", formData.groupRegistration ? "Enabled" : "Disabled")}
        {displayListItem("Recurring Event", formData.recurringEvent ? `Yes (${formData.recurringType} - ${formData.recurringValue})` : "No")}
        {formData.recurringEvent && (
          <>
            {displayListItem("Series End Date", formData.recurringEndDate || "No end date")}
            {displayListItem("Max Instances", formData.recurringMaxInstances || "Unlimited")}
          </>
        )}
        {displayListItem("Other Equipment", formData.otherEquipment)}
        {displayListItem("Instructions", formData.instructions)}
        
        {/* Time Slots Section */}
        {formData.timeSlotsEnabled && formData.timeSlots && formData.timeSlots.length > 0 && (
          <>
            {displayListItem("Time Slots Enabled", "Yes")}
            <ListItem>
              <ListItemText
                primary="Time Slots & Categories"
                secondary={
                  <div>
                    {formData.timeSlots.map((slot, index) => (
                      <Box key={slot.id} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                          {slot.name} ({slot.startTime} - {slot.endTime})
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {slot.categories.map((category) => (
                            <Chip
                              key={category.id}
                              label={`${category.name}${category.maxVolunteers ? ` (Max: ${category.maxVolunteers})` : ' (Unlimited)'}`}
                              color="primary"
                              variant="outlined"
                              size="small"
                            />
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </div>
                }
                secondaryTypographyProps={{ component: 'div' }}
              />
            </ListItem>
          </>
        )}
        
        <ListItem>
          <ListItemText
            primary="Equipment Needed"
            secondary={
              formData.equipmentNeeded.length > 0
                ? (
                    <div>
                      {formData.equipmentNeeded.map((eq) => (
                        <Chip key={eq} label={eq} sx={{ mr: 1 }} />
                      ))}
                    </div>
                  )
                : "None"
            }
            primaryTypographyProps={{ fontWeight: "bold" }}
            secondaryTypographyProps={{ component: 'div' }}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="Images"
            secondary={renderEventImages()}
            primaryTypographyProps={{ fontWeight: "bold" }}
            secondaryTypographyProps={{ component: 'div' }}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="Govt Approval Letter"
            secondary={renderGovtApprovalLetter()}
            primaryTypographyProps={{ fontWeight: "bold" }}
          />
        </ListItem>
      </List>

      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle1" gutterBottom>
        Volunteer Experience Details
      </Typography>
      <List dense>
        {displayListItem("Water Provided", questionnaireData.waterProvided ? "Yes" : "No")}
        {displayListItem("Medical Support", questionnaireData.medicalSupport ? "Yes" : "No")}
        {displayListItem("Recommended Age Group", questionnaireData.ageGroup)}
        {displayListItem("Special Precautions", questionnaireData.precautions)}
        {displayListItem("Nearest Public Transport", questionnaireData.publicTransport)}
        {displayListItem("Contact Person", questionnaireData.contactPerson)}
      </List>

      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
        <Button variant="outlined" color="primary" onClick={onBack}>
          Back
        </Button>
        <SubmitButton
          onClick={() => {

            if (typeof onSubmit === 'function') {
              onSubmit();
            } else {
              console.error('[EventPreview] onSubmit prop is not a function', { onSubmitType: typeof onSubmit });
            }
          }}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium"
        >
          Submit Event
        </SubmitButton>
      </Box>
    </Box>
  );
}
