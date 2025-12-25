import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";

// Login Controller
const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: "Please provide username and password" });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({ message: "User not found!" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid password" });
    }

    // Generate token
    const token = randomBytes(20).toString("hex");
    user.token = token;
    await user.save();

    return res.status(httpStatus.OK).json({ token });
  } catch (error) {
    console.error(error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Something went wrong" });
  }
};

// Register Controller
const register = async (req, res) => {
  const { name, username, password } = req.body;

  if (!name || !username || !password) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: "Please provide all required fields" });
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(httpStatus.CONFLICT).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      username,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(httpStatus.CREATED).json({ message: "User registered successfully" });
  } catch (error) {
    console.error(error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Something went wrong" });
  }
};

export { login, register };
