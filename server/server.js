const express = require("express");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

const authRoutes = require("./routes/authRoutes");
const momoRoutes = require("./routes/momoRoutes");
const connectDB = require("./config/db");

require("./cron");

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// enable cors for all requests
app.use(cors());
app.use(express.json()); // This ensures req.body is properly parsed
app.use(express.urlencoded()); // Support form-urlencoded

app.use("/api/auth", authRoutes);
app.use("/api/momo", momoRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
