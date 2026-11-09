const express = require("express");
const Product = require("../models/Product");

const router = express.Router();

// GET all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch products",
      error: error.message
    });
  }
});


// GET one product
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch product",
      error: error.message
    });
  }
});


// ADD product
router.post("/", async (req, res) => {
  try {
    const {
      name,
      category,
      price,
      image,
      brand,
      size,
      offer,
      unit,
      quantity,
      lowStockThreshold
    } = req.body;

    if (!name || !category || Number(price) <= 0 || Number(quantity) < 0) {
      return res.status(400).json({
        message: "Name, category, positive price, and non-negative quantity are required"
      });
    }

    const existingProduct = await Product.findOne({
      name: name.trim()
    });

    if (existingProduct) {
      return res.status(400).json({
        message: "Product already exists"
      });
    }

    const product = new Product({
      name,
      category,
      price,
      image,
      brand,
      size,
      offer,
      unit,
      quantity,
      lowStockThreshold: lowStockThreshold ?? 5
    });

    const savedProduct = await product.save();

    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(500).json({
      message: "Failed to add product",
      error: error.message
    });
  }
});


// UPDATE product
router.put("/:id", async (req, res) => {
  try {
    if (req.body.name !== undefined && !req.body.name.trim()) {
      return res.status(400).json({
        message: "Product name cannot be empty"
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    res.status(200).json(updatedProduct);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update product",
      error: error.message
    });
  }
});


// DELETE product
router.delete("/:id", async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(
      req.params.id
    );

    if (!deletedProduct) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    res.status(200).json({
      message: "Product deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete product",
      error: error.message
    });
  }
});

module.exports = router;
