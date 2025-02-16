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
  console.log(
    "XREFERENCEID: ",
    xReferenceId,
    " url: ",
    process.env.MOMO_PRIMARY_KEY
  );
  try {
    const response = await axios.post(
      `${process.env.MOMO_BASE_URL}/v1_0/apiuser`,
      { providerCallbackHost: "String" },
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.MOMO_PRIMARY_KEY,
          "Content-Type": "application/json",
          "X-Reference-Id": xReferenceId,
        },
      }
    );

    console.log("response in createApiUser: ", response.status);

    return response.status;
  } catch (err) {
    console.error("Failed To Create API USER:", err.response?.status);
    return err.response?.status;
  }
}

// get the API USER
async function getApiUser(xReferenceId) {
  console.log("XREFERENCE in getApiUser: ", process.env.MOMO_PRIMARY_KEY);
  try {
    const response = await axios.get(
      `${process.env.MOMO_BASE_URL}/v1_0/apiUser/${xReferenceId}`,
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.MOMO_PRIMARY_KEY,
          "X-Reference-Id": xReferenceId,
        },
      }
    );
    console.log("API USER RESPONSE: ", response.data);
    return response.data; // Added return statement for success case
  } catch (err) {
    console.error("Failed To GET API USER:", err.response?.data || err.message);
    return err.response?.data || err.message;
  }
}

// Create API KEY (used only in sandbox)
async function createAPIKey(xReferenceId) {
  console.log("XRefernceId: ", xReferenceId);
  try {
    const response = await axios.post(
      `${process.env.MOMO_BASE_URL}/v1_0/apiuser/${xReferenceId}/apikey`,
      {},
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.MOMO_PRIMARY_KEY,
        },
      }
    );

    console.log("REsponse: ", response.data);

    return response.data;
  } catch (err) {
    console.error(
      "Failed to obtain MoMo access token:",
      err.response?.data || err.message
    );
    // console.log("Error: ", err);
    // return null;
    return err.response?.data || err.message;
  }
}

// Get MOMO Access Token
async function getAccessToken(xReferenceId, apiKey) {
  const auth = Buffer.from(`${xReferenceId}:${apiKey}`).toString("base64");
  try {
    const response = await axios.post(
      `${process.env.MOMO_BASE_URL}/collection/token/`,
      {},
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Ocp-Apim-Subscription-Key": process.env.MOMO_PRIMARY_KEY,
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
    // return null;
    return err.response?.data || err.message;
  }
}

module.exports = {
  createApiUser,
  createAPIKey,
  getApiUser,
  getAccessToken,
  generateReferenceId,
};
