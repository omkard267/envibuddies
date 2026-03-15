const { addWeeks, addMonths, setDay, setDate } = require('date-fns');
const axios = require('axios');

// Helper function to calculate next recurring date
const calculateNextRecurringDate = (currentDate, recurringType, recurringValue) => {
  let nextDate = new Date(currentDate);
  
  if (recurringType === 'weekly') {
    // Find the next occurrence of the specified day
    const dayMap = {
      'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
      'Friday': 5, 'Saturday': 6, 'Sunday': 0
    };
    const targetDay = dayMap[recurringValue];
    
    // Move to next week
    nextDate = addWeeks(nextDate, 1);
    // Set to the specific day of the week
    nextDate = setDay(nextDate, targetDay);
  } else if (recurringType === 'monthly') {
    // Move to next month
    nextDate = addMonths(nextDate, 1);
    // Set to the specific day of the month
    const dayOfMonth = parseInt(recurringValue);
    nextDate = setDate(nextDate, dayOfMonth);
  }
  
  return nextDate;
};

// Helper function to create a new recurring event instance
const createRecurringEventInstance = async (series, instanceNumber, startDateTime, endDateTime, Event) => {
  const eventData = {
    title: series.title,
    description: series.description,
    location: series.location || '',
    mapLocation: series.mapLocation || { address: '', lat: null, lng: null },
    startDateTime: startDateTime,
    endDateTime: endDateTime,
    eventType: series.eventType,
    maxVolunteers: series.maxVolunteers,
    unlimitedVolunteers: series.unlimitedVolunteers,
    instructions: series.instructions,
    groupRegistration: series.groupRegistration,
    equipmentNeeded: series.equipmentNeeded || [],
    eventImages: series.eventImages || [],
    govtApprovalLetter: series.govtApprovalLetter,
    organization: series.organization,
    createdBy: series.createdBy,
    organizerTeam: series.organizerTeam.map(team => ({
      user: team.user,
      hasAttended: false
    })),
    
    // Recurring event fields
    recurringEvent: true,
    recurringType: series.recurringType,
    recurringValue: series.recurringValue,
    recurringSeriesId: series._id,
    recurringInstanceNumber: instanceNumber,
    isRecurringInstance: true,
    recurringStatus: 'active',
    
    // Questionnaire fields
    waterProvided: series.waterProvided,
    medicalSupport: series.medicalSupport,
    ageGroup: series.ageGroup,
    precautions: series.precautions,
    publicTransport: series.publicTransport,
    contactPerson: series.contactPerson,
  };

  const event = new Event(eventData);
  await event.save();
  
  // Generate AI summary for the new recurring instance
  setImmediate(async () => {
    try {
      const summaryPrompt = `Write a detailed, engaging, 150-word summary for this recurring event instance, including what the event is about, its importance, and interesting facts about the location or event type if possible.\n\nEvent: ${event.title}\nDescription: ${event.description}\nType: ${event.eventType}\nLocation: ${event.location}\nDate: ${event.startDateTime}\nOrganizer: ${event.organization}\nPrecautions: ${event.precautions}\nInstructions: ${event.instructions}\nRecurring Instance: #${event.recurringInstanceNumber}`;
      const res = await axios.post(`${process.env.API_URL || 'http://localhost:5000'}/api/ai-summary`, { prompt: summaryPrompt });
      const summary = res.data.summary;
      await Event.findByIdAndUpdate(event._id, { summary });
    } catch (err) {
      console.error('❌ Failed to generate AI summary for recurring instance:', err);
    }
  });
  
  return event;
};

// Helper function to check if next instance should be created
const shouldCreateNextInstance = (series, lastEvent) => {
  // Check if series is active
  if (series.status !== 'active') {
    return false;
  }

  // Check if we've reached max instances
  if (series.maxInstances && series.totalInstancesCreated >= series.maxInstances) {
    return false;
  }

  // Check if we've reached end date
  if (series.endDate && new Date() >= series.endDate) {
    return false;
  }

  // Check if last event has ended
  if (lastEvent && new Date(lastEvent.endDateTime) > new Date()) {
    return false;
  }

  return true;
};

// Helper function to update series statistics
const updateSeriesStatistics = async (series, RecurringEventSeries) => {
  try {
    // Get all instances for this series
    const Event = require('../models/event');
    const instances = await Event.find({ recurringSeriesId: series._id });
    
    let totalRegistrations = 0;
    let totalAttendances = 0;
    let completedInstances = 0;

    instances.forEach(instance => {
      totalRegistrations += instance.volunteers?.length || 0;
      
      // Count attendances (simplified - you might need to adjust based on your attendance tracking)
      if (new Date(instance.endDateTime) < new Date()) {
        completedInstances++;
        // This is a simplified attendance count - adjust based on your actual attendance tracking
        totalAttendances += instance.volunteers?.length || 0;
      }
    });

    const averageAttendance = completedInstances > 0 ? totalAttendances / completedInstances : 0;

    // Update series statistics
    await RecurringEventSeries.findByIdAndUpdate(series._id, {
      totalRegistrations,
      totalAttendances,
      averageAttendance: Math.round(averageAttendance * 100) / 100,
      totalInstancesCreated: instances.length
    });

    return {
      totalRegistrations,
      totalAttendances,
      averageAttendance: Math.round(averageAttendance * 100) / 100,
      totalInstances: instances.length,
      completedInstances
    };
  } catch (error) {
    console.error('Error updating series statistics:', error);
    throw error;
  }
};

// Helper function to get series by event ID
const getSeriesByEventId = async (eventId, RecurringEventSeries) => {
  try {
    const Event = require('../models/event');
    const event = await Event.findById(eventId);
    
    if (!event || !event.recurringSeriesId) {
      return null;
    }

    const series = await RecurringEventSeries.findById(event.recurringSeriesId);
    return series;
  } catch (error) {
    console.error('Error getting series by event ID:', error);
    return null;
  }
};

// Helper function to get all instances of a series
const getSeriesInstances = async (seriesId, Event) => {
  try {
    const instances = await Event.find({ 
      recurringSeriesId: seriesId 
    }).sort({ recurringInstanceNumber: 1 });
    
    return instances;
  } catch (error) {
    console.error('Error getting series instances:', error);
    return [];
  }
};

// Helper function to generate AI summaries for recurring instances that don't have them
const generateMissingSummaries = async (seriesId) => {
  try {
    const Event = require('../models/event');
    const instances = await Event.find({ 
      recurringSeriesId: seriesId,
      $or: [
        { summary: { $exists: false } },
        { summary: null },
        { summary: '' }
      ]
    });

    for (const instance of instances) {
      try {
        const summaryPrompt = `Write a detailed, engaging, 150-word summary for this recurring event instance, including what the event is about, its importance, and interesting facts about the location or event type if possible.\n\nEvent: ${instance.title}\nDescription: ${instance.description}\nType: ${instance.eventType}\nLocation: ${instance.location}\nDate: ${instance.startDateTime}\nOrganizer: ${instance.organization}\nPrecautions: ${instance.precautions}\nInstructions: ${instance.instructions}\nRecurring Instance: #${instance.recurringInstanceNumber}`;
        const res = await axios.post(`${process.env.API_URL || 'http://localhost:5000'}/api/ai-summary`, { prompt: summaryPrompt });
        const summary = res.data.summary;
        await Event.findByIdAndUpdate(instance._id, { summary });
        
        // Add a small delay to avoid overwhelming the AI service
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`❌ Failed to generate summary for instance #${instance.recurringInstanceNumber}:`, err);
      }
    }

  } catch (error) {
    console.error('Error generating missing summaries:', error);
  }
};

module.exports = {
  calculateNextRecurringDate,
  createRecurringEventInstance,
  shouldCreateNextInstance,
  updateSeriesStatistics,
  getSeriesByEventId,
  getSeriesInstances,
  generateMissingSummaries
}; 