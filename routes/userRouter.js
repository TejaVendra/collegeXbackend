import express from 'express'
import { Signup  , Login, Logout, UpdateProfile, UpdateBio, UpdateCover, checkAuth, forgotPassword, resetPassword, updatePassword, searchUsers, UsersProfile, followingUser, getFollowers, getFollowings, getUser, deleteAccount, getTopUsers} from '../controllers/userController.js'
import { protectRoute } from '../middleware/protectedRoute.js';
const router = express.Router()


router.post("/signup",Signup);
router.post('/login',Login);
router.post('/logout',Logout);
router.post('/update-img',protectRoute,UpdateProfile);
router.post('/delete-account',protectRoute,deleteAccount);
router.post('/update-bio',protectRoute,UpdateBio);
router.post('/update-fullname',protectRoute,UpdateBio);
router.post('/update-coverImg',protectRoute,UpdateCover);
router.get('/check',protectRoute,checkAuth);
router.post('/forgot-password',forgotPassword);
router.post('/reset-password/:token',resetPassword);
router.post('/update-password',protectRoute,updatePassword);
router.get('/search',protectRoute,searchUsers);
router.get('/user/:username',protectRoute,UsersProfile);
router.get('/user/u/:id',protectRoute,getUser);
router.post('/follow/:id',protectRoute,followingUser);
router.get('/user/:username/following',protectRoute,getFollowings);
router.get('/user/:username/followers',protectRoute,getFollowers);
router.get('/top-users',protectRoute,getTopUsers);

export default router;