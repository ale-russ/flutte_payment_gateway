const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  phone: { type: String, required: true, unique: true },
  amount: { type: String, required: true },
  currency: { type: String, default: "EUR" },
  nextPaymentDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ["ACTIVE", "FAILED", "CANCELLED", "EXPIRED"],
    default: "ACTIVE",
  },
  endDate: { type: Date, default: Date.now },
  referenceId: { type: String, required: true, unique: true },
});

module.exports = mongoose.model("Subscription", SubscriptionSchema);
