const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  amount: { type: String, required: true },
  currency: { type: String, default: "EUR" },
  nextPaymentDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ["ACTIVE", "FAILED", "CANCELLED"],
    default: "ACTIVE",
  },
  referenceId: { type: String, required: true, unique: true },
});

module.exports = mongoose.model("Subscription", SubscriptionSchema);
