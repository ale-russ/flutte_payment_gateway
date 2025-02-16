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
      // "subscription.nextPaymentDay": { $lte: today },
    });
    console.log("User: ", users);
    for (const user of users) {
      console.log("user: ", user);
      const { _id, subscription } = user;
      // const referenceId = generateReferenceId();
      const referenceId = user.apiUserId;
      const token = await getAccessToken(
        subscription.referenceId,
        subscription.subscription_key
      );

      if (!token) {
        console.error("Failed to get access token for user: ", _id);
        continue;
        // return;
      }

      // Send payment request to MoMo API
      // console.log("serverUrl: ", process.env.SERVER_BASE_URL);
      const paymentRequestUrl = `${process.env.SERVER_BASE_URL}/api/momo/request-payment`;
      console.log(`Payment request URL: ${paymentRequestUrl}`); //
      try {
        const response = await axios.post(
          // `${process.env.SERVER_BASE_URL}/api/momo/request-payment`,
          paymentRequestUrl,
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
