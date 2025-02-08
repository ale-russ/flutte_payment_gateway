const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const Subscription = require("../models/subscription");
const authMiddleWare = require("../middleware/auth");

const MOMO_URL = process.env.MOMO_BASE_URL;
const MOMO_PRIMARY_KEY = process.env.MOMO_PRIMARY_KEY;
const MOMO_ENV = process.env.MOMO_ENV;

const generateReferenceId = () => uuidv4();

// Create a new API USER (used only in sandbox)
async function createApiUser(xReferenceId) {
  try {
    const response = await axios.post(
      `${MOMO_URL}/v1_0/apiuser`,
      { providerCallbackHost: "String" },
      {
        headers: {
          "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY,
          "Content-Type": "application/json",
          "X-Reference-Id": xReferenceId,
        },
      }
    );

    return response.data;
  } catch (err) {
    console.error(
      "Failed To Create API USER:",
      err.response?.data || err.message
    );
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

// Create API KEY (used only in sandbox)
async function createAPIKey(xReferenceId) {
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

    return response.data;
  } catch (err) {
    console.error(
      "Failed to obtain MoMo access token:",
      err.response?.data || err.message
    );
    // console.log("Error: ", err);
    return null;
  }
}

// Get MOMO Access Token
async function getAccessToken(xReferenceId, apiKey) {
  const auth = Buffer.from(`${xReferenceId}:${apiKey}`).toString("base64");
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

module.exports = {
  createApiUser,
  createAPIKey,
  getAccessToken,
  generateReferenceId,
};
