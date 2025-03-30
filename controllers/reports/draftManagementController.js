const DraftReport = require("../../models/draftReportModel");

// Get all drafts for the current user
const getUserDrafts = async (req, res) => {
  try {
    const drafts = await DraftReport.find({ userId: req.user._id });
    res.status(200).json({ drafts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a specific draft
const getDraft = async (req, res) => {
  try {
    const draft = await DraftReport.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!draft) {
      return res.status(404).json({ message: "Draft not found" });
    }

    res.status(200).json({ draft });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a draft
const updateDraft = async (req, res) => {
  try {
    const updateData = {
      description: req.body.description,
      severity: req.body.severity,
    };

    const draft = await DraftReport.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updateData,
      { new: true }
    );

    if (!draft) {
      return res.status(404).json({ message: "Draft not found" });
    }

    res.status(200).json({ message: "Draft updated successfully", draft });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a draft manually (though they auto-expire after 24 hours)
const deleteDraft = async (req, res) => {
  try {
    const draft = await DraftReport.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!draft) {
      return res.status(404).json({ message: "Draft not found" });
    }

    res.status(200).json({ message: "Draft deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getUserDrafts, getDraft, updateDraft, deleteDraft };
