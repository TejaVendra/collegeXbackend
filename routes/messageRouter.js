import express from "express";
import { protectRoute } from "../middleware/protectedRoute.js";
import { getMessage, getUsers, sendMessage , deleteMessage,editMessage} from "../controllers/messageController.js";




const router = express.Router()

router.post('/send-message/:id',protectRoute,sendMessage);
router.get('/get-message/:id',protectRoute,getMessage);
router.get('/getChatUsers',protectRoute,getUsers);
router.delete('/delete-message/:id',protectRoute,deleteMessage);
router.put('/edit-message/:id',protectRoute,editMessage);



export default router;