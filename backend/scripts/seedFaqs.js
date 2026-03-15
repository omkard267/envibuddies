const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('../config/db');
const FAQ = require('../models/faq');

// Load env from backend/.env if present
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function seedFaqs() {
  try {
    await connectDB();

    const faqs = [
      {
        question: "What is EnviBuddies?",
        answer: "EnviBuddies is an environmental action platform designed to connect volunteers, NGOs, and the community to work towards environmental sustainability. It includes educational resources, cleanup initiatives, and awareness campaigns across domains such as e-waste management, radioactive cleanup, and more.",
        category: "general",
      },
      {
        question: "Who can use this platform?",
        answer: "The platform is open to everyone, including individuals, students, volunteers, educators, and NGOs who are passionate about contributing to environmental protection and awareness.",
        category: "general",
      },
      {
        question: "What features does EnviBuddies offer?",
        answer: "Key features include: Volunteer and NGO registration, real-time chat and notifications, AI-generated reports and content, Resource Center with blogs, videos, and research, event and campaign management, and profile dashboards for volunteers and organizers.",
        category: "general",
      },
      {
        question: "What is the Resource Center?",
        answer: "The Resource Center is a curated hub of educational materials categorized by environmental domains. It includes videos, blogs, PDFs, FAQs, news updates, and more, to help users learn and stay informed.",
        category: "general",
      },
      {
        question: "How is AI used in the platform?",
        answer: "AI is used to generate reports, content summaries, recommendations, and support automated communication to enhance the platform's efficiency and user experience.",
        category: "general",
      },
      {
        question: "What is the difference between a Volunteer and an Organizer?",
        answer: "Volunteers participate in campaigns and learning activities. Organizers (usually NGOs or project admins) create and manage events, upload resources, and interact with volunteers.",
        category: "general",
      },
      {
        question: "Can I switch my role after registration?",
        answer: "Role changes are limited to maintain data integrity. However, you can contact our support team for special requests or assistance.",
        category: "general",
      },
      {
        question: "How do I sign up as a volunteer?",
        answer: "Simply click on the 'Sign Up' button, select the 'Volunteer' role, and complete the registration form. Once registered, you can explore upcoming events and educational materials.",
        category: "volunteer",
      },
      {
        question: "Are there any age or qualification restrictions for volunteers?",
        answer: "Most events are open to all. However, some specialized campaigns may require minimum age or specific background knowledge, which will be clearly mentioned in the event description.",
        category: "volunteer",
      },
      {
        question: "Will I receive a certificate for volunteering?",
        answer: "Yes, volunteers may receive digital certificates of participation after completing campaigns or contributing significantly to initiatives.",
        category: "volunteer",
      },
      {
        question: "How do NGOs or organizations join the platform?",
        answer: "NGOs can register by selecting the 'Organizer' role during signup. After approval, they can start managing campaigns, uploading resources, and engaging with volunteers.",
        category: "organizer",
      },
      {
        question: "Can organizers upload their own content?",
        answer: "Yes, organizers can upload pre-approved content such as PDFs, videos, and articles for the Resource Center and event sections.",
        category: "organizer",
      },
      {
        question: "Is my personal data safe on this platform?",
        answer: "Absolutely. We follow industry best practices and encryption protocols to ensure your data is secure and used only for platform-related activities.",
        category: "general",
      },
      {
        question: "Will my contact details be shared publicly?",
        answer: "No. Your contact information is private and will not be visible to others unless explicitly authorized by you.",
        category: "general",
      },
      {
        question: "I forgot my password. How do I reset it?",
        answer: "Click on the 'Forgot Password' link on the login page and follow the instructions to reset your password via email.",
        category: "general",
      },
      {
        question: "The website isn’t working properly. What should I do?",
        answer: "Try refreshing the page or clearing your browser cache. If the issue persists, please contact our technical support team via the 'Contact Us' page.",
        category: "general",
      },
      {
        question: "How can I contact support?",
        answer: "You can reach our support team through the 'Contact Us' form available on the website. We typically respond within 24–48 hours.",
        category: "general",
      },
      {
        question: "Can I give feedback or suggest a new feature?",
        answer: "Absolutely! We welcome feedback and innovation ideas. Use the feedback form or email us directly to share your thoughts.",
        category: "general",
      },
    ];

    let upsertedCount = 0;
    for (const item of faqs) {
      const result = await FAQ.updateOne(
        { question: item.question },
        { $set: item },
        { upsert: true }
      );
      if (result.upsertedCount === 1 || (result.matchedCount === 1 && result.modifiedCount === 1)) {
        upsertedCount += 1;
      }
    }

    console.log(`FAQ seeding complete. Upserted or updated ${upsertedCount} entries.`);
  } catch (err) {
    console.error('Error seeding FAQs:', err);
    process.exitCode = 1;
  } finally {
    // Close the mongoose connection to exit the process cleanly
    const mongoose = require('mongoose');
    await mongoose.connection.close();
  }
}

seedFaqs();


