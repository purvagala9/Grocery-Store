const mongoose = require("mongoose");

const defectiveItemSchema = new mongoose.Schema(
  {
    orderId: { type: Number, required: true, index: true },
    orderReference: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true, trim: true },
    notes: { type: String, default: "", trim: true },
    status: { type: String, enum: ["Awaiting company", "Forwarded to company"], default: "Awaiting company" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DefectiveItem", defectiveItemSchema);
