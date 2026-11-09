const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      required: true,
      trim: true
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    image: {
      type: String,
      default: ""
    },

    brand: {
      type: String,
      default: ""
    },

    size: {
      type: String,
      default: ""
    },

    offer: {
      type: String,
      default: ""
    },

    unit: {
      type: String,
      default: ""
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Product", productSchema);
