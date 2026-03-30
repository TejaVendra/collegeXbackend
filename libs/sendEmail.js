import axios from "axios";

import dotenv from 'dotenv'

dotenv.config()

export const sendEmail = async ({ to , subject , html}) =>{
    try{
        await axios.post(
            "https://api.brevo.com/v3/smtp/email",
            {
                sender:{
                    name:process.env.SENDER_NAME,
                    email:process.env.SENDER_EMAIL,
                },
                to:[{email:to}],
                subject,
                htmlContent:html,
            },
            {
                headers:{
                    "api-key":process.env.BREVO_API_KEY,
                    "Content-Type":"application/json",
                     accept:"application/json",
                },
 
            }
        );

    }catch(error){
        console.error(
            "Brevo email error :",
            error.response?.data || error.message
        );
        
        throw new Error("Email not sent")
    }
}   