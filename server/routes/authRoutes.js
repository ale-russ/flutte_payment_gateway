const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/Users");
const {
  generateReferenceId,
  createApiUser,
  getApiUser,
} = require("../utils/momoUtils");

const router = express.Router();

// USER REGISTRATION
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;

    if (!name || !email || !password || !phoneNumber)
      return res.status(401).json({ message: "All Fields are required" });

    const existingUser = await User.findOne({ email });

    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const apiUserId = generateReferenceId();
    // const apiResponse = await createApiUser(apiUserId);
    // console.log("APIRESPONSE: ", apiResponse);
    // if (apiResponse !== 201)
    //   return res
    //     .status(apiResponse)
    //     .json({ error: "Falied To Create Api User" });

    // const apiUser = getApiUser(apiUserId);
    // console.log("API USER ID: ", apiUser);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
      apiUserId: apiUserId,
    });

    await newUser.save();
    res.status(201).json({ message: "User registered Successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// USER LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "Invalid Credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid Credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1M",
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        apiUserId: user.apiUserId,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
