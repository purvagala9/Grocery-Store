const express = require("express");
const mongoose = require("mongoose");
const DefectiveItem = require("../models/DefectiveItem");

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const items = await DefectiveItem.find().sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch defective items", error: error.message });
  }
});

router.put("/:id/forward", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid defective item id" });
    }
    const item = await DefectiveItem.findByIdAndUpdate(
      req.params.id,
      { status: "Forwarded to company" },
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: "Defective item not found" });
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ message: "Failed to forward defective item", error: error.message });
  }
});

module.exports = router;
