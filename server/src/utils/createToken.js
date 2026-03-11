import jwt from "jsonwebtoken";

const createToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      userType: user.userType
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

export default createToken;
