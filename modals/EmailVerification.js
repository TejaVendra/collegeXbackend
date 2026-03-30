import mongoose from "mongoose";

const EmailVerification = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // auto delete when expired
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
});

const Email = mongoose.model("Email", EmailVerification);
export default Email;
