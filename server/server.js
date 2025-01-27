const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

// enable cors for all requests
app.use(cors());
app.use(express.json()); // This ensures req.body is properly parsed
app.use(express.urlencoded()); // Support form-urlencoded

// Momo API base url
const MOMO_BASE_URL = "https://sandbox.momodeveloper.mtn.com";

// Generate Access token from MOMO API
app.post("/get-token", async (req, res) => {
  console.log("in get-token route");
  try {
    console.log("headers: ", req.headers["ocp-apim-subscription-key"]);
    console.log("Authorization: ", req.headers);

    const response = await axios.post(
      `${MOMO_BASE_URL}/collection/token/`,
      {},
      {
        headers: {
          Authorization: req.headers.authorization,
          "Ocp-Apim-Subscription-Key": req.headers["ocp-apim-subscription-key"],
          "Content-Type": "application/json",
        },
      }
    );
    res.json(response.data);
  } catch (err) {
    console.log("Error: ", err.response?.data);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// handle payment requests
app.post("/request-payment", async (req, res) => {
  const { amount, currency, phone } = req.body;

  console.log("Headers: ", req.headers);
  //   console.log("Body: ", req.body);

  try {
    const response = await axios.post(
      `https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay`,
      {
        amount: amount.toString(),
        currency: currency,
        externalId: "1234545",
        payer: {
          partyIdType: "MSISDN",
          partyId: phone,
        },
      },
      {
        headers: {
          Authorization: req.headers["authorization"],
          "X-Reference-Id": "dd4d9428-500b-49f0-95e5-d0e31447679f",
          "X-Target-Environment": "sandbox",
          "Ocp-Apim-Subscription-Key": "66fc1b57038248848486712100f1784b",
          "Content-Type": "application/json",
        },
      }
    );
    res.json(response.data);
  } catch (err) {
    console.log("Error: ", err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
