const express = require("express");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// enable cors for all requests
app.use(cors());
app.use(express.json()); // This ensures req.body is properly parsed
app.use(express.urlencoded()); // Support form-urlencoded

// Momo API base url
const MOMO_BASE_URL = "https://sandbox.momodeveloper.mtn.com";
const mongoUrl = process.env.MONGO_URL;

const momoRoutes = require("./routes/momoRoutes");

app.use("/api/momo", momoRoutes);

// Generate Access token from MOMO API
// app.post("/get-token", async (req, res) => {
//   console.log("in get-token route");
//   try {
//     console.log("headers: ", req.headers["ocp-apim-subscription-key"]);
//     console.log("Authorization: ", req.headers);

//     const response = await axios.post(
//       `${MOMO_BASE_URL}/collection/token/`,
//       {},
//       {
//         headers: {
//           Authorization: req.headers.authorization,
//           "Ocp-Apim-Subscription-Key": req.headers["ocp-apim-subscription-key"],
//           "Content-Type": "application/json",
//         },
//       }
//     );
//     res.json(response.data);
//   } catch (err) {
//     console.log("Error: ", err.response?.data);
//     res.status(500).json({ error: err.response?.data || err.message });
//   }
// });

// // handle payment requests
// app.post("/request-payment", async (req, res) => {
//   const { amount, currency, payer } = req.body;

//   // Validate required fields
//   if (!amount || !currency || !payer) {
//     return res.status(400).json({ error: "Missing required fields" });
//   }

//   const body = {
//     amount: amount.toString(),
//     currency: currency,
//     externalId: "1234545",
//     payer: {
//       partyIdType: payer.payerType,
//       partyId: payer.partyId,
//     },
//     payerMessage: "Payment for service",
//     payeeNote: "Payment request",
//   };

//   try {
//     // Log the request details for debugging
//     console.log("Request Headers:", req.headers);
//     console.log("Request Body:", req.body);

//     const response = await axios.post(
//       `${MOMO_BASE_URL}/collection/v1_0/requesttopay`,
//       body,
//       {
//         headers: {
//           Authorization: req.headers["authorization"],
//           "X-Reference-Id": req.headers["x-reference-id"],
//           "X-Target-Environment": "sandbox",
//           "Ocp-Apim-Subscription-Key": req.headers["ocp-apim-subscription-key"],
//           "Content-Type": "application/json",
//         },
//       }
//     );
//     res.json(response.data);
//   } catch (err) {
//     console.log("Error Details:", {
//       status: err.response?.status,
//       statusText: err.response?.statusText,
//       data: err.response?.data,
//       headers: err.response?.headers,
//     });
//     res.status(err.response?.status || 500).json({
//       error: err.response?.data || err.message,
//       details: err.response?.data,
//     });
//   }
// });

// app.get("/get-payment-status", async (req, res) => {
//   const { xReferenceId, token, subscription } = req.body;
//   console.log("Body: ", req.body);
//   try {
//     const response = await axios.get(
//       `https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay/${xReferenceId}`,
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "X-Target-Environment": "sandbox",
//           "Ocp-Apim-Subscription-Key": subscription,
//         },
//       }
//     );

//     console.log("Response: ", response.body);
//     return response.body;
//   } catch (err) {
//     console.log("Error Details:", {
//       status: err.response?.status,
//       statusText: err.response?.statusText,
//       data: err.response?.data,
//       headers: err.response?.headers,
//     });
//     res.status(err.response?.status || 500).json({
//       error: err.response?.data || err.message,
//       details: err.response?.data,
//     });
//   }
// });

// console.log("url: ", mongoUrl);

mongoose
  .connect(mongoUrl)
  .then(() => console.log("CONNECTED TO MONGODB"))
  .catch((err) => console.log("MONGODB CONNECTION ERROR: ", err));

// Start server
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
