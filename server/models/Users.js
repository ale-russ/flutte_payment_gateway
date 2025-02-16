const { default: mongoose } = require("mongoose");
const { SubscriptionSchema } = require("./subscription");
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: true, unique: true },
  apiUserId: { type: String, unique: true },
  subscription: {
    status: { type: String, default: "inactive" }, // active/inactive/pending
    referenceId: String,
    paymentReferenceId: String,
    amount: Number,
    currency: String,
    subscription_key: String,
    paymentDate: Date,
    nextPaymentDate: Date, //Track the next payment due date
  },
  subscriptionHistory: [SubscriptionSchema],
});

module.exports = mongoose.model("User", UserSchema);
