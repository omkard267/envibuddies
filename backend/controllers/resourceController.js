const Resource = require("../models/resource");

// GET /api/resources - fetch all resources
exports.getAllResources = async (req, res) => {
  try {
    const resources = await Resource.find().sort({ createdAt: -1 });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch resources", error: err.message });
  }
};
