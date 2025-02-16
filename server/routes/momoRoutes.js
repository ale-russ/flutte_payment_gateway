const express = require("express");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const Subscription = require("../models/subscription");
const authMiddleWare = require("../middleware/auth");

const router = express.Router();
require("dotenv").config();

const User = require("../models/Users");

const {
  generateReferenceId,
  createApiUser,
  createAPIKey,
  getAccessToken,
  getApiUser,
} = require("../utils/momoUtils");

const MOMO_URL = process.env.MOMO_BASE_URL;
const MOMO_PRIMARY_KEY = process.env.MOMO_PRIMARY_KEY;
const MOMO_ENV = process.env.MOMO_ENV;

// Register a new subscription;
router.post("/subscribe", authMiddleWare, async (req, res) => {
  try {
    const { phone, amount, endDate } = req.body;
    if (!phone || !amount || !endDate)
      return res.status(400).json({ error: "Missing required fields" });

    // Check validation for amount
    if (amount <= 0)
      return res.status(400).json({ error: "Amount must be greater than 0" });

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

// Request Payment
router.post("/request-payment", async (req, res) => {
  try {
    const {
      phoneNumber,
      userId,
      amount,
      currency,
      externalId,
      payer,
      payerMessage,
      payeeNote,
    } = req.body;

    if (!phoneNumber || !userId || !amount || !currency)
      return res.status(400).json({ error: "Missing required Fileds" });

    // Check validation for amount
    if (amount <= 0)
      return res.status(400).json({ error: "Amount must be greater than 0" });

    let user = await User.findById(userId);
    if (!user) return res.status(400).json({ message: "User Not Found" });

    // Check if user has pending payment
    if (user?.subscription?.status === "PENDING")
      return res.status(400).json({ error: "User has Pending Payment" });

    let xReferenceId;
    let refernceIdExists;
    do {
      xReferenceId = generateReferenceId();
      refernceIdExists = await User.findOne({
        "subscription.referenceId": xReferenceId,
      });
    } while (refernceIdExists);

    let storedApiKey;

    if (!user.subscription?.subscription_key) {
      console.log("No subscription: userApiKey: ", user.apiUserId);
      await createApiUser(user.apiUserId);
      const { apiKey } = await createAPIKey(user.apiUserId);
      storedApiKey = apiKey;
    } else {
      storedApiKey = user.subscription?.subscription_key;
    }

    const storedApiUser = user.apiUserId;

    console.log("sotredApiKey: ", storedApiKey);
    console.log("storedApiUser: ", storedApiUser);

    if (!storedApiKey || !storedApiUser)
      return res.status(500).json({ message: "Missing MOMO API Credentials" });

    const token = await getAccessToken(storedApiUser, storedApiKey);
    if (!token)
      return res.status(500).json({ error: "Failed To Retrieve Access Token" });

    console.log("Token: ", token);

    const header = {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Reference-Id": xReferenceId,
        "X-Target-Environment": MOMO_ENV,
        "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY,
        "Content-Type": "application/json",
      },
    };

    const response = await axios.post(
      `${MOMO_URL}/collection/v1_0/requesttopay`,
      {
        amount: amount.toString(),
        currency: currency,
        externalId: xReferenceId,
        payer: { partyIdType: "MSISDN", partyId: phoneNumber },
        payerMessage: payerMessage ?? "Subscription Payment",
        payeeNote: payeeNote ?? "Thank you for using our services",
      },
      header
    );

    console.log("user.subscrpition: ", user?.subscription?.referenceId);

    if (!user.subscriptionHistory) user.subscriptionHistory = [];

    if (user?.subscription.referenceId) {
      user?.subscriptionHistory.push({ ...user?.subscription });
    }

    //update the active subscription
    user.subscription = {
      status: "PENDING",
      referenceId: storedApiUser,
      amount,
      currency,
      paymentReferenceId: xReferenceId,
      subscription_key: storedApiKey,
      paymentDate: new Date(),
    };

    await user.save();

    console.log("user: ", user);

    res.json({
      message: "Payment initiated",
      xReferenceId,
      status: response?.status,
      statusText: response?.statusText,
    });
  } catch (err) {
    console.log("Error: ", err.message);
    res.status(500).json({ error: err });
  }
});

// Check Payment Status
router.get("/payment-status/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const user = await User.findById(userId);

    console.log("USER: ", user);

    if (!user) return res.status(400).json({ error: "No User Found" });

    if (!user.subscription.referenceId)
      return res.status(400).json({ error: "No Payment Reference Found" });

    const referenceId = user.subscription.referenceId;
    const apiKey = user.subscription.subscription_key;

    // Get the payment reference ID from the externalId used in request-payment
    const paymentReferenceId = user.subscription.paymentReferenceId; // We need to store this during payment request

    if (!apiKey)
      return res.status(400).json({ error: "Unable To Fetch API KEY" });

    const token = await getAccessToken(referenceId, apiKey);

    if (!token)
      return res.status(500).json({ error: "Failed To Get Access Token" });

    const response = await axios.get(
      `${MOMO_URL}/collection/v1_0/requesttopay/${paymentReferenceId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Target-Environment": process.env.MOMO_ENV,
          "Ocp-Apim-Subscription-Key": process.env.MOMO_PRIMARY_KEY,
        },
      }
    );

    console.log("REsponse.data.status: ", response.data?.status);

    if (response.data.status === "SUCCESSFUL") {
      await User.findByIdAndUpdate(userId, {
        "subscription.status": "active",
      });
    }
    res.json(response.data);
  } catch (err) {
    console.log("ERROR: ", err.response?.data);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

module.exports = router;
