const SponsorshipIntent = require('../models/sponsorshipIntent');
const Organization = require('../models/organization');
const Event = require('../models/event');
const User = require('../models/user');
const Sponsorship = require('../models/sponsorship');
const { updateSponsorStatsOnSponsorshipChange, calculateTier } = require('../utils/sponsorUtils');

// Submit a new sponsorship intent
exports.submitIntent = async (req, res) => {
  try {
    const {
      sponsor,
      organizationId,
      organization, // Add this field
      eventId,
      event, // Add this field
      sponsorship,
      recognition,
      additionalInfo
    } = req.body;

    // Use organization if provided, otherwise fall back to organizationId
    const finalOrganizationId = organization || organizationId;
    const finalEventId = event || eventId;

    // Validate organization exists
    const organizationDoc = await Organization.findById(finalOrganizationId);
    if (!organizationDoc) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Validate event if provided
    if (finalEventId) {
      const eventDoc = await Event.findById(finalEventId);
      if (!eventDoc) {
        return res.status(404).json({ message: 'Event not found' });
      }
    }

    // Check if organization has sponsorship enabled (allow by default if not explicitly disabled)
    if (organizationDoc.sponsorship.enabled === false) {
      return res.status(400).json({ 
        message: 'This organization does not accept sponsorships' 
      });
    }

    // Check minimum contribution (only if organization has set a minimum)
    const minContribution = organizationDoc.sponsorship.minimumContribution || 0;
    const estimatedValue = Number(sponsorship.estimatedValue) || 0;
    
    if (minContribution > 0 && estimatedValue < minContribution) {
      return res.status(400).json({ 
        message: `Minimum contribution required is ₹${minContribution}` 
      });
    }

    // Ensure the sponsor user ID is set from the authenticated user
    if (!sponsor.user) {
      sponsor.user = req.user._id;
    }

    // Check if user already has a sponsor profile and use that data
    const Sponsor = require('../models/sponsor');
    const existingSponsor = await Sponsor.findOne({ user: req.user._id });
    
    if (existingSponsor) {
      // Update sponsor data with existing profile information
      sponsor.name = existingSponsor.contactPerson || sponsor.name;
      sponsor.email = existingSponsor.email || sponsor.email;
      sponsor.phone = existingSponsor.phone || sponsor.phone;
      sponsor.sponsorType = existingSponsor.sponsorType || sponsor.sponsorType;
      sponsor.location = existingSponsor.location || sponsor.location;
      
      if (existingSponsor.sponsorType === 'business' && existingSponsor.business) {
        sponsor.business = { ...existingSponsor.business, ...sponsor.business };
      } else if (existingSponsor.sponsorType === 'individual' && existingSponsor.individual) {
        sponsor.individual = { ...existingSponsor.individual, ...sponsor.individual };
      }
    }

    // Create sponsorship intent
    const intentData = {
      sponsor,
      organization: finalOrganizationId,
      event: finalEventId,
      sponsorship,
      recognition,
      additionalInfo,
      // Add initial change history entry
      changeHistory: [{
        timestamp: new Date(),
        changedBy: req.user._id,
        changeType: 'created',
        changes: [{
          field: 'Application Status',
          oldValue: 'None',
          newValue: 'PENDING'
        }, {
          field: 'Sponsorship Type',
          oldValue: 'None',
          newValue: sponsorship.type.toUpperCase()
        }, {
          field: 'Estimated Value',
          oldValue: 'None',
          newValue: `${sponsorship.currency || 'INR'} ${sponsorship.estimatedValue}`
        }],
        notes: 'Sponsorship application submitted'
      }]
    };

    const intent = await SponsorshipIntent.create(intentData);

    // Send email notification to organization admins (async, don't wait)
    sendEmailToAdmins(intent, organizationDoc).catch(err => {
      console.error('Error sending email notification:', err);
    });

    // Populate references for response
    const populatedIntent = await SponsorshipIntent.findById(intent._id)
      .populate('organization', 'name logo')
      .populate('event', 'title startDateTime');

    res.status(201).json({
      message: 'Sponsorship application submitted successfully',
      intent: populatedIntent
    });

  } catch (error) {
    console.error('Error submitting sponsorship intent:', error);
    res.status(500).json({
      message: 'Failed to submit sponsorship application',
      error: error.message
    });
  }
};

// Get all intents for an organization (admin view)
exports.getOrganizationIntents = async (req, res) => {
  try {

    
    const { organizationId } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      status,
      eventId 
    } = req.query;

    // Check if user is admin of the organization
    const isAdmin = await checkIfAdmin(req.user._id, organizationId);
    
    if (!isAdmin) {
      return res.status(403).json({ message: 'Access denied: Admin privileges required' });
    }

    const query = { organization: organizationId };

    // Apply filters
    if (status) query.status = status;
    if (eventId) query.event = eventId;
    
    const intents = await SponsorshipIntent.find(query)
      .populate('event', 'title startDateTime')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await SponsorshipIntent.countDocuments(query);

    const response = {
      intents,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    };
    res.json(response);

  } catch (error) {
    console.error('Error fetching organization intents:', error);
    res.status(500).json({
      message: 'Failed to fetch sponsorship applications',
      error: error.message
    });
  }
};



// Get intent by ID (with populated references)
exports.getIntentById = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized - User not authenticated' });
    }
    
    const { id } = req.params;
    const userId = req.user._id;

    const intent = await SponsorshipIntent.findById(id)
      .populate('organization', 'name logo')
      .populate('event', 'title startDateTime');

    if (!intent) {
      return res.status(404).json({
        message: 'Application not found'
      });
    }

    // Check if user has access to this intent
    const isOwner = intent.sponsor.user && intent.sponsor.user.toString() === userId.toString();
    const isAdmin = await checkIfAdmin(userId, intent.organization._id);
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: 'Access denied. You can only view your own applications or applications for organizations you admin.'
      });
    }

    // Populate user information for change history
    if (intent.changeHistory && intent.changeHistory.length > 0) {
      try {
        const userIds = [...new Set(intent.changeHistory.map(change => change.changedBy))];
        const users = await User.find({ _id: { $in: userIds } }).select('name username');
        const userMap = users.reduce((map, user) => {
          map[user._id.toString()] = user;
          return map;
        }, {});

        intent.changeHistory = intent.changeHistory.map(change => ({
          ...change.toObject(),
          changedByUser: userMap[change.changedBy.toString()]
        }));
      } catch (error) {
        console.error('Error populating change history users:', error);
        // Continue without user information if there's an error
      }
    }

    res.json(intent);

  } catch (error) {
    console.error('Error fetching intent:', error);
    res.status(500).json({
      message: 'Failed to fetch sponsorship application',
      error: error.message
    });
  }
};

// Update intent
exports.updateIntent = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized - User not authenticated' });
    }
    
    const { id } = req.params;
    const userId = req.user._id;
    const updateData = req.body;

    const intent = await SponsorshipIntent.findById(id);
    if (!intent) {
      return res.status(404).json({
        message: 'Application not found'
      });
    }

    // Check if user owns this intent
    if (!intent.sponsor.user || intent.sponsor.user.toString() !== userId.toString()) {
      return res.status(403).json({
        message: 'Access denied. You can only update your own applications.'
      });
    }

    // Check if intent can be updated (not converted or rejected)
    if (intent.status === 'converted' || intent.status === 'rejected') {
      return res.status(400).json({
        message: 'Cannot update application that has been converted or rejected.'
      });
    }

    // Track meaningful changes for version history
    const changes = [];
    
    // Helper function to safely get nested object values
    const getNestedValue = (obj, path) => {
      return path.split('.').reduce((current, key) => current?.[key], obj);
    };

    // Helper function to format values for display
    const formatValue = (value, fieldName) => {
      if (value === null || value === undefined || value === '') {
        return 'Empty';
      }
      
      // Handle arrays
      if (Array.isArray(value)) {
        if (value.length === 0) return 'Empty';
        return value.join(', ');
      }
      
      // Handle objects
      if (typeof value === 'object' && value !== null) {
        if (Object.keys(value).length === 0) return 'Empty';
        return JSON.stringify(value);
      }
      
      // Handle specific field types
      if (fieldName.toLowerCase().includes('value') && typeof value === 'number') {
        return `₹${value}`;
      }
      if (fieldName.toLowerCase().includes('currency')) {
        return value.toUpperCase();
      }
      if (fieldName.toLowerCase().includes('amount') && typeof value === 'number') {
        return `₹${value}`;
      }
      if (fieldName.toLowerCase().includes('type')) {
        return value.toUpperCase();
      }
      if (fieldName.toLowerCase().includes('level')) {
        return value.charAt(0).toUpperCase() + value.slice(1);
      }
      
      // Handle boolean values
      if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
      }
      
      // Handle strings - truncate if too long
      if (typeof value === 'string') {
        if (value.length > 50) {
          return value.substring(0, 50) + '...';
        }
        return value;
      }
      
      return value;
    };

    // Helper function to check if a field should be tracked
    const shouldTrackField = (fieldName) => {
      const excludedFields = [
        'organizationId', 'eventId', 'organization', 'event', 
        'updatedAt', 'createdAt', 'changeHistory', 'adminSuggestions',
        'convertedTo', 'sponsorshipDeleted', 'emailNotifications',
        'files', 'review', 'status'
      ];
      return !excludedFields.includes(fieldName);
    };

    // Helper function to get user-friendly field names
    const getFieldDisplayName = (fieldName) => {
      const fieldMappings = {
        'sponsorship.description': 'Sponsorship Description',
        'sponsorship.estimatedValue': 'Estimated Value',
        'sponsorship.currency': 'Currency',
        'sponsorship.type': 'Sponsorship Type',
        'sponsorship.monetary.amount': 'Monetary Amount',
        'sponsorship.goods.description': 'Goods Description',
        'sponsorship.service.description': 'Service Description',
        'sponsorship.media.description': 'Media Description',
        'recognition.recognitionLevel': 'Recognition Level',
        'recognition.specificBenefits': 'Specific Benefits',
        'recognition.additionalRequests': 'Additional Requests',
        'additionalInfo.howDidYouHear': 'How Did You Hear',
        'additionalInfo.previousExperience': 'Previous Experience',
        'additionalInfo.timeline': 'Timeline',
        'additionalInfo.specialRequirements': 'Special Requirements',
        'additionalInfo.questions': 'Questions',
        'sponsor.name': 'Sponsor Name',
        'sponsor.email': 'Sponsor Email',
        'sponsor.phone': 'Sponsor Phone',
        'sponsor.sponsorType': 'Sponsor Type',
        'sponsor.location': 'Sponsor Location',
        'sponsor.business.name': 'Business Name',
        'sponsor.business.industry': 'Business Industry',
        'sponsor.business.size': 'Business Size',
        'sponsor.individual.profession': 'Profession',
        'sponsor.individual.organization': 'Organization'
      };
      return fieldMappings[fieldName] || fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
    };

    // Track changes for all fields
    Object.keys(updateData).forEach(key => {
      if (key !== 'updatedAt' && key !== 'status' && key !== 'changeHistory' && key !== 'adminSuggestions') {
        const oldValue = getNestedValue(intent, key);
        const newValue = updateData[key];
        
        // Only track changes if the value actually changed
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          // Handle nested objects
          if (typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue)) {
            // Track changes in nested objects
            Object.keys(newValue).forEach(nestedKey => {
              const nestedOldValue = getNestedValue(intent, `${key}.${nestedKey}`);
              const nestedNewValue = newValue[nestedKey];
              
              if (JSON.stringify(nestedOldValue) !== JSON.stringify(nestedNewValue)) {
                const fieldPath = `${key}.${nestedKey}`;
                if (shouldTrackField(fieldPath)) {
                  const fieldName = getFieldDisplayName(fieldPath);
                  changes.push({
                    field: fieldName,
                    oldValue: formatValue(nestedOldValue, fieldName),
                    newValue: formatValue(nestedNewValue, fieldName)
                  });
                }
              }
            });
            
            // Also check for deeper nested objects (like business.industry, individual.profession)
            Object.keys(newValue).forEach(nestedKey => {
              if (typeof newValue[nestedKey] === 'object' && newValue[nestedKey] !== null && !Array.isArray(newValue[nestedKey])) {
                Object.keys(newValue[nestedKey]).forEach(deepKey => {
                  const deepOldValue = getNestedValue(intent, `${key}.${nestedKey}.${deepKey}`);
                  const deepNewValue = newValue[nestedKey][deepKey];
                  
                  if (JSON.stringify(deepOldValue) !== JSON.stringify(deepNewValue)) {
                    const fieldPath = `${key}.${nestedKey}.${deepKey}`;
                    if (shouldTrackField(fieldPath)) {
                      const fieldName = getFieldDisplayName(fieldPath);
                      changes.push({
                        field: fieldName,
                        oldValue: formatValue(deepOldValue, fieldName),
                        newValue: formatValue(deepNewValue, fieldName)
                      });
                    }
                  }
                });
              }
            });
          } else {
            // Handle simple fields
            if (shouldTrackField(key)) {
              const fieldName = getFieldDisplayName(key);
              changes.push({
                field: fieldName,
                oldValue: formatValue(oldValue, fieldName),
                newValue: formatValue(newValue, fieldName)
              });
            }
          }
        }
      }
    });

    // Check if admin suggestions were implemented
    if (intent.adminSuggestions && intent.adminSuggestions.requested.length > 0) {
      intent.adminSuggestions.requested.forEach(suggestion => {
        if (!suggestion.implemented) {
          // Check if the suggestion was addressed in the update
          const suggestionLower = suggestion.suggestion.toLowerCase();
          const updateDataString = JSON.stringify(updateData).toLowerCase();
          if (updateDataString.includes(suggestionLower) || 
              (suggestion.field === 'general' && updateDataString.length > 100)) {
            suggestion.implemented = true;
            suggestion.implementedAt = new Date();
          }
        }
      });
      intent.adminSuggestions.lastUpdated = new Date();
    }

    // Prepare update data
    const finalUpdateData = {
      ...updateData,
      updatedAt: new Date(),
      // Reset status to pending if it was changes_requested
      status: intent.status === 'changes_requested' ? 'pending' : intent.status
    };

    // Ensure sponsor.user is never overwritten
    if (finalUpdateData.sponsor && !finalUpdateData.sponsor.user) {
      finalUpdateData.sponsor.user = intent.sponsor.user;
    }

    // Add change history only if there are meaningful changes
    if (changes.length > 0) {
      finalUpdateData.changeHistory = [
        ...intent.changeHistory,
        {
          timestamp: new Date(),
          changedBy: userId,
          changeType: 'updated',
          changes: changes,
          notes: `Application updated by user - ${changes.length} field(s) modified`
        }
      ];
    }

    // Update the intent
    const updatedIntent = await SponsorshipIntent.findByIdAndUpdate(
      id,
      finalUpdateData,
      { new: true }
    ).populate('organization', 'name')
     .populate('event', 'title');

    res.json({
      message: 'Application updated successfully',
      intent: updatedIntent
    });
  } catch (error) {
    console.error('Error updating intent:', error);
    res.status(500).json({
      message: 'Failed to update application',
      error: error.message
    });
  }
};

// Delete intent
exports.deleteIntent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const intent = await SponsorshipIntent.findById(id);
    if (!intent) {
      return res.status(404).json({
        message: 'Application not found'
      });
    }

    // Check if user owns this intent
    if (intent.sponsor.user.toString() !== userId.toString()) {
      return res.status(403).json({
        message: 'Access denied. You can only delete your own applications.'
      });
    }

    // Check if intent can be deleted (not converted)
    if (intent.status === 'converted') {
      return res.status(400).json({
        message: 'Cannot delete application that has been converted to sponsorship.'
      });
    }

    await SponsorshipIntent.findByIdAndDelete(id);

    res.json({
      message: 'Application deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting intent:', error);
    res.status(500).json({
      message: 'Failed to delete application',
      error: error.message
    });
  }
};

// Review sponsorship intent (approve/reject/request changes)
exports.reviewIntent = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      decision, 
      reviewNotes, 
      adminNotes,
      convertToSponsorship = false,
      sponsorshipUpdates 
    } = req.body;
    const adminId = req.user._id;

    const intent = await SponsorshipIntent.findById(id);
    if (!intent) {
      return res.status(404).json({ message: 'Sponsorship application not found' });
    }

    // Check if user is admin of the organization
    const isAdmin = await checkIfAdmin(adminId, intent.organization);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Access denied. Only organization admins can review applications.' });
    }

    // Track changes for change history
    const changes = [];
    const previousStatus = intent.status;
    const previousDecision = intent.review?.decision;
    const previousReviewNotes = intent.review?.reviewNotes;
    const previousAdminNotes = intent.review?.adminNotes;
    const previousDescription = intent.sponsorship?.description;
    const previousEstimatedValue = intent.sponsorship?.estimatedValue;
    const previousCurrency = intent.sponsorship?.currency;

    // Update review details
    intent.review.reviewedAt = new Date();
    intent.review.reviewedBy = adminId;
    intent.review.reviewNotes = reviewNotes;
    intent.review.adminNotes = adminNotes;
    intent.review.decision = decision;

    // Track review field changes
    if (previousDecision !== decision) {
      changes.push({
        field: 'Review Decision',
        oldValue: previousDecision ? previousDecision.replace('_', ' ').toUpperCase() : 'None',
        newValue: decision.replace('_', ' ').toUpperCase()
      });
    }

    if (previousReviewNotes !== reviewNotes) {
      changes.push({
        field: 'Review Notes',
        oldValue: previousReviewNotes || 'None',
        newValue: reviewNotes || 'None'
      });
    }

    if (previousAdminNotes !== adminNotes) {
      changes.push({
        field: 'Admin Notes',
        oldValue: previousAdminNotes || 'None',
        newValue: adminNotes || 'None'
      });
    }

    // Update sponsorship details if provided
    if (sponsorshipUpdates) {
      if (sponsorshipUpdates.description && sponsorshipUpdates.description !== previousDescription) {
        changes.push({
          field: 'Sponsorship Description',
          oldValue: previousDescription || 'None',
          newValue: sponsorshipUpdates.description
        });
        intent.sponsorship.description = sponsorshipUpdates.description;
      }
      if (sponsorshipUpdates.estimatedValue !== undefined && sponsorshipUpdates.estimatedValue !== previousEstimatedValue) {
        changes.push({
          field: 'Estimated Value',
          oldValue: previousEstimatedValue ? `${previousCurrency || 'INR'} ${previousEstimatedValue}` : 'None',
          newValue: `${sponsorshipUpdates.currency || 'INR'} ${sponsorshipUpdates.estimatedValue}`
        });
        intent.sponsorship.estimatedValue = sponsorshipUpdates.estimatedValue;
      }
      if (sponsorshipUpdates.currency && sponsorshipUpdates.currency !== previousCurrency) {
        changes.push({
          field: 'Currency',
          oldValue: previousCurrency || 'INR',
          newValue: sponsorshipUpdates.currency
        });
        intent.sponsorship.currency = sponsorshipUpdates.currency;
      }
    }

    // Handle previous conversion if changing from converted status
    const wasConverted = intent.status === 'converted';
    
    // Handle different decision types
    switch (decision) {
      case 'approve':
        intent.status = 'approved';
        intent.review = {
          decision: decision,
          reviewNotes: reviewNotes,
          adminNotes: adminNotes,
          reviewedBy: adminId,
          reviewedAt: new Date()
        };
        break;
        
      case 'reject':
        intent.status = 'rejected';
        intent.review = {
          decision: decision,
          reviewNotes: reviewNotes,
          adminNotes: adminNotes,
          reviewedBy: adminId,
          reviewedAt: new Date()
        };
        break;
        
      case 'request_changes':
        intent.status = 'changes_requested';
        intent.review = {
          decision: decision,
          reviewNotes: reviewNotes,
          adminNotes: adminNotes,
          reviewedBy: adminId,
          reviewedAt: new Date()
        };
        break;
        
      case 'convert_to_sponsorship':
        // Check if this is a monetary sponsorship intent without payment
        if (intent.sponsorship.type === 'monetary' && 
            (!intent.payment || intent.payment.status !== 'completed')) {
          
          // Check if admin is manually confirming the conversion (bypassing payment)
          const isManualConversion = req.body.manualConversion === true;
          
          if (!isManualConversion) {
            return res.status(400).json({
              message: 'Cannot convert monetary sponsorship intent without payment',
              details: {
                sponsorshipType: intent.sponsorship.type,
                paymentStatus: intent.payment?.status || 'no_payment',
                estimatedValue: intent.sponsorship.estimatedValue,
                warning: `This is a monetary sponsorship of ₹${intent.sponsorship.estimatedValue}. Payment must be completed before conversion.`,
                instructions: 'Please ask the sponsor to complete the payment first, or use manual verification if payment was received outside the system.',
                requiresManualConfirmation: true
              }
            });
          } else {
            // Initialize payment object if it doesn't exist
            if (!intent.payment) {
              intent.payment = {};
            }
            
            // Mark payment as completed for manual conversion
            intent.payment.status = 'completed';
            intent.payment.paidAmount = intent.sponsorship.estimatedValue;
            intent.payment.paymentDate = new Date();
            intent.payment.verified = true;
            intent.payment.verifiedAt = new Date();
            intent.payment.verifiedBy = req.user._id;
            intent.payment.manualConversion = true;
            intent.payment.manualConversionNotes = req.body.manualConversionNotes || 'Payment received outside the system';
            
            // Add audit trail for manual conversion
            intent.changeHistory.push({
              timestamp: new Date(),
              changedBy: req.user._id,
              changeType: 'payment_status_changed',
              changes: [{
                field: 'Payment Status',
                oldValue: 'no_payment',
                newValue: 'completed (manual)'
              }],
              notes: 'Payment marked as completed through manual admin conversion',
              paymentContext: {
                previousPaymentStatus: 'no_payment',
                newPaymentStatus: 'completed',
                decisionBefore: intent.status,
                decisionAfter: 'convert_to_sponsorship',
                adminNotes: req.body.manualConversionNotes || 'Payment received outside the system'
              }
            });
          }
        }
        
        intent.status = 'converted';
        intent.review = {
          decision: decision,
          reviewNotes: reviewNotes,
          adminNotes: adminNotes,
          reviewedBy: adminId,
          reviewedAt: new Date()
        };
        break;

      // New decision types for existing sponsorships
      case 'delete_sponsorship':
        if (!intent.convertedTo) {
          return res.status(400).json({ 
            message: 'Cannot delete sponsorship: No sponsorship exists for this intent' 
          });
        }
        // Keep the same status but mark for deletion
        intent.review = {
          decision: decision,
          reviewNotes: reviewNotes,
          adminNotes: adminNotes,
          reviewedBy: adminId,
          reviewedAt: new Date()
        };
        break;
        
      case 'suspend_sponsorship':
        if (!intent.convertedTo) {
          return res.status(400).json({ 
            message: 'Cannot suspend sponsorship: No sponsorship exists for this intent' 
          });
        }
        // Keep the same status but mark for suspension
        intent.review = {
          decision: decision,
          reviewNotes: reviewNotes,
          adminNotes: adminNotes,
          reviewedBy: adminId,
          reviewedAt: new Date()
        };
        break;
        
      case 'reactivate_sponsorship':
        if (!intent.convertedTo) {
          return res.status(400).json({ 
            message: 'Cannot reactivate sponsorship: No sponsorship exists for this intent' 
          });
        }
        // Keep the same status but mark for reactivation
        intent.review = {
          decision: decision,
          reviewNotes: reviewNotes,
          adminNotes: adminNotes,
          reviewedBy: adminId,
          reviewedAt: new Date()
        };
        break;
    }

    // Track status change
    if (previousStatus !== intent.status) {
      changes.push({
        field: 'Application Status',
        oldValue: previousStatus.replace('_', ' ').toUpperCase(),
        newValue: intent.status.replace('_', ' ').toUpperCase()
      });
    }

    // Add change history entry if there are changes
    if (changes.length > 0) {
      intent.changeHistory.push({
        timestamp: new Date(),
        changedBy: adminId,
        changeType: 'reviewed',
        changes: changes,
        notes: `Application reviewed by admin - ${changes.length} field(s) modified`
      });
    }

    // Handle sponsorship creation/update logic
    if (decision === 'convert_to_sponsorship') {

      // Check if this intent was previously converted but the sponsorship was deleted
      if (wasConverted && intent.sponsorshipDeleted) {
        // This means the sponsorship was deleted, so we can create a new one
        intent.sponsorshipDeleted = false; // Reset the flag
        await convertIntentToSponsorship(intent);
      } else if (wasConverted && intent.convertedTo) {
        // Update existing sponsorship
        try {
          await updateExistingSponsorship(intent);
        } catch (error) {
          console.error('Error updating existing sponsorship:', error);
          // If update fails, create a new sponsorship
          await convertIntentToSponsorship(intent);
        }
      } else {
        // Create new sponsorship only if not already converted
        await convertIntentToSponsorship(intent);
      }
    } else if (wasConverted && intent.convertedTo && sponsorshipUpdates) {
      // If changing from converted status but have sponsorship updates, update the existing sponsorship
      try {
        await updateExistingSponsorship(intent);
      } catch (error) {
        console.error('Error updating existing sponsorship:', error);
      }
    }

    // Handle new sponsorship management decisions
    if (intent.convertedTo && ['delete_sponsorship', 'suspend_sponsorship', 'reactivate_sponsorship'].includes(decision)) {
      try {
        const existingSponsorship = await Sponsorship.findById(intent.convertedTo);
        
        if (!existingSponsorship) {
          return res.status(404).json({ 
            message: 'Sponsorship not found. It may have been already deleted.' 
          });
        }

        switch (decision) {
          case 'delete_sponsorship':
            
            // Delete the sponsorship
            const deleteResult = await Sponsorship.findByIdAndDelete(intent.convertedTo);
            
            // Update organization's sponsorship list
            await Organization.findByIdAndUpdate(intent.organization, {
              $pull: { sponsorships: intent.convertedTo }
            });
            
            // Update event's sponsorship list if applicable
            if (intent.event) {
              await Event.findByIdAndUpdate(intent.event, {
                $pull: { 'sponsorship.sponsorships': intent.convertedTo },
                $inc: { 
                  'sponsorship.totalSponsorshipValue': -(existingSponsorship.contribution.value || 0),
                  'sponsorship.sponsorCount': -1
                }
              });
            }
            
            // Clear the convertedTo reference and mark as deleted
            intent.convertedTo = undefined;
            intent.sponsorshipDeleted = true;
            intent.status = 'rejected'; // Change status to rejected after deletion
            break;
            
          case 'suspend_sponsorship':
            
            await Sponsorship.findByIdAndUpdate(intent.convertedTo, {
              status: 'suspended',
              'suspension.suspendedAt': new Date(),
              'suspension.suspendedBy': adminId,
              'suspension.suspensionReason': reviewNotes || 'Suspended by admin'
            });
            break;
            
          case 'reactivate_sponsorship':
            
            await Sponsorship.findByIdAndUpdate(intent.convertedTo, {
              status: 'active',
              'suspension.reactivatedAt': new Date(),
              'suspension.reactivatedBy': adminId
            });
            break;
        }
        
        // Update sponsor statistics after sponsorship changes
        if (existingSponsorship.sponsor) {
          await updateSponsorStatsOnSponsorshipChange(existingSponsorship.sponsor);
        }
        
      } catch (error) {
        console.error('Error handling sponsorship management decision:', error);
        return res.status(500).json({ 
          message: 'Failed to process sponsorship management decision',
          error: error.message 
        });
      }
    }

    // If changing from converted to non-converted, handle the sponsorship
    if (wasConverted && decision !== 'convert_to_sponsorship' && intent.convertedTo) {
      // Handle the existing sponsorship based on the new decision
      try {
        const existingSponsorship = await Sponsorship.findById(intent.convertedTo);
        
        if (existingSponsorship) {
          switch (decision) {
            case 'reject':
              // Delete the sponsorship entirely for rejected applications
              
              // Verify the sponsorship exists before deletion
              const sponsorshipToDelete = await Sponsorship.findById(intent.convertedTo);
              
              const deleteResult = await Sponsorship.findByIdAndDelete(intent.convertedTo);
              
              // Update organization's sponsorship list
              const orgUpdateResult = await Organization.findByIdAndUpdate(intent.organization, {
                $pull: { sponsorships: intent.convertedTo }
              });
              
              // Update event's sponsorship list if applicable
              if (intent.event) {
                const eventUpdateResult = await Event.findByIdAndUpdate(intent.event, {
                  $pull: { 'sponsorship.sponsorships': intent.convertedTo },
                  $inc: { 
                    'sponsorship.totalSponsorshipValue': -(existingSponsorship.contribution.value || 0),
                    'sponsorship.sponsorCount': -1
                  }
                });
              }
              
              // Clear the convertedTo reference and mark as deleted
              intent.convertedTo = undefined;
              intent.sponsorshipDeleted = true;
              break;
              
            case 'request_changes':
              // Suspend the sponsorship until changes are made
              await Sponsorship.findByIdAndUpdate(intent.convertedTo, {
                status: 'suspended',
                'suspension.suspendedAt': new Date(),
                'suspension.suspendedBy': adminId,
                'suspension.suspensionReason': 'Changes requested by admin'
              });
              break;
              
            case 'approve':
              // Reactivate the sponsorship if it was suspended
              await Sponsorship.findByIdAndUpdate(intent.convertedTo, {
                status: 'active',
                'suspension.reactivatedAt': new Date(),
                'suspension.reactivatedBy': adminId
              });
              break;
          }
          
          // Update sponsor statistics after sponsorship changes
          if (existingSponsorship.sponsor) {
            await updateSponsorStatsOnSponsorshipChange(existingSponsorship.sponsor);
          }
        }
      } catch (error) {
        console.error('Error handling sponsorship after decision change:', error);
        // If there's an error, at least clear the convertedTo reference
        intent.convertedTo = undefined;
      }
    }

    // Handle payment status preservation when changing decisions
    if (intent.payment && intent.payment.status === 'completed') {
      // If payment was already completed, preserve the payment status
      // and ensure the intent doesn't get reset to require payment again
      
      // If changing from approved to something else and back to approved,
      // the payment should still be considered valid
      if (decision === 'approve' && intent.payment.status === 'completed') {
        // Keep the payment status as completed
        intent.payment.status = 'completed';
        
        // Add audit trail for payment status preservation
        intent.changeHistory.push({
          timestamp: new Date(),
          changedBy: adminId,
          changeType: 'payment_status_changed',
          changes: [{
            field: 'Payment Status',
            oldValue: 'completed',
            newValue: 'completed (preserved)'
          }],
          notes: 'Payment status preserved during decision change',
          paymentContext: {
            previousPaymentStatus: 'completed',
            newPaymentStatus: 'completed',
            decisionBefore: previousStatus,
            decisionAfter: decision,
            adminNotes: 'Payment status maintained during admin decision change'
          }
        });
      }
    }

    // Add audit trail for decision changes
    if (previousStatus !== intent.status || intent.review?.decision !== decision) {
      intent.changeHistory.push({
        timestamp: new Date(),
        changedBy: adminId,
        changeType: 'decision_changed',
        changes: [
          {
            field: 'Application Status',
            oldValue: previousStatus.replace('_', ' ').toUpperCase(),
            newValue: intent.status.replace('_', ' ').toUpperCase()
          },
          {
            field: 'Admin Decision',
            oldValue: intent.review?.decision?.replace('_', ' ').toUpperCase() || 'None',
            newValue: decision.replace('_', ' ').toUpperCase()
          }
        ],
        notes: `Admin decision changed from ${previousStatus} to ${decision}`,
        paymentContext: {
          previousPaymentStatus: intent.payment?.status || 'none',
          newPaymentStatus: intent.payment?.status || 'none',
          decisionBefore: previousStatus,
          decisionAfter: decision,
          adminNotes: adminNotes || reviewNotes
        }
      });
    }

    // Save the intent after all sponsorship handling is complete
    await intent.save();

    // Send email notification to sponsor
    await sendEmailToSponsor(intent, decision);

    res.json({
      message: 'Sponsorship application reviewed successfully',
      intent
    });

  } catch (error) {
    console.error('Error reviewing intent:', error);
    res.status(500).json({
      message: 'Failed to review sponsorship application',
      error: error.message
    });
  }
};

// Get intents by user (for sponsors to track their applications)
exports.getUserIntents = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized - User not authenticated' });
    }
    
    const userId = req.user._id;
    const { 
      page = 1, 
      limit = 10, 
      status 
    } = req.query;

    const query = { 'sponsor.user': userId };

    // Apply filters
    if (status && status !== 'all') {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const intents = await SponsorshipIntent.find(query)
      .populate('organization', 'name logo')
      .populate('event', 'title startDateTime')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await SponsorshipIntent.countDocuments(query);

    res.json({
      intents,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Error fetching user intents:', error);
    res.status(500).json({
      message: 'Failed to fetch your sponsorship applications',
      error: error.message
    });
  }
};

// Add communication record
exports.addCommunication = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized - User not authenticated' });
    }
    
    const { id } = req.params;
    const { type, summary, nextAction } = req.body;
    const adminId = req.user._id;

    const intent = await SponsorshipIntent.findById(id);
    if (!intent) {
      return res.status(404).json({ message: 'Sponsorship application not found' });
    }

    intent.communications.push({
      type,
      date: new Date(),
      summary,
      nextAction,
      createdBy: adminId
    });

    await intent.save();

    res.json({
      message: 'Communication record added successfully',
      intent
    });

  } catch (error) {
    console.error('Error adding communication:', error);
    res.status(500).json({
      message: 'Failed to add communication record',
      error: error.message
    });
  }
};

// Delete sponsorship intent
exports.deleteIntent = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized - User not authenticated' });
    }
    
    const { id } = req.params;
    const userId = req.user._id;

    const intent = await SponsorshipIntent.findById(id);
    if (!intent) {
      return res.status(404).json({ message: 'Sponsorship application not found' });
    }

    // Check if user owns the intent or is admin of the organization
    const isOwner = intent.sponsor.user && intent.sponsor.user.toString() === userId.toString();
    const isAdmin = await checkIfAdmin(userId, intent.organization);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        message: 'You are not authorized to delete this application' 
      });
    }

    await SponsorshipIntent.findByIdAndDelete(id);

    res.json({ message: 'Sponsorship application deleted successfully' });

  } catch (error) {
    console.error('Error deleting intent:', error);
    res.status(500).json({
      message: 'Failed to delete sponsorship application',
      error: error.message
    });
  }
};

// Helper function to send email to organization admins
const sendEmailToAdmins = async (intent, organization) => {
  try {
    // Get organization admins
    const adminUsers = await User.find({
      _id: { $in: organization.team.filter(member => member.isAdmin).map(member => member.userId) }
    });

    // Mark email as sent (only if emailNotifications exists)
    if (intent.emailNotifications) {
      intent.emailNotifications.sentToAdmin = true;
      intent.emailNotifications.adminEmailSentAt = new Date();
      await intent.save();
    }

  } catch (error) {
    console.error('Error sending email to admins:', error);
  }
};

// Helper function to send email to sponsor
const sendEmailToSponsor = async (intent, decision) => {
  try {
    const isDecisionChange = intent.review?.reviewedAt && intent.review?.decision !== decision;
    
    const subject = decision === 'approve' ? 
      (isDecisionChange ? 'Sponsorship Application Decision Updated - Approved' : 'Sponsorship Application Approved') :
      decision === 'reject' ? 
      (isDecisionChange ? 'Sponsorship Application Decision Updated - Rejected' : 'Sponsorship Application Update') :
      decision === 'convert_to_sponsorship' ?
      (isDecisionChange ? 'Sponsorship Application Converted to Active Sponsorship' : 'Sponsorship Application Converted') :
      (isDecisionChange ? 'Sponsorship Application Decision Updated - Under Review' : 'Sponsorship Application Under Review');

    const body = decision === 'approve' ? 
      (isDecisionChange ? 
        `Your sponsorship application decision has been updated to APPROVED! We will contact you soon.` :
        `Your sponsorship application has been approved! We will contact you soon.`) :
      decision === 'reject' ? 
      (isDecisionChange ? 
        `Your sponsorship application decision has been updated to REJECTED. Please check the platform for details.` :
        `Your sponsorship application has been reviewed. Please check the platform for details.`) :
      decision === 'convert_to_sponsorship' ?
      (isDecisionChange ? 
        `Your sponsorship application has been converted to an active sponsorship! You are now an official sponsor.` :
        `Your sponsorship application has been converted to an active sponsorship! You are now an official sponsor.`) :
      (isDecisionChange ? 
        `Your sponsorship application decision has been updated. It is now under review. We will get back to you soon.` :
        `Your sponsorship application is under review. We will get back to you soon.`);

    // Mark email as sent (only if emailNotifications exists)
    if (intent.emailNotifications) {
      intent.emailNotifications.sentToSponsor = true;
      intent.emailNotifications.sponsorEmailSentAt = new Date();
      await intent.save();
    }

  } catch (error) {
    console.error('Error sending email to sponsor:', error);
  }
};

// Helper function to convert intent to sponsorship
const convertIntentToSponsorship = async (intent) => {
  try {
    // Find or create sponsor profile
    let sponsorId = intent.sponsor.user;
    const User = require('../models/user');
    const Sponsor = require('../models/sponsor');
    
    if (!sponsorId) {
      // Check if user already exists with this email
      let existingUser = await User.findOne({ email: intent.sponsor.email });
      
      if (existingUser) {
        // User exists, use their ID
        sponsorId = existingUser._id;
      } else {
        // Create a new user account for external sponsor
        
        // Generate a temporary password for external sponsors
        const bcrypt = require('bcryptjs');
        const tempPassword = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        
        const newUser = await User.create({
          name: intent.sponsor.name,
          username: `sponsor_${Date.now()}`,
          email: intent.sponsor.email,
          phone: intent.sponsor.phone,
          password: hashedPassword,
          role: 'volunteer',
          dateOfBirth: new Date('1990-01-01'), // Default date
          'sponsor.isSponsor': true
        });

        sponsorId = newUser._id;
      }
    }

    // Check if sponsor profile already exists for this user
    let existingSponsor = await Sponsor.findOne({ user: sponsorId });
    
    if (existingSponsor) {
      sponsorId = existingSponsor._id;
      
      // Update the existing sponsor profile with any new information from the intent
      const updateData = {};
      if (intent.sponsor.name && intent.sponsor.name !== existingSponsor.contactPerson) {
        updateData.contactPerson = intent.sponsor.name;
      }
      if (intent.sponsor.email && intent.sponsor.email !== existingSponsor.email) {
        updateData.email = intent.sponsor.email;
      }
      if (intent.sponsor.phone && intent.sponsor.phone !== existingSponsor.phone) {
        updateData.phone = intent.sponsor.phone;
      }
      
      if (Object.keys(updateData).length > 0) {
        await Sponsor.findByIdAndUpdate(existingSponsor._id, updateData);
      }
    } else {
      // Create sponsor profile
      const sponsorData = {
        user: sponsorId,
        sponsorType: intent.sponsor.sponsorType,
        contactPerson: intent.sponsor.name || 'Unknown',
        email: intent.sponsor.email,
        phone: intent.sponsor.phone,
        location: intent.sponsor.location || {}
      };

      // Validate required fields
      if (!sponsorData.email || !sponsorData.phone) {
        throw new Error('Email and phone are required for sponsor creation');
      }

      // Only include business or individual data based on sponsor type
      if (intent.sponsor.sponsorType === 'business' && intent.sponsor.business) {
        sponsorData.business = intent.sponsor.business;
      } else if (intent.sponsor.sponsorType === 'individual' && intent.sponsor.individual) {
        sponsorData.individual = intent.sponsor.individual;
      }

      const sponsor = await Sponsor.create(sponsorData);
      sponsorId = sponsor._id;
    }

    // Create sponsorship
    
    const sponsorship = await Sponsorship.create({
      sponsor: sponsorId,
      organization: intent.organization,
      event: intent.event,
      sponsorshipType: 'custom',
      customContribution: {
        description: intent.sponsorship.description,
        estimatedValue: intent.sponsorship.estimatedValue
      },
      contribution: {
        type: intent.sponsorship.type,
        description: intent.sponsorship.description,
        value: intent.sponsorship.estimatedValue
      },
      tier: {
        name: calculateTier(intent.sponsorship.estimatedValue),
        calculatedAt: new Date(),
        calculatedValue: intent.sponsorship.estimatedValue
      },
      status: 'active', // Payment is already completed, so set to active
      payment: {
        status: intent.sponsorship.type === 'monetary' ? 'completed' : 'completed',
        amount: intent.sponsorship.type === 'monetary' ? intent.sponsorship.estimatedValue : 0,
        paidAmount: intent.sponsorship.type === 'monetary' ? intent.sponsorship.estimatedValue : intent.sponsorship.estimatedValue
      },
      recognition: intent.recognition,
      period: {
        startDate: new Date(),
        isRecurring: false
      }
    });

    // Update organization's sponsorship list
    await Organization.findByIdAndUpdate(intent.organization, {
      $push: { sponsorships: sponsorship._id }
    });

    // Update event's sponsorship list if applicable
    if (intent.event) {
      await Event.findByIdAndUpdate(intent.event, {
        $push: { 'sponsorship.sponsorships': sponsorship._id },
        $inc: { 
          'sponsorship.totalSponsorshipValue': intent.sponsorship.estimatedValue,
          'sponsorship.sponsorCount': 1
        }
      });
    }

    // Link intent to sponsorship
    intent.convertedTo = sponsorship._id;
    // Note: Don't save here, let the calling function handle the save

    // Update sponsor statistics
    await updateSponsorStatsOnSponsorshipChange(sponsorId);

    return sponsorship;

  } catch (error) {
    console.error('Error converting intent to sponsorship:', error);
    throw error;
  }
};

// Update existing sponsorship with new data from intent
const updateExistingSponsorship = async (intent) => {
  try {
    // Validate that we have a valid sponsorship ID
    if (!intent.convertedTo) {
      throw new Error('No sponsorship reference found');
    }

    const existingSponsorship = await Sponsorship.findById(intent.convertedTo);
    
    if (!existingSponsorship) {
      // If sponsorship doesn't exist but intent thinks it's converted, 
      // clear the convertedTo reference and create a new sponsorship
      intent.convertedTo = undefined;
      intent.status = 'pending'; // Reset to pending so it can be converted again
      // Note: Don't save here, let the calling function handle the save
      
      // Create a new sponsorship instead
      return await convertIntentToSponsorship(intent);
    }

    // Update sponsorship details
    const updateData = {
      customContribution: {
        description: intent.sponsorship.description,
        estimatedValue: intent.sponsorship.estimatedValue
      },
      contribution: {
        type: intent.sponsorship.type,
        description: intent.sponsorship.description,
        value: intent.sponsorship.estimatedValue
      },
      tier: {
        name: calculateTier(intent.sponsorship.estimatedValue),
        calculatedAt: new Date(),
        calculatedValue: intent.sponsorship.estimatedValue
      },
      recognition: intent.recognition
    };

    // Update the sponsorship
    const updatedSponsorship = await Sponsorship.findByIdAndUpdate(
      intent.convertedTo,
      updateData,
      { new: true }
    );

    // Update event statistics if applicable
    if (intent.event) {
      const oldValue = existingSponsorship.contribution.value || 0;
      const newValue = intent.sponsorship.estimatedValue || 0;
      const valueDifference = newValue - oldValue;

      if (valueDifference !== 0) {
        await Event.findByIdAndUpdate(intent.event, {
          $inc: { 
            'sponsorship.totalSponsorshipValue': valueDifference
          }
        });
      }
    }

    // Update sponsor statistics
    await updateSponsorStatsOnSponsorshipChange(existingSponsorship.sponsor);

    return updatedSponsorship;

  } catch (error) {
    console.error('Error updating existing sponsorship:', error);
    throw error;
  }
};

// Utility function to clean up orphaned intents (intents that reference non-existent sponsorships)
const cleanupOrphanedIntents = async () => {
  try {
    const orphanedIntents = await SponsorshipIntent.find({
      status: 'converted',
      convertedTo: { $exists: true, $ne: null }
    });

    let cleanedCount = 0;
    for (const intent of orphanedIntents) {
      const sponsorship = await Sponsorship.findById(intent.convertedTo);
      if (!sponsorship) {
        // Clear the invalid reference
        intent.convertedTo = undefined;
        intent.status = 'pending';
        await intent.save();
        cleanedCount++;
      }
    }

    return cleanedCount;
  } catch (error) {
    console.error('Error cleaning up orphaned intents:', error);
    return 0;
  }
};

// Export the cleanup function
exports.cleanupOrphanedIntents = async (req, res) => {
  try {
    const cleanedCount = await cleanupOrphanedIntents();
    res.json({
      message: `Cleaned up ${cleanedCount} orphaned intents`,
      cleanedCount
    });
  } catch (error) {
    console.error('Error in cleanup endpoint:', error);
    res.status(500).json({
      message: 'Failed to cleanup orphaned intents',
      error: error.message
    });
  }
};

// Helper function to check if user is admin of organization
const checkIfAdmin = async (userId, organizationId) => {
  try {
    const organization = await Organization.findById(organizationId);
    
    if (!organization) {
      return false;
    }
    
    // Check if user is the creator
    if (organization.createdBy.toString() === userId.toString()) {
      return true;
    }

    const teamMember = organization.team.find(
      member => member.userId.toString() === userId.toString() && member.isAdmin
    );

    return !!teamMember;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Export the convertIntentToSponsorship function for use in other controllers
exports.convertIntentToSponsorship = convertIntentToSponsorship; 