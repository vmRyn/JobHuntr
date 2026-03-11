import User from "../models/User.js";
import createToken from "../utils/createToken.js";

const parseSkills = (skills) => {
  if (Array.isArray(skills)) return skills;
  if (typeof skills === "string") {
    const trimmed = skills.trim();

    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith("[")) {
      try {
        const parsedSkills = JSON.parse(trimmed);
        if (Array.isArray(parsedSkills)) {
          return parsedSkills.map((skill) => skill.trim()).filter(Boolean);
        }
      } catch (error) {
        // Fall back to comma-separated parsing.
      }
    }

    return skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);
  }
  return [];
};

export const register = async (req, res) => {
  try {
    const {
      userType,
      email,
      password,
      name,
      bio,
      skills,
      industryField,
      experience,
      location,
      profilePicture,
      companyName,
      description,
      industry,
      logo
    } = req.body;

    if (!userType || !email || !password) {
      return res.status(400).json({ message: "userType, email, and password are required" });
    }

    if (!["seeker", "company"].includes(userType)) {
      return res.status(400).json({ message: "Invalid userType" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const payload = {
      userType,
      email: email.toLowerCase(),
      password
    };

    if (userType === "seeker") {
      payload.seekerProfile = {
        name: name || "",
        bio: bio || "",
        skills: parseSkills(skills),
        industryField: industryField || experience || "",
        experience: experience || "",
        location: location || "",
        profilePicture: profilePicture || ""
      };
    }

    if (userType === "company") {
      payload.companyProfile = {
        companyName: companyName || "",
        description: description || "",
        industry: industry || "",
        logo: logo || ""
      };
    }

    const user = await User.create(payload);
    const safeUser = await User.findById(user._id).select("-password");

    return res.status(201).json({
      token: createToken(user),
      user: safeUser
    });
  } catch (error) {
    return res.status(500).json({ message: "Registration failed" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const safeUser = await User.findById(user._id).select("-password");

    return res.json({
      token: createToken(user),
      user: safeUser
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed" });
  }
};

export const getMe = async (req, res) => {
  return res.json(req.user);
};
