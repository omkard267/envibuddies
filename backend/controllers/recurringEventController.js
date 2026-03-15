const Event = require('../models/event');
const RecurringEventSeries = require('../models/recurringEventSeries');
const { 
  calculateNextRecurringDate, 
  createRecurringEventInstance,
  shouldCreateNextInstance,
  updateSeriesStatistics,
  getSeriesByEventId,
  getSeriesInstances,
  generateMissingSummaries
} = require('../utils/recurringEventUtils');

// Create next recurring event instance manually
exports.createNextInstance = async (req, res) => {
  try {
    const { seriesId } = req.params;
    const userId = req.user._id;

    // Find the series
    const series = await RecurringEventSeries.findById(seriesId);
    if (!series) {
      return res.status(404).json({ success: false, message: 'Recurring series not found' });
    }

    // Check if user is authorized
    if (series.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage this series' });
    }

    // Check if series is active
    if (series.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Series is not active' });
    }

    // Check if we've reached max instances
    if (series.maxInstances && series.totalInstancesCreated >= series.maxInstances) {
      return res.status(400).json({ success: false, message: 'Maximum instances reached' });
    }

    // Check if we've reached end date
    if (series.endDate && new Date() >= series.endDate) {
      return res.status(400).json({ success: false, message: 'Series has ended' });
    }

    // Get the last event in the series
    const lastEvent = await Event.findOne({ 
      recurringSeriesId: seriesId 
    }).sort({ recurringInstanceNumber: -1 });

    if (!lastEvent) {
      return res.status(404).json({ success: false, message: 'No previous event found in series' });
    }

    // Calculate next date
    const nextStartDate = calculateNextRecurringDate(
      lastEvent.startDateTime,
      series.recurringType,
      series.recurringValue
    );

    const duration = new Date(lastEvent.endDateTime) - new Date(lastEvent.startDateTime);
    const nextEndDate = new Date(nextStartDate.getTime() + duration);

    // Create new event instance
    const newInstanceNumber = lastEvent.recurringInstanceNumber + 1;
    
    const newEvent = await createRecurringEventInstance(
      series, 
      newInstanceNumber, 
      nextStartDate, 
      nextEndDate, 
      Event
    );

    // Update series
    series.totalInstancesCreated = newInstanceNumber;
    series.currentInstanceNumber = newInstanceNumber;
    await series.save();

    res.status(201).json({
      success: true,
      message: `Recurring event #${newInstanceNumber} created successfully`,
      event: newEvent
    });

  } catch (error) {
    console.error('Error creating next instance:', error);
    res.status(500).json({ success: false, message: 'Failed to create next instance' });
  }
};

// Get all recurring series for a user
exports.getUserRecurringSeries = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const series = await RecurringEventSeries.find({ 
      createdBy: userId 
    }).populate('organization').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: series
    });

  } catch (error) {
    console.error('Error fetching recurring series:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recurring series' });
  }
};

// Get series details with all instances
exports.getSeriesDetails = async (req, res) => {
  try {
    const { seriesId } = req.params;
    const userId = req.user._id;

    const series = await RecurringEventSeries.findById(seriesId)
      .populate('organization')
      .populate('createdBy', 'name username');

    if (!series) {
      return res.status(404).json({ success: false, message: 'Series not found' });
    }

    // Check authorization
    if (series.createdBy._id.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Get all instances
    const instances = await Event.find({ 
      recurringSeriesId: seriesId 
    }).sort({ recurringInstanceNumber: 1 });

    res.status(200).json({
      success: true,
      data: {
        series,
        instances
      }
    });

  } catch (error) {
    console.error('Error fetching series details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch series details' });
  }
};

// Update series status
exports.updateSeriesStatus = async (req, res) => {
  try {
    const { seriesId } = req.params;
    const { status } = req.body;
    const userId = req.user._id;

    const series = await RecurringEventSeries.findById(seriesId);
    if (!series) {
      return res.status(404).json({ success: false, message: 'Series not found' });
    }

    if (series.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    series.status = status;
    await series.save();

    // Update all future instances status
    await Event.updateMany(
      { 
        recurringSeriesId: seriesId,
        startDateTime: { $gt: new Date() }
      },
      { recurringStatus: status }
    );

    res.status(200).json({
      success: true,
      message: `Series status updated to ${status}`,
      data: series
    });

  } catch (error) {
    console.error('Error updating series status:', error);
    res.status(500).json({ success: false, message: 'Failed to update series status' });
  }
};

// Delete series (soft delete)
exports.deleteSeries = async (req, res) => {
  try {
    const { seriesId } = req.params;
    const userId = req.user._id;

    const series = await RecurringEventSeries.findById(seriesId);
    if (!series) {
      return res.status(404).json({ success: false, message: 'Series not found' });
    }

    if (series.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Soft delete - mark as cancelled
    series.status = 'cancelled';
    await series.save();

    // Cancel all future instances
    await Event.updateMany(
      { 
        recurringSeriesId: seriesId,
        startDateTime: { $gt: new Date() }
      },
      { recurringStatus: 'cancelled' }
    );

    res.status(200).json({
      success: true,
      message: 'Series cancelled successfully'
    });

  } catch (error) {
    console.error('Error deleting series:', error);
    res.status(500).json({ success: false, message: 'Failed to delete series' });
  }
};

// Get series statistics
exports.getSeriesStats = async (req, res) => {
  try {
    const { seriesId } = req.params;
    const userId = req.user._id;

    const series = await RecurringEventSeries.findById(seriesId);
    if (!series) {
      return res.status(404).json({ success: false, message: 'Series not found' });
    }

    if (series.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Get all instances with registration data
    const instances = await Event.find({ recurringSeriesId: seriesId })
      .populate('volunteers')
      .sort({ recurringInstanceNumber: 1 });

    let totalRegistrations = 0;
    let totalAttendances = 0;
    let completedInstances = 0;

    instances.forEach(instance => {
      totalRegistrations += instance.volunteers?.length || 0;
      
      // Count attendances (you might need to adjust this based on your attendance tracking)
      if (new Date(instance.endDateTime) < new Date()) {
        completedInstances++;
        // This is a simplified attendance count - adjust based on your actual attendance tracking
        totalAttendances += instance.volunteers?.length || 0;
      }
    });

    const averageAttendance = completedInstances > 0 ? totalAttendances / completedInstances : 0;

    res.status(200).json({
      success: true,
      data: {
        totalInstances: instances.length,
        completedInstances,
        upcomingInstances: instances.length - completedInstances,
        totalRegistrations,
        totalAttendances,
        averageAttendance: Math.round(averageAttendance * 100) / 100,
        instances
      }
    });

  } catch (error) {
    console.error('Error fetching series stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch series statistics' });
  }
};

// Generate AI summaries for series instances
exports.generateSummaries = async (req, res) => {
  try {
    const { seriesId } = req.params;
    const userId = req.user._id;

    const series = await RecurringEventSeries.findById(seriesId);
    if (!series) {
      return res.status(404).json({ success: false, message: 'Series not found' });
    }

    if (series.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Start the summary generation process in the background
    setImmediate(async () => {
      try {
        await generateMissingSummaries(seriesId);
      } catch (error) {
        console.error(`❌ Error generating summaries for series ${seriesId}:`, error);
      }
    });

    res.status(200).json({
      success: true,
      message: 'AI summary generation started in the background'
    });

  } catch (error) {
    console.error('Error starting summary generation:', error);
    res.status(500).json({ success: false, message: 'Failed to start summary generation' });
  }
}; 