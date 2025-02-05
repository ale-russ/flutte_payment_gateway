const cron = require("node-cron");
const axios = require("axios");

const Subscription = require("./models/subscription");

// Run every 1st day of the month at midnight
cron.schedule("0 0 1 * * ", async () => {
  console.log("🔄 Running Scheduled Subscription Payments...");

  const subscriptions = await Subscription.find({ status: "ACTIVE" });

  for (const subscription of subscriptions) {
    await axios.post("http://localhost:5000/api/momo/request-payment", {
      phone: subscription.phone,
    });
  }
});
