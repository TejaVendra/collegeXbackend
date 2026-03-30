import express from 'express'
import { sendOtp, verifyOtp } from '../controllers/emailController.js'


const router = express.Router()


router.post('/send-otp',sendOtp)
router.post('/otp-verification',verifyOtp)

export default router;