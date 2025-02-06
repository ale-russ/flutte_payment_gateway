const { default: mongoose } = require("mongoose");
const monoose = require("mongoose");

const UserSChema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: true, unique: true },
  subscription: {
    status: { type: String, default: "inactive" }, // active/inactive
    referenceId: String,
    amount: Number,
    currency: String,
    paymentDate: Date,
  },
});

module.exports = mongoose.model("User", UserSChema);
