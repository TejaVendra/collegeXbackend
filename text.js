import dotenv from "dotenv";
dotenv.config();

import { sendEmail } from "./libs/sendEmail.js";

sendEmail({
  to: "tejavendra2006@gmail.com",
  subject: "This is testing mail",
  html: "<h2>Hello, how are you?</h2>",
})
  .then(() => console.log("Email sent successfully ✅"))
  .catch(console.error);
