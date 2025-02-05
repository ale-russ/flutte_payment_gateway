const express = require("express");
const axios = require("axios");

const Subscription = require("../models/subscription");

const router = express.Router();
require("dotenv").config();

const MOMO_URL = process.env.MOMO_BASE_URL;
const MOMO_PRIMARY_KEY = process.env.MOMO_PRIMARY_KEY;
const MOMO_ENV = process.env.MOMO_ENV;

const generateReferenceId = () => Date.now().toString();

// Register a new subscription;
router.post("/subscribe", async (req, res) => {
  try {
    const { phone, amount } = req.body;
    const referenceId = generateReferenceId();

    const newSubscription = new Subscription({
      phone,
      amount,
      referenceId,
      nextPaymentDate: new Date(),
    });

    await newSubscription.save();
    res.json({ message: "Subscription Created Successfully, ", referenceId });
  } catch (err) {
    console.log("Error: ", err);
    res.status(500).json({ error: "Failed to create subscription" });
  }
});

// Get MOMO Access Token
async function getAccessToken() {
  const xReference = generateReferenceId();
  console.log("Reference: ", xReference);
  const auth = Buffer.from(
    `${process.env.MOMO_API_USER}:${process.env.MOMO_API_KEY}`
  ).toString("base64");
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
    return response.data.access_token;
  } catch (err) {
    console.error(
      "Failed to obtain MoMo access token:",
      err.response?.data || err.message
    );
    return null;
  }
}

async function getUserAPIKey() {
  try {
    const response = await axios.post(
      `${MOMO_URL}/v1_0/apiuser/d6c7b840-d7e4-455d-aca1-40dd4226f7c2/apikey`,
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
    console.error(
      "Failed to obtain MoMo access token:",
      err.response?.data || err.message
    );
    return null;
  }
}

// Process Subscription Key
router.post("/request-payment", async (req, res) => {
  try {
    const { phone } = req.body;
    const subscription = await Subscription.find({ phone });

    if (!subscription)
      return res.status(404).json({ error: "Subscription not Found" });

    const apiKey = await getUserAPIKey();
    console.log("apiKey: ", apiKey);
    const token = await getAccessToken();
    if (!token)
      return res.status(500).json({ error: "Failed to get access token" });

    const response = await axios.post(
      `${MOMO_BASE_URL}/collection/v1_0/requesttopay`,
      {
        amount: subscription.amount.toString(),
        currency: subscription.currency,
        externalId: "SUB123",
        payer: { payerType: "MSISDN", partyID: phone },
        payerMessage: "Subscription Payment",
        payeeNote: "Thank you for using our services",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Reference-Id": subscription.referenceId,
          "X-Target-Environment": MOMO_ENV,
          "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    res.json({ message: "Payment Request Sent", data: response.data });
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Check Payment Status
router.get("/payment-status/:referenceId", async (req, res) => {
  try {
    const token = await getAccessToken();
    if (!token)
      return res.status(500).json({ error: "Failed to get access token" });

    const response = await axios.post(
      `${MOMO_BASE_URL}/collection/v1_0/requesttopay/${req.params.referenceId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Target-Environment": MOMO_ENV,
          "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY,
        },
      }
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

module.exports = router;
