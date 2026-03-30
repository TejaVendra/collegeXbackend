import express from 'express'
import { protectRoute } from '../middleware/protectedRoute.js';
import { deleteNotification, getNotifications, markAllAsRead } from '../controllers/notificationController.js';

const router = express.Router();



router.get('/get-notifications',protectRoute,getNotifications);
router.get('/see-notifications',protectRoute,markAllAsRead);
router.delete("/delete-notification/:id",protectRoute,deleteNotification);






export default router;