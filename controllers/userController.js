import User from "../modals/User.js";
import express from "express"
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { generateToken } from "../libs/tokenGen.js";
import cloudinary from "../libs/cloudinary.js";
import Email from "../modals/EmailVerification.js";
import { sendEmail } from "../libs/sendEmail.js";
import Post from "../modals/Post.js";
import Notification from "../modals/Notification.js";
import { getReceiverSocketId, io } from "../libs/socket.js";

export const Signup = async (req, res) => {
  try {
    let { fullName, username, email, password } = req.body;

    // Normalize inputs
    fullName = (fullName || "").trim();
    username = (username || "").trim().toLowerCase();
    email    = (email    || "").trim().toLowerCase();
    password = password || "";

    if (!fullName || !username || !email || !password) {
      return res.status(400).json({success:false, message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({success:false, message: "Password must be at least 6 characters" });
    }

    // Optional: basic email check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({success:false, message: "Invalid email format" });
    }

    const verification = await Email.findOne({ email });
    if (!verification || !verification.isVerified) {
      return res.status(400).json({ success:false,message: "Email must be verified before signup" });
    }

    const existing = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (existing) {
      return res.status(400).json({success:false, message: "Username or email already taken" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      username,
      email,
      password: hashedPassword,
    });

    await newUser.save(); // ← SAVE FIRST

    generateToken(newUser._id, res);

    // Clean up verification record (very important!)
    await Email.deleteOne({ email });

    // Welcome email — don't fail signup if it errors
    try {
      await sendEmail({
            to: email,
            subject: "Welcome to CX(college-X)",
            html: `
              <div style="font-family: Helvetica, Arial, sans-serif; min-width: 1000px; overflow: auto; line-height: 2">
                <div style="margin: 50px auto; width: 70%; padding: 20px 0">
                  
                  <div style="border-bottom: 1px solid #eee">
                    <a href="#" style="font-size: 1.4em; color: #1d9bf0; text-decoration: none; font-weight: 600">
                      College-X
                    </a>
                  </div>

                  <p style="font-size: 1.1em">Hi ${fullName},</p>

                  <p>
                    Welcome to <b>X</b> 🎉 <br />
                    Your account has been created successfully.
                  </p>

                  <p>
                    You can now explore, connect with people, and share your thoughts with the world.
                  </p>

                  <a
                    href="https://cx-wh9z.onrender.com/login"
                    style="
                      display: inline-block;
                      margin: 20px 0;
                      padding: 10px 20px;
                      background: #1d9bf0;
                      color: #fff;
                      text-decoration: none;
                      border-radius: 4px;
                      font-weight: 500;
                    "
                  >
                    Login to your account
                  </a>

                  <p style="font-size: 0.9em;">
                    If you did not create this account, please ignore this email.
                  </p>

                  <p style="font-size: 0.9em;">
                    Regards,<br />
                    The CX Team
                  </p>

                  <hr style="border: none; border-top: 1px solid #eee" />

                  <div style="float: right; padding: 8px 0; color: #aaa; font-size: 0.8em; line-height: 1; font-weight: 300">
                    <p>CX Inc</p>
                    <p>123 Internet Street</p>
                  </div>

                </div>
              </div>
            `,
          });

    } catch (emailErr) {
      console.error("Welcome email failed:", emailErr);
    }

    return res.status(201).json({
        message: "Account created successfully",
        success:true,
        user: newUser,
      });
  } catch (error) {
    console.error("Signup error:", error);
    res.clearCookie("jwt"); // safety net
    return res.status(500).json({success:false, message: "Internal Server Error" });
  }
};

export const Login = async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({success:false, message: "All fields are required" });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({success:false, message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(400).json({success:false, message: "Invalid credentials" });
    }

    generateToken(user._id, res);

    res.status(200).json({
      "message":"Login sucesssfull",
      success:true,
      user:user,
    });
  } catch (error) {
    console.log("Error in login controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const Logout = (req,res) =>{
    try{
        res.clearCookie("jwt");
        res.status(200).json({success:true, message: "Logged out successfully" });
    } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({success:false, message: "Internal Server Error" });
  }
}

export const UpdateProfile = async (req,res) =>{
    try{
        const { profile } = req.body;
        const userId = req.user._id;

        if(!profile){
            return res.status(400).json({ message: "Profile pic is required" });
        }
        
        const uploadResponse = await cloudinary.uploader.upload(profile)
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {profile:uploadResponse.secure_url},
            {new:true}
        ).select("-password");

         res.status(200).json({success:true,user:updatedUser,message:"Profile updated sucessfully"});

    }catch(error){
       console.log("error in update profile:", error);
      res.status(500).json({success:false, message: "Internal server error" });
    }
}

export const UpdateBio = async (req,res) =>{
    try{
        const { bio } = req.body;
        const userId = req.user._id;

        if(!bio){
            return res.status(400).json({success:false, message: "Bio is required" });
        }
        
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {bio:bio},
            {new:true}
        ).select("-password");
         res.status(200).json({success:true,user:updatedUser,message:"Profile updated successfully"});

    }catch(error){
       console.log("error in update bio:", error);
      res.status(500).json({success:false, message: "Internal server error" });
    }
}

export const UpdateFullName = async (req,res) =>{
    try{
        const { fullName } = req.body;
        const userId = req.user._id;

        if(!fullName){
            return res.status(400).json({success:false, message: "FullName is required" });
        }
        
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {fullName:fullName},
            {new:true}
        ).select("-password");
         res.status(200).json({success:true,user:updatedUser,message:"Profile updated successfully"});

    }catch(error){
       console.log("error in update fullname:", error);
      res.status(500).json({success:false, message: "Internal server error" });
    }
}

export const UpdateCover = async (req,res) =>{
    try{
        const { coverImg } = req.body;
        const userId = req.user._id;

        if(!coverImg){
            return res.status(400).json({ success:false,message: "Cover image is required" });
        }
        
        const uploadResponse = await cloudinary.uploader.upload(coverImg)
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {coverImg:uploadResponse.secure_url},
            {new:true}
        ).select("-password");

         res.status(200).json({user:updatedUser,success:true,message:"Profile updated successfully"});

    }catch(error){
       console.log("error in update coverImg:", error);
      res.status(500).json({success:false, message: "Internal server error" });
    }
}

export const checkAuth = (req, res) => {
  try {
    res.status(200).json({success:true,user:req.user});
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const forgotPassword = async (req,res) =>{
     
     try {
         
        const  { email } = req.body;

        //check is this valid email or empty
        if(!email) return res.status(404).json({message:"Email is required",success:false});

        //check is this email exists or not 
        const user = await User.findOne({email});

        if(!user) return res.status(404).json({message:"No account found with this email",success:false});

        //we have to send email with id in the params to create a new password

        const resetToken = crypto.randomBytes(32).toString("hex");

        const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 10*60*1000; // expires in 10 minutes
        
        await user.save();

        const resetLink = `https://cx-wh9z.onrender.com/reset-password/${resetToken}`

        await sendEmail({
            to: user.email,
            subject: "Reset Your Password",
            html: `
              <div style="font-family: Helvetica, Arial, sans-serif; line-height: 2">
                <h2>Password Reset Request</h2>
                <p>Hello ${user.fullName},</p>
                <p>You requested to reset your password.</p>

                <a href="${resetLink}"
                  style="
                    display:inline-block;
                    padding:10px 20px;
                    background:#1d9bf0;
                    color:#fff;
                    text-decoration:none;
                    border-radius:5px;
                    font-weight:bold;
                  ">
                  Reset Password
                </a>

                <p>This link will expire in 10 minutes.</p>
                <p>If you didn’t request this, please ignore this email.</p>
              </div>
            `,
          });

          return res.status(200).json({
            success: true,
            message: "Password reset link sent to your email",
          });

     } catch (error) {
         
       console.error("Forgot password error:", error);
            return res.status(500).json({
              success: false,
              message: "Internal server error",
            });
     }
};

export const resetPassword = async (req,res) =>{
            

    try {

      const { token } = req.params;
      const { newPassword } = req.body;

       const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

      const user = await User.findOne({
        resetPasswordToken:hashedToken,
        resetPasswordExpires:{ $gt: Date.now()}
      });
      if(!user){
        return res.status(400).json({success:false,message:"Invalid or expired token"});
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      user.password = hashedPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;

      await user.save();

      res.status(200).json({
          success: true,
          message: "Password reset successful",
      });
      
    } catch (error) {
      console.error("Error in reset password : ",error);
      
       res.status(500).json({
            success: false,
            message: "Server error",
          });
    }

};

export const updatePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ success: false, message: "New password is required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    // FIX 1: Add await here
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // FIX 2: Use findByIdAndUpdate instead of findByIdAndDelete
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { password: hashedPassword },
      { new: true }
    ).select("-password");

    return res.status(200).json({ 
      success: true, 
      message: "Password changed successfully", 
      user: updatedUser 
    });

  } catch (error) {
    console.log("error in update password:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
export const changeUsername = async (req, res) => {
  try {
    const { username } = req.body;
    const userId = req.user._id;

    if (!username || !username.trim()) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Username already taken",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { username: username.trim() },
      { new: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      user: updatedUser,
      message: "Username updated successfully",
    });

  } catch (error) {
    console.log("Error in update username:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// explore section , to see others profiles

export const searchUsers = async (req,res) =>{
  try {

    const { q }  = req.query;

    if(!q || q.trim() == ""){
       return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }
    const searchQuery = q.startsWith("@") ? q.slice(1) : q;

    const users = await User.find({
      _id:{$ne:req.user._id},
      $or:[
        {fullName :{$regex: searchQuery, $options: "i" }},
        {username: {$regex : searchQuery, $options:"i"}}
      ]
    }).select("fullName username profile followerCount followers isVerified").limit(10);

    return res.status(200).json({
      success:true,
      users
    });
    
  } catch (error) {
    
    console.error("Search error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export const UsersProfile = async (req,res) =>{
    try {

      const { username } = req.params;
      if(!username || username.trim() == "") return res.status(400).json({success:false,message:"username is required"});

      const user = await User.findOne({username}).select("-password -email -updatedAt");

      if(!user) return res.status(404).json({success:false,message:"Account with this username not found"});

      return res.status(200).json({success:true, user});
      
    } catch (error) {
      console.error("Error in userProfile :", error);
      return res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      
    }
};

// followers and folowing controllers

export const followingUser = async (req,res) =>{
  try {

    const currentUserId = req.user._id; //current user , when he follows other account , we add this user to followers list , and add that user to this following list
    const { id } = req.params;//other user
    console.log(id);
    

    if( id === currentUserId.toString()){
      return res.status(400).json({success:false,message:"you cannot follow yourself"});
    };

    const userToFollow = await User.findById(id);
    const currentUser = await User.findById(currentUserId);

    if (!userToFollow || !currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isFollowing = currentUser.following.includes(id);
    if(isFollowing){
      // to unfollow
      await User.findByIdAndUpdate(currentUserId,{
        $pull:{following:id},
        followerCount: Math.max(0,currentUser.followerCount - 1), // Ensure it doesn't go negative
      });

      await User.findByIdAndUpdate(id,{
        $pull:{followers:currentUserId},
      });
      return res.status(200).json({
        success: true,
        message: "Unfollowed successfully",
        following: false,
      });
    }else {
      // ➕ FOLLOW
      await User.findByIdAndUpdate(currentUserId, {
        $addToSet: { following: id },
      });

      await User.findByIdAndUpdate(id, {
        $addToSet: { followers: currentUserId },
        $inc: { followerCount: 1 }, // Increment follower count
      });

    if (!isFollowing) {
        const newNotification = new Notification({
          author: currentUserId,
          recipient: id,
          type: "follow",
          message: `${currentUser.username} started following you`,
        });

        await newNotification.save();
        await newNotification.populate('author',"fullName username profile");

        const receieverSocketId = getReceiverSocketId(id);
        if(receieverSocketId){
          io.to(receieverSocketId).emit("newNotification",newNotification);
        }
      }

      return res.status(200).json({
        success: true,
        message: "Followed successfully",
        following: true,
      });
    };

    
  } catch (error) {

    console.error("Follow error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            });
    
  }

};


export const getFollowings = async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "username is required",
      });
    }

    const userData = await User.findOne({ username }) // ✅ FIX
      .populate("following", "username fullName profile followers isVerified")
      .select("following");

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "user not found",
      });
    }

    return res.status(200).json({
      success: true,
      users: userData.following, // ✅ CONSISTENT
    });
  } catch (error) {
    console.error("Error in followingList:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export const getFollowers = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username }) // ✅ FIX
      .populate("followers", "fullName username profile followers isVerified")
      .select("followers");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      users: user.followers,
    });
  } catch (error) {
    console.error("Get followers error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


export const getUser = async(req,res) =>{

   try {

      const { id } = req.params;
      if(!id || id.trim() == "") return res.status(400).json({success:false,message:"id is required"});

      const user = await User.findById(id).select("-password -email -updatedAt");

      if(!user) return res.status(404).json({success:false,message:"Account with this id not found"});

      return res.status(200).json({success:true, user});
      
    } catch (error) {
      console.error("Error in userProfile :", error);
      return res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      
    }

}

export const deleteAccount = async (req, res) => {
    try {
        const { password } = req.body;
        const userId = req.user._id;  // Fixed: req.user._id not req.user._id

        if (!password) {
            return res.status(400).json({ 
                success: false, 
                message: "Password is required" 
            });
        }

        // Find the user
        const loggedUser = await User.findById(userId);
        
        if (!loggedUser) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }

        // Check if password is correct
        const isPasswordCorrect = await bcrypt.compare(password, loggedUser.password);
        
        if (!isPasswordCorrect) {
            return res.status(400).json({ 
                success: false, 
                message: "Incorrect password" 
            });
        }

        // Delete the user account
        await User.findByIdAndDelete(userId);

        await Post.deleteMany({ author: userId });

        // Clear cookie/session if using authentication
        res.clearCookie('jwt'); // If you're using cookies
        // or clear session if using sessions

        return res.status(200).json({ 
            success: true, 
            message: "Account deleted successfully" 
        });
        
    } catch (error) {
        console.log("Error in delete account: ", error);
        return res.status(500).json({   // Changed to 500 for server errors
            success: false, 
            message: "Internal server issue" 
        });
    }
};


export const getTopUsers = async (req, res) => {
  try {
    // Get top 5 users with most followers (excluding current user)
    const topUsers = await User.find({
      _id: { $ne: req.user._id } // Exclude current user in the query
    })
      .sort({ followerCount: -1 })
      .limit(5) // Get top 5 to account for followed users
      .select("fullName username profile followerCount followers isVerified");

    // Filter out users that the current user is already following
    const suggestedUsers = topUsers.filter(
      user => !user.followers.includes(req.user._id)
    );

    // Limit to top 3 suggestions
    const finalSuggestions = suggestedUsers.slice(0, 3);

    return res.status(200).json({
      success: true,
      users: finalSuggestions
    });
  } catch (error) {
    console.error("Error in getTopUsers:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const setGender = async (req, res) => {
  try {
    let { gender } = req.body;
    const id = req.user._id;

   
    if (!gender || !gender.trim()) {
      return res.status(400).json({
        success: false,
        message: "Gender is required"
      });
    }

    
    gender = gender[0].toUpperCase() + gender.slice(1);

   
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { gender },
      { new: true }
    );

  
    return res.status(200).json({
      success: true,
      message: "Gender updated successfully",
      user: updatedUser
    });

  } catch (error) {
    console.error("Error in setGender:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server issue"
    });
  }
};

export const setDOB = async (req, res) => {
  try {
    let { dob } = req.body;
    const id = req.user._id;

   
    if (!dob) {
      return res.status(400).json({
        success: false,
        message: "Date of birth is required"
      });
    }

    
    const parsedDOB = new Date(dob);

   
    if (isNaN(parsedDOB.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format"
      });
    }

   
    if (parsedDOB > new Date()) {
      return res.status(400).json({
        success: false,
        message: "DOB cannot be in the future"
      });
    }

    
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { dob: parsedDOB },
      { new: true }
    );

   
    return res.status(200).json({
      success: true,
      message: "DOB updated successfully",
      user: updatedUser
    });

  } catch (error) {
    console.error("Error in setDOB:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server issue"
    });
  }
};