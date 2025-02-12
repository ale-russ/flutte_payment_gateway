const cron = require("node-cron");
const axios = require("axios");

const User = require("./models/Users");

const { generateReferenceId, getAccessToken } = require("./utils/momoUtils");

const MOMO_URL = process.env.MOMO_BASE_URL;
const MOMO_PRIMARY_KEY = process.env.MOMO_PRIMARY_KEY;
const MOMO_ENV = process.env.MOMO_ENV;
const SERVER_BASE_URL = process.env.SERVER_BASE_URL;

// Schedule a cron job
cron.schedule("* * * * *", async () => {
  console.log("Running Subscription renewal job...");
  try {
    // Get users with active subscription that is due for renewal

    const today = new Date();
    const users = await User.find({
      "subscription.status": "active",
      "subscription.nextPaymentDay": { $lte: today },
    });
    console.log("User: ", users);
    for (const user of users) {
      const { _id, subscription } = user;
      const referenceId = generateReferenceId();
      const token = await getAccessToken(
        subscription.referenceId,
        subscription.subscription_key
      );

      if (!token) {
        console.error("Failed to get access token for user: ", _id);
        // continue;
        return;
      }

      // Send payment request to MoMo API
      try {
        // const response = await axios.post(
        //   `${MOMO_URL}/collection/v1_0/requesttopay`,
        //   {
        //     amount: subscription.amount.toString(),
        //     currency: subscription.currency,
        //     externalId: referenceId,
        //     payer: { partyIdType: "MSISDN", partyId: user.phoneNumber },
        //     payerMessage: "Subscription Renewal",
        //     payeeNote: "Thank you for your continued support",
        //   },
        //   {
        //     headers: {
        //       Authorization: `Bearer ${token}`,
        //       "X-Reference-Id": referenceId,
        //       "X-Target-Environment": MOMO_ENV,
        //       "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY,
        //       "Content-Type": "application/json",
        //     },
        //   }
        // );

        const response = await axios.post(
          `${SERVER_BASE_URL}/api/momo/payment-request`,
          {
            phoneNumber: user.phoneNumber,
            userId: _id,
            amount: subscription.amount,
            currency: subscription.currency,
          }
        );

        console.log(`Payment request sent for user: ${_id}`);

        // Update next payment date in database (e.g., add 30 days for monthly subscription)
        const newNextPaymentDate = new Date();
        newNextPaymentDate.setDate(newNextPaymentDate.getDate() + 30);

        await User.findByIdAndUpdate(_id, {
          "subscription.referenceId": referenceId,
          "subscription.nextPaymentDate": newNextPaymentDate,
          "subscription.status": "pending",
        });

        console.log(`Updated next payment date for user: ${_id}`);
      } catch (paymentErr) {
        console.error(
          `Payment request failed for user: ${_id}`,
          paymentErr.response?.data || paymentErr.message
        );
      }
    }
  } catch (err) {
    console.error("Error running subscription renewal job:", err.message);
  }
});
