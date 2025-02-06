const express = require("express");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const Subscription = require("../models/subscription");
const authMiddleWare = require("../middleware/auth");

const router = express.Router();
require("dotenv").config();

const User = require("../models/Users");

const MOMO_URL = process.env.MOMO_BASE_URL;
const MOMO_PRIMARY_KEY = process.env.MOMO_PRIMARY_KEY;
const MOMO_ENV = process.env.MOMO_ENV;

const generateReferenceId = () => uuidv4();

// Register a new subscription;
router.post("/subscribe", authMiddleWare, async (req, res) => {
  try {
    const { phone, amount, endDate } = req.body;
    const referenceId = generateReferenceId();

    const newSubscription = new Subscription({
      phone,
      amount,
      referenceId,
      endDate: endDate,
      nextPaymentDate: new Date(),
    });

    await newSubscription.save();
    res.json({ message: "Subscription Created Successfully, ", referenceId });
  } catch (err) {
    console.log("Error: ", err);
    res.status(500).json({ error: "Failed to create subscription" });
  }
});

// Create a new API USER (used only in sandbox)
router.post("/create-api-user", async (req, res) => {
  const { xReferenceId, providedCallback } = req.body;
  console.log("xReferenceId: ", xReferenceId);
  try {
    const response = await axios.post(
      `${MOMO_URL}/v1_0/apiuser`,
      { providedCallback },
      {
        headers: {
          "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY,
          "Content-Type": "application/json",
          "X-Reference-Id": xReferenceId,
        },
      }
    );
    console.log("API User Created");
    return response.data;
  } catch (err) {
    console.error(
      "Failed To Create API USER:",
      err.response?.data || err.message
    );
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Create API KEY (used only in sandbox)
async function createAPIKey(xReferenceId) {
  console.log("xReferenceId: ", xReferenceId, "momo: ", MOMO_PRIMARY_KEY);

  try {
    const response = await axios.post(
      `${MOMO_URL}/v1_0/apiuser/${xReferenceId}/apikey`,
      {},
      {
        headers: {
          "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY,
        },
      }
    );
    console.log("Response: ", response);
    return response.data;
  } catch (err) {
    // console.error(
    //   "Failed to obtain MoMo access token:",
    //   err.response?.data || err.message
    // );
    console.log("Error: ", err);
    return null;
  }
}

// Get MOMO Access Token
async function getAccessToken(xReferenceId, apiKey) {
  console.log("Reference: ", xReferenceId);
  const auth = Buffer.from(`${xReferenceId}:${apiKey}`).toString("base64");
  console.log("Auth: ", auth);
  try {
    const response = await axios.post(
      `${MOMO_URL}/collection/token/`,
      {},
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Response: ", response.body);
    return response.data.access_token;
  } catch (err) {
    console.error(
      "Failed to obtain MoMo access token:",
      err.response?.data || err.message
    );
    return null;
  }
}

// Request Payment
router.post("/request-payment", async (req, res) => {
  try {
    const { phoneNumber, userId, amount, currency } = req.body;

    const xReferenceId = generateReferenceId();

    const apiKey = await createAPIKey(xReferenceId);
    console.log("apiKey: ", apiKey);
    if (!apiKey)
      return res
        .statusCode(500)
        .json({ message: "Failed To Retrieve API-KEY" });

    // const token = await getAccessToken(xReferenceId, apiKey);
    // if (!token)
    //   return res.status(500).json({ error: "Failed To Retrieve Access Token" });

    // const response = await axios.post(
    //   `${MOMO_BASE_URL}/collection/v1_0/requesttopay`,
    //   {
    //     amount: amount.toString(),
    //     currency: currency,
    //     externalId: "SUB123",
    //     payer: { payerType: "MSISDN", partyID: phoneNumber },
    //     payerMessage: "Subscription Payment",
    //     payeeNote: "Thank you for using our services",
    //   },
    //   {
    //     headers: {
    //       Authorization: `Bearer ${token}`,
    //       "X-Reference-Id": xReferenceId,
    //       "X-Target-Environment": MOMO_ENV,
    //       "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY,
    //       "Content-Type": "application/json",
    //     },
    //   }
    // );

    // await User.findByIdAndUpdate(userId, {
    //   $set: {
    //     subscription: {
    //       status: "pending",
    //       xReferenceId,
    //       amount,
    //       currency,
    //       paymentDate: new Date(),
    //     },
    //   },
    // });
    // res.json({ message: "Payment Request Sent", data: response.data });
    return "success";
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Check Payment Status
router.get("/payment-status/:userId", async (req, res) => {
  const { userId } = req.params.userId;
  try {
    const user = await User.findById(userId);
    if (!user || !user.subscription.referenceId)
      return res.status(400).json({ error: "No Payment Reference Found" });

    const referenceId = user.subscription.referenceId;

    const token = await getAccessToken();
    if (!token)
      return res.status(500).json({ error: "Failed To Get Access Token" });

    const response = await axios.post(
      `${MOMO_BASE_URL}/collection/v1_0/requesttopay/${referenceId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Target-Environment": MOMO_ENV,
          "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY,
        },
      }
    );

    if (response.data.status === "SCUCCESSFUL") {
      await User.findByIdAndUpdate(userId, {
        "subscription.status": "active",
      });
    }
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

module.exports = router;
