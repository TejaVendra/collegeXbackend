import express from 'express'
import { commentPost, createPost, deletePost, editPost, forYou, getAllPosts, getFollowingPosts, getUserPosts, likePost, postDetails } from '../controllers/postController.js';
import { protectRoute } from '../middleware/protectedRoute.js';
import multer from 'multer';



const router = express.Router();

const upload = multer({
  limits: { files: 5 },
});

router.post('/create-post',protectRoute, upload.array("images", 5),createPost);
router.post('/:postId/like',protectRoute,likePost);
router.post('/:postId/comment',protectRoute,commentPost);
router.get('/:id/posts',protectRoute,getUserPosts);
router.get('/:id/allPosts',protectRoute,getAllPosts);
router.get('/for-you',protectRoute,forYou);
router.get('/:id/details',protectRoute,postDetails);
router.put('/:postId/edit',protectRoute,editPost);
router.delete('/:postId/delete',protectRoute,deletePost);
router.get('/following-posts',protectRoute,getFollowingPosts);



export default router;