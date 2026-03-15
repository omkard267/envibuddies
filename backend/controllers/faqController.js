const FAQ = require('../models/faq.js');

const getFaqs = async (req, res) => {
  try {
    const faqs = await FAQ.find({}).sort({ createdAt: -1 });
    res.json(faqs);
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({ message: 'Server error while fetching FAQs.' });
  }
};

module.exports = { getFaqs }; 