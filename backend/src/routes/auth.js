import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";
import { sendMessage } from "./message.js";
dotenv.config();

const router = express.Router();

router.post("/register", async (req, res) => {
  const { username, email, birthdate, password } = req.body;
  try {
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: "User or email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      email,
      birthdate,
      password: hashedPassword,
    });
    await newUser.save();

    res.status(201).json({ message: "User created successfully." });
  } catch (error) {
    console.error("Error:", error.message);

    res.status(500).json({ message: error.message });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (user.firstLogin) {
      let directive = process.env.MODEL_DIRECTIVE;
      let role = "system";
      const directiveResponse = await sendMessage(
        role,
        user.username,
        directive
      );
      console.log("Directive message sent:", directive);
      if (directiveResponse) {
        console.log("Directive response received: ", directiveResponse);
      } else {
        console.log("No response, try asking again");
      }
      user.firstLogin = false;
      await user.save();
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res
      .status(200)
      .json({ message: "User logged in successfully", token, username });
  } catch (error) {
    console.error("Error:", error);

    res
      .status(500)
      .json({ message: "Something went wrong. Please try again later." });
  }
});

router.get("/guest", (req, res) => {
  try {
    res.status(200).json({ username: "Guest" });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;
