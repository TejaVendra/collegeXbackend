import cloudinary from '../libs/cloudinary.js'
import User from '../modals/User.js'
import Post from '../modals/Post.js';
import Notification from '../modals/Notification.js';
import {getReceiverSocketId, io} from '../libs/socket.js'
import { forYouScore } from '../libs/ForYouScore.js';

export const createPost = async (req, res) => {
  try {
    const { content } = req.body;
    const author = req.user._id;
    const text = content?.trim();

    // 1. Validation: Ensure either text or files exist
    if (!text && (!req.files || req.files.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "Post must contain text or images",
      });
    }

    let imageUrls = [];

    // 2. Handle Image Uploads
    if (req.files && req.files.length > 0) {
      // Use Promise.all to upload all images in parallel (faster)
      const uploadPromises = req.files.map(async (file) => {
        
        // If using memoryStorage, convert buffer to base64 for Cloudinary
        const b64 = Buffer.from(file.buffer).toString("base64");
        const dataURI = `data:${file.mimetype};base64,${b64}`;

        const uploaded = await cloudinary.uploader.upload(dataURI, {
          folder: "posts",
          resource_type: "auto", // Better than "images" to handle all formats
        });
        
        return uploaded.secure_url;
      });

      imageUrls = await Promise.all(uploadPromises);
    }

    // 3. Create the post in Database
    const newPost = await Post.create({
      content: text || "",
      images: imageUrls, // Array of URLs
      author,
    });

    // 4. Update user statistics
    await User.findByIdAndUpdate(author, { $inc: { postCount: 1 } });

    const followers = req.user.followers.map(f => f._id);

    const notifications = followers.map((followerId) =>({
      recipient:followerId,
      author: author,
      type:"post",
      post:newPost._id,
      message:` ${req.user.username} posted : ${newPost.content}`,

    }));

  if (notifications.length > 0) {
    const savedNotifications = await Notification.insertMany(notifications);

    const populatedNotifications = await Notification.find({
      _id: { $in: savedNotifications.map(n => n._id) }
    })
      .populate("author", "username fullName profile")
      .populate("post", "text image");

    followers.forEach((f) => {
      const socketId = getReceiverSocketId(f);

      if (socketId) {
        populatedNotifications.forEach((notif) => {
          io.to(socketId).emit("newNotification", notif);
        });
      }
    });
  }
    return res.status(201).json({
      success: true,
      post: newPost,
    });

  } catch (error) {
    console.error("Create post error:", error);
    return res.status(500).json({
      success: false,
      message: "Try to upload smaller images (less than 1MB) and ensure all fields are correct",
    });
  }
};

export const getUserPosts = async (req,res) =>{
  try {

    const { id } = req.params; 

    if(!id) return res.status(404).json({success:false,message:"User ID is required"});

    const userPosts = await Post.find({author:id}).populate("author","profile username fullName").sort({createdAt:-1});

    if(!userPosts) return res.status(404).json({success:false,message:"user doesn't have any posts or user not exists"});

    console.log(userPosts);
    

    if (userPosts.length === 0) {
      return res.status(200).json({ 
        success: true, 
        posts: [], 
        message: "No posts found for this user" 
      });
    }

    return res.status(200).json({success:true,posts:userPosts});
    
  } catch (error) {

    console.error("Error in getUserPosts : " ,error);
    return res.status(404).json({success:false,message:"Internal server issue"});
    
  }
}


export const getAllPosts = async (req,res) =>{
  //retrieve all posts to the home except the logged in user's post 
  try {

    const { id } = req.params;

    if(!id) return res.status(400).json({success:false,message:"Id is required"});

    const posts = await Post.find({author:{$ne:id}}).populate("author","profile username fullName").sort({createdAt:-1});

    if(!posts) return res.status(400).json({success:false,message:"Posts are not found"});

    return res.status(200).json({success:true,posts:posts});
    
  } catch (error) {

    console.error("Error in get all posts :",error);
    return res.status(400).json({success:false,message:"Internal error issuse"});
    
    
  }
}

// for you -- like we get posts for users

export const forYou = async (req,res) =>{
  try {
    const id = req.user._id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    if(!id) return res.status(401).json({success:false,message:"User not logged in"});

    const posts = await Post.find({author:{$ne:id}}).populate("author","profile username fullName").sort({createdAt:-1}).limit(200 + offset).lean();
    

    const scored = posts.map(post => ({
      post,
      score:forYouScore(post,req.user)
    }));

    scored.sort((a,b) => b.score - a.score);

    const topItems = scored.slice(offset, offset + limit);

    const exploreCount = Math.floor(limit * 0.15);

    const exploreItems = scored
      .slice(limit, limit + 100)
      .sort(() => 0.5 - Math.random())
      .slice(0, exploreCount);

    const finalFeed = [...topItems, ...exploreItems]
      .sort(() => 0.5 - Math.random());   // shuffle a bit for variety

    res.json({
      success:true,
      posts: finalFeed.map(item => item.post),
      hasMore: scored.length > offset + limit
    });
    
  } catch (error) {
    console.error("Error in for you",error);
    return res.status(404).json({success:false,message:"Internal server issuse"});
       
  }
}

export const postDetails = async(req,res) =>{
  try {

    const { id } = req.params;

    if(!id) return res.status(400).json({success:false,message:"Id is required"});

    const postDetails = await Post.findById(id).populate("author","profile username fullName isVerified").populate("comments.author","username profile isVerified");
    
    

     if(!postDetails) return res.status(400).json({success:false,message:"Posts are not found"});

     return res.status(200).json({success:true,posts:postDetails});

    
  } catch (error) {
    console.error("Error in get post details :",error);
    return res.status(400).json({success:false,message:"Internal error issuse"});
    
  }
}

export const likePost = async (req,res) =>{
    //for like the post we to know the user id
    try{
        const { postId } = req.params;
        const userId = req.user._id;

        let post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const alreadyLiked = post.likes.includes(userId.toString());

        if(alreadyLiked){

            post = await Post.findByIdAndUpdate(
                postId,
                { $pull:{likes:userId}},
                {new:true}
            );
        }else{
            post = await Post.findByIdAndUpdate(
                postId,
                { $push : { likes :userId}},
                {new:true},
            );
        }
        io.emit("newLike",{
          postId,
          likes: post.likes,
          userId,
          action:alreadyLiked ? "unlikeed" : "like",
        })
        res.status(200).json({ success:true, message: alreadyLiked ? 'Unliked' : 'Liked' , likesCount:post.likes.length});

    }catch(error){
        console.error("Error in likepost controller :" + error.message);
        
     res.status(500).json({ message: 'Server error' });
    }
}

export const commentPost = async (req,res) =>{
     try{

        const { postId } = req.params;
        const { text } = req.body;
        const author = req.user._id;

        let post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        if (!text?.trim()) return res.status(400).json({ message: 'Comment text required' });

        const updatedPost = await Post.findByIdAndUpdate(
                            postId,
                            { 
                                $push: { 
                                    comments: { 
                                        text: text.trim(), 
                                        author: author // or user: author depending on your schema
                                    } 
                                } 
                            },
                            { new: true }
                        ).populate("comments.author", "username profile");
                        console.log(updatedPost);
                        

        if (!updatedPost) return res.status(404).json({ message: 'Post not found' });

        io.emit("newComment",{postId: updatedPost._id,comment:updatedPost.comments[updatedPost.comments.length - 1]});

        // notification functionality
        const notification = await Notification.create({
            author: author,
            recipient: post.author._id,
            type: "comment",
            message: `${req.user.username} commented on your post: ${text}`,
            post: postId,
          });

          await notification.populate([
            { path: "author", select: "username fullName profile" },
            { path: "post", select: "text image" }
          ]);

          const fullNotification = notification;

          if (post.author._id.toString() !== req.user._id.toString()) {
          const socketId = getReceiverSocketId(post.author._id);

          if (socketId) {
              io.to(socketId).emit("newNotification", fullNotification);
            }
          }

        res.status(201).json({success:true,comments:updatedPost.comments[updatedPost.comments.length - 1]});
        
     }catch(error){
        console.error("Error in commentPost controller : " + error.message);
        
        res.status(500).json({ message: 'Server error' });
     }
}


// In your postController.js
export const editPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;

    const trimmedContent = content.trim();

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized"
      });
    }

    post.content = trimmedContent;
    post.isEdited = true;
    await post.save();

    const updatedPost = await Post.findById(postId)
      .populate("author", "username fullName profile");

    return res.status(200).json({
      success: true,
      message: "Post updated successfully",
      post: updatedPost
    });

  } catch (error) {
    console.error("Error in editPost:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};



export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({ 
        success: false, 
        message: "Post ID is required" 
      });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: "Post not found" 
      });
    }

    // Check authorization
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this post"
      });
    }

    // Delete images from cloud storage if they exist
    if (post.images && post.images.length > 0) {
      // Assuming you have a cloud storage service (Cloudinary, AWS S3, etc.)
       //await Promise.all(post.images.map(imageUrl => deleteImageFromCloud(imageUrl)));
      console.log(`Deleting ${post.images.length} images for post ${postId}`);
    }

    // Delete all comments associated with this post (if you have a separate comments collection)
    // await Comment.deleteMany({ post: postId });

    // Delete the post
    await Post.findByIdAndDelete(postId);

    return res.status(200).json({ 
      success: true, 
      message: "Post deleted successfully" 
    });
    
  } catch (error) {
    console.error("Error in deletePost:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid post ID format" 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

export const getFollowingPosts = async (req,res) =>{
  try {

    const id = req.user._id;

    if(!id) return res.status(400).json({success:false,message:"Id is required"});

    const user = await User.findById(id).populate("following","_id");

    const followingIds = user.following.map(f => f._id);

    const posts = await Post.find({author:{$in:followingIds}}).populate("author","profile username fullName").sort({createdAt:-1});

    if(!posts) return res.status(400).json({success:false,message:"Posts are not found"});

    return res.status(200).json({success:true,posts:posts});

    
  } catch (error) {
    console.error("Error in get following posts :",error);
    return res.status(400).json({success:false,message:"Internal error issuse"});
    
  }
}

