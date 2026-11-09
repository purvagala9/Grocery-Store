const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const productRoutes = require("./routes/productRoute");
const orderRoutes = require("./routes/orderRoutes");
const defectiveItemRoutes = require("./routes/defectiveItemRoutes");
const app = express();

app.use(cors());
app.use(express.json());

connectDB();
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/defective-items", defectiveItemRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Grocery Platform API is running"
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
