import Email from "../modals/EmailVerification.js";
import OTP from "../libs/otpGen.js";
import { sendEmail } from "../libs/sendEmail.js";

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ message: "Email is required" });

    const checkEmail = await Email.findOne({ email });
    if (checkEmail)
      return res.status(400).json({ message: "Email already exists or try again in 15 minutes" });

    // generate otp
    const otp = OTP();

    // create document properly
    const newEmail = new Email({
      email,
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    await newEmail.save();

    await sendEmail({
            to: email,
            subject: `OTP Verification`,
            html: `
                <div style="font-family: Helvetica, Arial, sans-serif; min-width: 1000px; overflow: auto; line-height: 2">
                <div style="margin: 50px auto; width: 70%; padding: 20px 0">
                    <div style="border-bottom: 1px solid #eee">
                    <a href="" style="font-size: 1.4em; color: #00466a; text-decoration: none; font-weight: 600">CX(COLLEGE-X)</a>
                    </div>
                    <p style="font-size: 1.1em">Hi,</p>
                    <p>Thank you for choosing CX(COLLEGE-X). Use the following OTP to complete your verification process. <b>This code is valid for 5 minutes.</b></p>
                    <h2 style="background: #00466a; margin: 0 auto; width: max-content; padding: 0 10px; color: #fff; border-radius: 4px;">
                    ${otp}
                    </h2>
                    <p style="font-size: 0.9em;">Regards,<br />The CX(COLLEGE-X) Team</p>
                    <hr style="border: none; border-top: 1px solid #eee" />
                    <div style="float: right; padding: 8px 0; color: #aaa; font-size: 0.8em; line-height: 1; font-weight: 300">
                    <p>CX(COLLEGE-X) Inc</p>
                    <p>VIT AP</p>
                    </div>
                </div>
                </div>
            `,
    });

    return res.status(200).json({
      success:true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.log("Error in Email controller:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res.status(400).json({ message: "All fields are required" });

    const existEmail = await Email.findOne({ email });

    if (!existEmail)
      return res.status(400).json({ message: "Email does not exist" });

    // check expiry
    if (existEmail.expiresAt < Date.now()) {
      await Email.deleteOne({ email });
      return res.status(400).json({ message: "OTP expired" });
    }

    // check otp
    if (existEmail.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // success → remove otp from DB
    await Email.updateOne(
        { email },
        {
            $set: {
            otp: "",
            expiresAt: null,
            },
            isVerified:true,
        }
        );

    return res.status(200).json({
      success:true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.log("Error in verifyOtp:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
