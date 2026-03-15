const axios = require('axios');
const Event = require('../models/event');
const Registration = require('../models/registration');

// Helper function to get safe user data for reports
const getSafeUserDataForReports = (user) => {
  if (!user) {
    return {
      name: 'Unknown User',
      username: 'unknown_user',
      email: 'unknown@email.com'
    };
  }
  
  // If user is deleted but has actual data, preserve the actual data
  if (user.isDeleted) {
    return {
      name: user.name || 'Deleted User',
      username: user.username || 'deleted_user',
      email: user.email || 'deleted@email.com'
    };
  }
  
  return {
    name: user.name || 'Unknown User',
    username: user.username || 'unknown_user',
    email: user.email || 'unknown@email.com'
  };
};

// Check if event is eligible for report generation (50% questionnaires completed)
const checkReportEligibility = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const event = await Event.findById(eventId).populate('organizerTeam.user', 'name username email isDeleted');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check organizer questionnaire completion
    const totalOrganizers = event.organizerTeam.length;
    const completedOrganizerQuestionnaires = event.organizerTeam.filter(
      org => org.questionnaire.completed
    ).length;
    const organizerCompletionRate = totalOrganizers > 0 ? (completedOrganizerQuestionnaires / totalOrganizers) * 100 : 0;

    // Check volunteer questionnaire completion
    const totalVolunteers = await Registration.countDocuments({ eventId });
    const completedVolunteerQuestionnaires = await Registration.countDocuments({
      eventId,
      'questionnaire.completed': true
    });
    const volunteerCompletionRate = totalVolunteers > 0 ? (completedVolunteerQuestionnaires / totalVolunteers) * 100 : 0;

    const isEligible = organizerCompletionRate >= 50 && volunteerCompletionRate >= 50;

    res.json({
      isEligible,
      organizerCompletionRate: Math.round(organizerCompletionRate),
      volunteerCompletionRate: Math.round(volunteerCompletionRate),
      totalOrganizers,
      completedOrganizerQuestionnaires,
      totalVolunteers,
      completedVolunteerQuestionnaires,
      reportGenerated: event.report?.isGenerated || false
    });
  } catch (error) {
    console.error('Error checking report eligibility:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Generate AI report using GroqCloud
const generateEventReport = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user._id;

    const event = await Event.findById(eventId)
      .populate('organizerTeam.user', 'name username email role isDeleted')
      .populate('organization', 'name')
      .populate('createdBy', 'name email isDeleted');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is the creator of this event (only creator can generate/update reports)
    const isCreator = event.createdBy._id.toString() === userId.toString();
    
    if (!isCreator) {
      return res.status(403).json({ message: 'Only the event creator can generate reports' });
    }

    // Check eligibility again
    const totalOrganizers = event.organizerTeam.length;
    const completedOrganizerQuestionnaires = event.organizerTeam.filter(
      org => org.questionnaire.completed
    ).length;
    const organizerCompletionRate = totalOrganizers > 0 ? (completedOrganizerQuestionnaires / totalOrganizers) * 100 : 0;

    const totalVolunteers = await Registration.countDocuments({ eventId });
    const completedVolunteerQuestionnaires = await Registration.countDocuments({
      eventId,
      'questionnaire.completed': true
    });
    const volunteerCompletionRate = totalVolunteers > 0 ? (completedVolunteerQuestionnaires / totalVolunteers) * 100 : 0;

    if (organizerCompletionRate < 50 || volunteerCompletionRate < 50) {
      return res.status(400).json({ 
        message: 'Event not eligible for report generation. Need 50% questionnaire completion from both organizers and volunteers.' 
      });
    }

    // Check if this is an update request
    const isUpdate = event.report?.isGenerated;
    let lastGeneratedAt = null;
    
    if (isUpdate) {
      lastGeneratedAt = event.report.generatedAt;
    }

    // Fetch organizer questionnaires (completed ones) with safe user data
    let organizerQuestionnaires = event.organizerTeam
      .filter(org => org.questionnaire.completed)
      .map(org => {
        const safeUserData = getSafeUserDataForReports(org.user);
        return {
          organizerName: safeUserData.name,
          answers: org.questionnaire.answers,
          submittedAt: org.questionnaire.submittedAt
        };
      });

    // Fetch volunteer questionnaires (completed ones) with safe user data
    const volunteerRegistrations = await Registration.find({
      eventId,
      'questionnaire.completed': true
    }).populate('volunteerId', 'name username email isDeleted');

    let volunteerQuestionnaires = volunteerRegistrations.map(reg => {
      const safeUserData = getSafeUserDataForReports(reg.volunteerId);
      return {
        volunteerName: safeUserData.name,
        answers: reg.questionnaire.answers,
        submittedAt: reg.questionnaire.submittedAt
      };
    });

    // If this is an update, filter to only include new questionnaires submitted after last generation
    if (isUpdate && lastGeneratedAt) {
      organizerQuestionnaires = organizerQuestionnaires.filter(org => 
        new Date(org.submittedAt) > new Date(lastGeneratedAt)
      );
      volunteerQuestionnaires = volunteerQuestionnaires.filter(vol => 
        new Date(vol.submittedAt) > new Date(lastGeneratedAt)
      );
    }

    // Get safe event creator data
    const safeCreatorData = getSafeUserDataForReports(event.createdBy);
    const safeOrganizationData = event.organization ? { name: event.organization.name } : { name: 'N/A' };

    // Construct comprehensive prompt for GroqCloud
    const reportPrompt = `
${isUpdate ? 'UPDATE' : 'Generate'} a comprehensive, professional NGO event report for the following environmental conservation event. ${isUpdate ? 'This is an UPDATE to an existing report - focus on new feedback and changes since the last report generation.' : 'This report should be detailed, well-structured, and suitable for stakeholders, donors, and the public.'}

EVENT DETAILS:
- Title: ${event.title}
- Type: ${event.eventType}
- Description: ${event.description}
- Location: ${event.location}
        - Date: ${new Date(event.startDateTime).toLocaleDateString('en-GB')} to ${new Date(event.endDateTime).toLocaleDateString('en-GB')}
- Organization: ${safeOrganizationData.name}
- Total Registered Volunteers: ${totalVolunteers}
- Total Organizers: ${totalOrganizers}

EXISTING AI SUMMARY:
${event.summary}

ORGANIZER FEEDBACK (${organizerQuestionnaires.length} responses):
${organizerQuestionnaires.map((org, index) => `
Organizer ${index + 1} (${org.organizerName}):
${JSON.stringify(org.answers, null, 2)}
`).join('\n')}

VOLUNTEER FEEDBACK (${volunteerQuestionnaires.length} responses):
${volunteerQuestionnaires.map((vol, index) => `
Volunteer ${index + 1} (${vol.volunteerName}):
${JSON.stringify(vol.answers, null, 2)}
`).join('\n')}

REPORT REQUIREMENTS:
1. Create a professional, industry grade, relevant to this event domain, NGO-style event report (2000-3000 words)
2. Include executive summary, event overview, impact assessment, participant feedback analysis
3. Add relevant real-world environmental statistics, current scenario context, recent initiatives of government, recent technological advancements supporting such event types
4. Include recommendations for future events
5. Use professional formatting with clear sections and subsections
6. Incorporate actual data from questionnaires to show measurable impact
7. Add relevant environmental facts, recent technologies used for such events, why such events are good explain with historical data and todays scenario, and similar successful case studies
8. Make it suitable for donors, stakeholders, and public sharing. make sure to make it industry grade using professional words, no irrelevant information must be added

Structure the report with these sections:
- Executive Summary
- Event Overview
- Participation & Engagement
- Impact Assessment
- Feedback Analysis
- Recent Technologies, case studies, initiatives, recent government policies
- Challenges & Solutions
- Recommendations
- Conclusion

Make it comprehensive, data-driven, and professionally formatted for an NGO context.
`;

    // Call GroqCloud API
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      return res.status(500).json({ message: 'GroqCloud API key not configured' });
    }

    const groqResponse = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a professional report writer specializing in NGO and environmental conservation event reports. Generate comprehensive, well-structured reports suitable for stakeholders and donors.'
        },
        {
          role: 'user',
          content: reportPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const reportContent = groqResponse.data.choices[0].message.content;

    // Update event with generated report
    await Event.findByIdAndUpdate(eventId, {
      report: {
        content: reportContent,
        generatedAt: new Date(),
        generatedBy: userId,
        isGenerated: true
      }
    });

    res.json({
      message: isUpdate ? 'Report updated successfully' : 'Report generated successfully',
      reportContent,
      isUpdate
    });

  } catch (error) {
    console.error('Error generating report:', error);
    if (error.response?.data) {
      console.error('GroqCloud API Error:', error.response.data);
    }
    res.status(500).json({ 
      message: 'Failed to generate report',
      error: error.message 
    });
  }
};

// Get generated report
const getEventReport = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const event = await Event.findById(eventId)
      .populate('report.generatedBy', 'name email isDeleted')
      .select('report title eventType startDateTime endDateTime');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (!event.report?.isGenerated) {
      return res.status(404).json({ message: 'Report not generated yet' });
    }

    // Get safe user data for report generator
    const safeGeneratorData = getSafeUserDataForReports(event.report.generatedBy);

    res.json({
      report: {
        ...event.report.toObject(),
        generatedBy: {
          _id: event.report.generatedBy?._id,
          name: safeGeneratorData.name,
          email: safeGeneratorData.email
        }
      },
      eventTitle: event.title,
      eventType: event.eventType,
      eventDate: event.startDateTime
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  checkReportEligibility,
  generateEventReport,
  getEventReport
};
