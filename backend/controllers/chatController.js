require('dotenv').config();
const axios = require('axios');
const Registration = require('../models/registration');
const Event = require('../models/event');
const User = require('../models/user');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const handleChat = async (req, res) => {
  try {
  const { message } = req.body;
    if (!message || typeof message !== 'string') {
    return res.status(400).json({ response: "No message provided." });
  }

    const lowerMsg = message.toLowerCase();
    const userId = req.user._id;

    // Personal query detection - check before generic rules
    const personalQueries = [
      {
        keywords: ["my next event", "when is my next event", "next event", "upcoming event"],
        handler: async () => {
          try {
            const now = new Date();
            const nextEvent = await Registration.findOne({
              volunteerId: userId,
              hasAttended: false
            })
            .populate({
              path: 'eventId',
              select: 'title startDateTime location mapLocation',
              match: { startDateTime: { $gt: now } }
            })
            .sort({ 'eventId.startDateTime': 1 });

            if (!nextEvent || !nextEvent.eventId) {
              return "You don't have any upcoming events registered. Check out our events page to find opportunities: https://envibuddies.me/events";
            }

            const event = nextEvent.eventId;
            const eventDate = new Date(event.startDateTime).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            const eventTime = new Date(event.startDateTime).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            });

            return `Your next event is "${event.title}" on ${eventDate} at ${eventTime}. Location: ${event.location || 'Check event details'}. View details: https://envibuddies.me/events/${event._id}`;
          } catch (error) {
            console.error('Error fetching next event:', error);
            return "Sorry, I couldn't fetch your next event right now. Please try again later.";
          }
        }
      },
      {
        keywords: ["how many events", "completed events", "events completed", "events i completed"],
        handler: async () => {
          try {
            const completedCount = await Registration.countDocuments({
              volunteerId: userId,
              hasAttended: true
            });

            if (completedCount === 0) {
              return "You haven't completed any events yet. Start your volunteering journey by joining an event: https://envibuddies.me/events";
            }

            return `You have completed ${completedCount} event${completedCount === 1 ? '' : 's'} so far! Keep up the great work!`;
          } catch (error) {
            console.error('Error fetching completed events count:', error);
            return "Sorry, I couldn't fetch your completed events count right now. Please try again later.";
          }
        }
      },
      {
        keywords: ["my certificates", "show me my certificates", "certificates", "my certificate"],
        handler: async () => {
          try {
            const eventsWithCertificates = await Event.find({
              'certificates.user': userId
            }).select('title certificates');

            if (!eventsWithCertificates || eventsWithCertificates.length === 0) {
              return "You haven't earned any certificates yet. Complete events to earn certificates!";
            }

            const certificateCount = eventsWithCertificates.reduce((total, event) => {
              return total + event.certificates.filter(cert => cert.user.toString() === userId.toString()).length;
            }, 0);

            return `You have earned ${certificateCount} certificate${certificateCount === 1 ? '' : 's'}! You can view and download them from your profile page: https://envibuddies.me/profile`;
          } catch (error) {
            console.error('Error fetching certificates:', error);
            return "Sorry, I couldn't fetch your certificates right now. Please try again later.";
          }
        }
      },
      {
        keywords: ["certificate for last event", "did i get certificate", "last event certificate"],
        handler: async () => {
          try {
            const lastCompletedEvent = await Registration.findOne({
              volunteerId: userId,
              hasAttended: true
            })
            .populate({
              path: 'eventId',
              select: 'title certificates',
              match: { 'certificates.user': userId }
            })
            .sort({ 'eventId.endDateTime': -1 });

            if (!lastCompletedEvent || !lastCompletedEvent.eventId) {
              return "You haven't completed any events yet, so no certificates have been issued.";
            }

            const event = lastCompletedEvent.eventId;
            const userCertificate = event.certificates.find(cert => cert.user.toString() === userId.toString());

            if (userCertificate) {
              return `Yes! You received a certificate for "${event.title}". You can download it from your profile page: https://envibuddies.me/profile`;
            } else {
              return `You completed "${event.title}" but no certificate was issued for this event. Certificates are typically awarded for special achievements or longer events.`;
            }
          } catch (error) {
            console.error('Error checking last event certificate:', error);
            return "Sorry, I couldn't check your certificate status right now. Please try again later.";
          }
        }
      },
      {
        keywords: ["when did i join", "join date", "when i joined", "member since"],
        handler: async () => {
          try {
            const user = await User.findById(userId).select('createdAt');
            if (!user) {
              return "Sorry, I couldn't find your account information.";
            }

            const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });

            const daysSinceJoin = Math.floor((new Date() - user.createdAt) / (1000 * 60 * 60 * 24));

            return `You joined EnviBuddies on ${joinDate}. That's ${daysSinceJoin} days of being part of our community! Thank you for your dedication to environmental causes.`;
          } catch (error) {
            console.error('Error fetching join date:', error);
            return "Sorry, I couldn't fetch your join date right now. Please try again later.";
          }
        }
      },
      {
        keywords: ["events this week", "upcoming events this week", "week events"],
        handler: async () => {
          try {
            const now = new Date();
            const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

            const weeklyEvents = await Registration.find({
              volunteerId: userId,
              hasAttended: false
            })
            .populate({
              path: 'eventId',
              select: 'title startDateTime location',
              match: { 
                startDateTime: { 
                  $gte: now, 
                  $lte: weekFromNow 
                } 
              }
            })
            .sort({ 'eventId.startDateTime': 1 });

            const validEvents = weeklyEvents.filter(reg => reg.eventId);

            if (validEvents.length === 0) {
              return "You don't have any events scheduled for this week. Check out upcoming events: https://envibuddies.me/events";
            }

            const eventList = validEvents.map(reg => {
              const event = reg.eventId;
              const eventDate = new Date(event.startDateTime).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              });
              return `• ${event.title} (${eventDate})`;
            }).join('\n');

            return `You have ${validEvents.length} event${validEvents.length === 1 ? '' : 's'} this week:\n${eventList}\n\nView all your events: https://envibuddies.me/volunteer/my-events`;
          } catch (error) {
            console.error('Error fetching weekly events:', error);
            return "Sorry, I couldn't fetch your weekly events right now. Please try again later.";
          }
        }
      },
      {
        keywords: ["events in", "city events", "events near"],
        handler: async () => {
          try {
            // Extract city name from message
            const cityMatch = lowerMsg.match(/events?\s+(?:in|near)\s+([a-zA-Z\s]+)/);
            if (!cityMatch) {
              return "Please specify a city. For example: 'events in Mumbai' or 'events near Delhi'";
            }

            const cityName = cityMatch[1].trim();
            const now = new Date();

            const cityEvents = await Event.find({
              'mapLocation.address': { $regex: cityName, $options: 'i' },
              startDateTime: { $gt: now }
            })
            .select('title startDateTime location mapLocation')
            .sort({ startDateTime: 1 })
            .limit(5);

            if (cityEvents.length === 0) {
              return `No upcoming events found in ${cityName}. Check out all events: https://envibuddies.me/events`;
            }

            const eventList = cityEvents.map(event => {
              const eventDate = new Date(event.startDateTime).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              });
              return `• ${event.title} (${eventDate})`;
            }).join('\n');

            return `Found ${cityEvents.length} upcoming event${cityEvents.length === 1 ? '' : 's'} in ${cityName}:\n${eventList}\n\nView all events: https://envibuddies.me/events`;
          } catch (error) {
            console.error('Error fetching city events:', error);
            return "Sorry, I couldn't search for events in that city right now. Please try again later.";
          }
        }
      },
      {
        keywords: ["my last event", "last event details", "details of last event"],
        handler: async () => {
          try {
            const lastEvent = await Registration.findOne({
              volunteerId: userId,
              hasAttended: true
            })
            .populate({
              path: 'eventId',
              select: 'title startDateTime endDateTime location description eventType'
            })
            .sort({ 'eventId.endDateTime': -1 });

            if (!lastEvent || !lastEvent.eventId) {
              return "You haven't completed any events yet. Start your volunteering journey: https://envibuddies.me/events";
            }

            const event = lastEvent.eventId;
            const eventDate = new Date(event.startDateTime).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });

            return `Your last completed event was "${event.title}" on ${eventDate}. Event type: ${event.eventType || 'General volunteering'}. Location: ${event.location || 'Check event details'}. View details: https://envibuddies.me/events/${event._id}`;
          } catch (error) {
            console.error('Error fetching last event details:', error);
            return "Sorry, I couldn't fetch your last event details right now. Please try again later.";
          }
        }
      },
      {
        keywords: ["registered events", "events i'm registered for", "my registrations"],
        handler: async () => {
          try {
            const now = new Date();
            const registeredEvents = await Registration.find({
              volunteerId: userId,
              hasAttended: false
            })
            .populate({
              path: 'eventId',
              select: 'title startDateTime location',
              match: { startDateTime: { $gt: now } }
            })
            .sort({ 'eventId.startDateTime': 1 });

            const validEvents = registeredEvents.filter(reg => reg.eventId);

            if (validEvents.length === 0) {
              return "You're not currently registered for any upcoming events. Browse and join events: https://envibuddies.me/events";
            }

            const eventList = validEvents.map(reg => {
              const event = reg.eventId;
              const eventDate = new Date(event.startDateTime).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              });
              return `• ${event.title} (${eventDate})`;
            }).join('\n');

            return `You're registered for ${validEvents.length} upcoming event${validEvents.length === 1 ? '' : 's'}:\n${eventList}\n\nManage your registrations: https://envibuddies.me/volunteer/my-events`;
          } catch (error) {
            console.error('Error fetching registered events:', error);
            return "Sorry, I couldn't fetch your registered events right now. Please try again later.";
          }
        }
      }
    ];

    // Check for personal queries first
    for (const query of personalQueries) {
      if (query.keywords.some(keyword => lowerMsg.includes(keyword))) {
        const response = await query.handler();
        return res.json({ response });
      }
    }

    // Simple rule-based responses (existing functionality)
  const rules = [
      { keywords: ["pricing", "cost", "price"], response: "https://envibuddies.me/pricing" },
    { keywords: ["hello", "hi", "hey"], response: "Hello! How can I assist you today?" },
      { keywords: ["reset password", "forgot password"], response: "https://envibuddies.me/forgot-password" },
      { keywords: ["contact", "support"], response: "mailto:support@envibuddies.me" },
    { keywords: ["features", "what can you do"], response: "I can help you with information about our platform, onboarding, and troubleshooting." },
    // New rules below:
      { keywords: ["register", "sign up", "create account"], response: "https://envibuddies.me/signup" },
      { keywords: ["login", "log in", "sign in"], response: "https://envibuddies.me/login" },
      { keywords: ["events", "upcoming events"], response: "https://envibuddies.me/events" },
      { keywords: ["volunteer", "join as volunteer"], response: "https://envibuddies.me/signup" },
      { keywords: ["organization", "partner"], response: "https://envibuddies.me/register-organization" },
      { keywords: ["faq", "frequently asked questions"], response: "https://envibuddies.me/faqs" },
    { keywords: ["location", "where are you based"], response: "We are based in India, but our platform is accessible globally." },
      { keywords: ["donate", "contribute"], response: "https://envibuddies.me/donate" },
    // ...add more as needed
  ];

  for (const rule of rules) {
    if (rule.keywords.some((kw) => lowerMsg.includes(kw))) {
      return res.json({ response: rule.response });
    }
  }

    // Fallback: OpenRouter DeepSeek R1 Distill Llama 70B (existing functionality)
  try {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      throw new Error("OpenRouter API key not set in .env");
    }
    const url = "https://openrouter.ai/api/v1/chat/completions";
    const body = {
      model: "deepseek/deepseek-r1-distill-llama-70b:free",
      messages: [
        { role: "user", content: message }
      ]
    };
    const response = await axios.post(url, body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://envibuddies.me', // Optional, for OpenRouter compliance
        'X-Title': 'EnviBuddies Assistant' // Optional, for OpenRouter compliance
      }
    });
    const data = response.data;
    const openRouterReply = data.choices?.[0]?.message?.content || "Sorry, I couldn't get a response from OpenRouter.";
    return res.json({ response: openRouterReply });
  } catch (error) {
    console.error("OpenRouter error:", error.response?.data || error.message);
    return res.json({ response: "Sorry, I'm having trouble reaching my AI brain right now. Please try again later." });
    }
  } catch (err) {
    console.error("Chat handler error:", err);
    return res.status(500).json({ response: "Sorry, something went wrong. Please try again." });
  }
};

module.exports = { handleChat }; 