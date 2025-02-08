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
} = require("../utils/momoUtils");

const MOMO_URL = process.env.MOMO_BASE_URL;
const MOMO_PRIMARY_KEY = process.env.MOMO_PRIMARY_KEY;
const MOMO_ENV = process.env.MOMO_ENV;
// const NEW_REFERENCE_ID = "20c91c70-6426-434b-bc29-02d393788c0a";

// const generateReferenceId = () => uuidv4();

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
// async function createApiUser(xReferenceId) {
//   try {
//     const response = await axios.post(
//       `${MOMO_URL}/v1_0/apiuser`,
//       { providerCallbackHost: "String" },
//       {
//         headers: {
//           "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY,
//           "Content-Type": "application/json",
//           "X-Reference-Id": xReferenceId,
//         },
//       }
//     );

//     return response.data;
//   } catch (err) {
//     console.error(
//       "Failed To Create API USER:",
//       err.response?.data || err.message
//     );
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// }

// // Create API KEY (used only in sandbox)
// async function createAPIKey(xReferenceId) {
//   try {
//     const response = await axios.post(
//       `${MOMO_URL}/v1_0/apiuser/${xReferenceId}/apikey`,
//       {},
//       {
//         headers: {
//           "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY,
//         },
//       }
//     );

//     return response.data;
//   } catch (err) {
//     console.error(
//       "Failed to obtain MoMo access token:",
//       err.response?.data || err.message
//     );
//     // console.log("Error: ", err);
//     return null;
//   }
// }

// // Get MOMO Access Token
// async function getAccessToken(xReferenceId, apiKey) {
//   const auth = Buffer.from(`${xReferenceId}:${apiKey}`).toString("base64");
//   try {
//     const response = await axios.post(
//       `${MOMO_URL}/collection/token/`,
//       {},
//       {
//         headers: {
//           Authorization: `Basic ${auth}`,
//           "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     return response.data.access_token;
//   } catch (err) {
//     console.error(
//       "Failed to obtain MoMo access token:",
//       err.response?.data || err.message
//     );
//     return null;
//   }
// }

// Request Payment
router.post("/request-payment", async (req, res) => {
  try {
    const { phoneNumber, userId, amount, currency } = req.body;

    const xReferenceId = generateReferenceId();

    await createApiUser(xReferenceId);

    const { apiKey } = await createAPIKey(xReferenceId);

    console.log("apiKey: ", apiKey);

    if (!apiKey)
      return res
        .statusCode(500)
        .json({ message: "Failed To Retrieve API-KEY" });

    const token = await getAccessToken(xReferenceId, apiKey);
    if (!token)
      return res.status(500).json({ error: "Failed To Retrieve Access Token" });

    console.log("Token: ", token);

    const response = await axios.post(
      `${MOMO_URL}/collection/v1_0/requesttopay`,
      {
        amount: amount.toString(),
        currency: currency,
        externalId: xReferenceId,
        payer: { partyIdType: "MSISDN", partyId: phoneNumber },
        payerMessage: "Subscription Payment",
        payeeNote: "Thank you for using our services",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Reference-Id": xReferenceId,
          "X-Target-Environment": MOMO_ENV,
          "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("REsponse: ", response?.status, " ", response?.statusText);

    const user = await User.findByIdAndUpdate(userId, {
      $set: {
        subscription: {
          status: "PENDING",
          referenceId: xReferenceId,
          amount,
          currency,
          subscription_key: apiKey,
          paymentDate: new Date(),
        },
      },
    });

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

    if (!user || !user.subscription.referenceId)
      return res.status(400).json({ error: "No Payment Reference Found" });

    const referenceId = user.subscription.referenceId;
    const { apiKey } = await createAPIKey(referenceId);

    const token = await getAccessToken(referenceId, apiKey);

    console.log("ReferenceId: ", referenceId);

    if (!token)
      return res.status(500).json({ error: "Failed To Get Access Token" });

    const response = await axios.get(
      `${MOMO_URL}/collection/v1_0/requesttopay/${referenceId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Target-Environment": MOMO_ENV,
          "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY,
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
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

module.exports = router;
