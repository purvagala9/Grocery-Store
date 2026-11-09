const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const DefectiveItem = require("../models/DefectiveItem");

const router = express.Router();

const adjustInventory = async (order, direction) => {
  for (const item of order.items) {
    const product = await Product.findById(item.productId);

    if (!product) {
      continue;
    }

    const delta = Number(item.quantity) || 0;
    if (direction === "decrease") {
      product.quantity = Math.max(0, product.quantity - delta);
    } else if (direction === "increase") {
      product.quantity = Number(product.quantity) + delta;
    }

    await product.save();
  }
};


// CREATE ORDER
router.post("/", async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      phone,
      address,
      items,
      totalAmount,
      deliveryType,
      preferredTime,
    } = req.body;

    if (!customerName || !phone) {
      return res.status(400).json({
        message: "Customer name and phone are required",
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "Order must contain at least one item",
      });
    }

    const lastOrder = await Order.findOne().sort({ orderId: -1 }).select("orderId");
    const orderId = (lastOrder?.orderId || 0) + 1;
    const tokenNo = deliveryType === "Takeaway from store" ? orderId : null;

    const order = new Order({
      orderId,
      tokenNo,
      customerId: customerId || null,
      customerName,
      phone,
      address,
      items,
      totalAmount,
      deliveryType,
      preferredTime:
        deliveryType === "Home Delivery"
          ? preferredTime
          : "",
    });

    const savedOrder = await order.save();

    res.status(201).json(savedOrder);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create order",
      error: error.message,
    });
  }
});


// GET ALL ORDERS
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
});

// Clear the current order desk. This intentionally keeps products and defective-return records.
router.delete("/", async (_req, res) => {
  try {
    const result = await Order.deleteMany({});
    res.status(200).json({ deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: "Failed to clear orders", error: error.message });
  }
});


// GET SINGLE ORDER
router.get("/:id", async (req, res) => {
  try {
    const requestedId = req.params.id;
    let order = null;

    // The UI can send either the Mongo document id or the customer-facing order number.
    if (mongoose.Types.ObjectId.isValid(requestedId)) {
      order = await Order.findById(requestedId);
    } else if (/^\d+$/.test(requestedId)) {
      order = await Order.findOne({ orderId: Number(requestedId) });
    }

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch order",
      error: error.message,
    });
  }
});

// Log a partial return after an order has been completed.
router.post("/:id/returns", async (req, res) => {
  try {
    const { productId, quantity, reason, condition, notes = "" } = req.body;
    const returnQuantity = Number(quantity);
    if (!productId || !Number.isInteger(returnQuantity) || returnQuantity < 1 || !reason || !["Resellable", "Defective"].includes(condition)) {
      return res.status(400).json({ message: "Choose an item, quantity, reason, and return condition." });
    }

    const requestedId = req.params.id;
    const order = mongoose.Types.ObjectId.isValid(requestedId)
      ? await Order.findById(requestedId)
      : /^\d+$/.test(requestedId) ? await Order.findOne({ orderId: Number(requestedId) }) : null;
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "Completed") return res.status(400).json({ message: "Returns can be logged only for completed orders." });

    const orderedItem = order.items.find((item) => item.productId.toString() === productId.toString());
    if (!orderedItem) return res.status(400).json({ message: "This product was not part of the order." });
    const alreadyReturned = order.returns
      .filter((item) => item.productId.toString() === productId.toString())
      .reduce((total, item) => total + item.quantity, 0);
    if (returnQuantity > orderedItem.quantity - alreadyReturned) {
      return res.status(400).json({ message: `Only ${orderedItem.quantity - alreadyReturned} item(s) can still be returned.` });
    }

    const returnedItem = { productId: orderedItem.productId, name: orderedItem.name, quantity: returnQuantity, reason, condition, notes };
    order.returns.push(returnedItem);
    if (condition === "Resellable") {
      const product = await Product.findById(orderedItem.productId);
      if (!product) return res.status(404).json({ message: "Product no longer exists in inventory." });
      product.quantity += returnQuantity;
      await product.save();
    } else {
      await DefectiveItem.create({ orderId: order.orderId, orderReference: order._id, productId: orderedItem.productId, name: orderedItem.name, quantity: returnQuantity, reason, notes });
    }
    const updatedOrder = await order.save();
    res.status(201).json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: "Failed to log return", error: error.message });
  }
});


// UPDATE ORDER STATUS
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "Pending",
      "Accepted",
      "Preparing",
      "Ready",
      "Completed",
      "Cancelled",
      "Rejected",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status",
      });
    }

    const requestedId = req.params.id;
    let order = null;

    // Accept both the Mongo document id and the customer-facing order number.
    if (mongoose.Types.ObjectId.isValid(requestedId)) {
      order = await Order.findById(requestedId);
    } else if (/^\d+$/.test(requestedId)) {
      order = await Order.findOne({ orderId: Number(requestedId) });
    }

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (order.status === "Cancelled") {
      if (status === "Cancelled") {
        return res.status(200).json(order);
      }

      return res.status(400).json({
        message: "Cancelled orders cannot be updated.",
      });
    }

    if (order.status === "Completed") {
      if (status === "Completed") {
        return res.status(400).json({
          message: "Order already completed.",
        });
      }

      return res.status(400).json({
        message: "Completed orders cannot be updated.",
      });
    }

    if (status === "Completed" && !order.inventoryUpdated) {
      await adjustInventory(order, "decrease");
      order.inventoryUpdated = true;
    }

    const cancelWindowStatuses = ["Pending", "Accepted", "Preparing"];
    if (status === "Cancelled" && !cancelWindowStatuses.includes(order.status)) {
      return res.status(400).json({
        message: "Order can only be cancelled before it is ready.",
      });
    }

    if (status === "Rejected" && order.inventoryUpdated) {
      await adjustInventory(order, "increase");
      order.inventoryUpdated = false;
    }

    order.status = status;

    const updatedOrder = await order.save();

    res.status(200).json(updatedOrder);

  } catch (error) {
    res.status(500).json({
      message: "Failed to update order status",
      error: error.message,
    });
  }
});


module.exports = router;
