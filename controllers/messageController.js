import cloudinary from "../libs/cloudinary.js";
import { getReceiverSocketId, io } from "../libs/socket.js";
import Message from "../modals/Message.js"; // Fixed typo: "modals" to "models"
import User from "../modals/User.js";
import Notification from "../modals/Notification.js"; // Fixed typo: "modals" to "models"


export const getMessage = async (req,res) =>{
    try{
       
        const { id:userTochatId } = req.params;
        const myId = req.user._id;

        const message = await Message.find({
            $or : [
                {senderId:myId , receiverId:userTochatId},
                {senderId:userTochatId , receiverId: myId},
            ],
        });
        if(!message){
            return res.status(404).json({
                success:false,
                message:"No messages found"
            });
        }

        res.status(200).json({success:true,message})
   

    }catch(error){
      console.log("Error in getMessages controller: ", error.message);
       res.status(500).json({ error: "Internal server error" });
    }
}

export const sendMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        // Validate message content
        if (!text?.trim() && !image) {
            return res.status(400).json({ 
                success: false, 
                message: "Message cannot be empty" 
            });
        }

        // Check if receiver exists
        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }

        // Check for mutual follow
        const senderFollowsReceiver = req.user.following.includes(receiverId);
        const receiverFollowsSender = receiver.following.includes(senderId);

        // Simplified logic: require mutual follow
        if (!senderFollowsReceiver ||  !receiverFollowsSender) {
          return res.status(403).json({
              success: false,
              message: "You must follow each other to send messages"
          });
      }

        // Upload image if present
        let img;
        if (image) {
            const uploaderImg = await cloudinary.uploader.upload(image);
            img = uploaderImg.secure_url;
        }

        // Create and save message
        const newMessage = new Message({
            senderId,
            receiverId,
            text: text?.trim() || "",
            image: img,
        });

        const newNotification = new Notification({
            author:senderId,
            recipient:receiverId,
            type:"message",
            message: `new Message`,
        });
        await newNotification.save();
        await newNotification.populate('author','fullName username profile');



        await newMessage.save();
        await newMessage.populate('senderId', 'fullName username profile');

        // Socket emission
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
            io.to(receiverSocketId).emit("newNotification",newNotification);
        }
    

        res.status(200).json({ 
            success: true, 
            message: newMessage 
        });

    } catch (error) {
        console.log("Error in sendMessage controller: ", error.message);
        res.status(500).json({ 
            success: false, 
            error: "Internal server error" 
        });
    }
};

export const getUsers = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find messages where user is sender or receiver
    const messages = await Message.find({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    })
    .populate("senderId", "fullName username profile isVerified") // Populate sender details
    .populate("receiverId", "fullName username profile isVerified"); // Populate receiver details

    // Extract unique users
    const usersMap = new Map();

    messages.forEach((msg) => {
      // Skip if both sender and receiver are null (shouldn't happen, but just in case)
      if (!msg.senderId && !msg.receiverId) return;

      // Determine the other user with null checks
      let otherUser = null;
      
      if (msg.senderId && msg.senderId._id.toString() === userId.toString()) {
        otherUser = msg.receiverId;
      } else {
        otherUser = msg.senderId;
      }

      // Only add to map if other user exists
      if (otherUser && otherUser._id) {
        usersMap.set(otherUser._id.toString(), otherUser);
      }
    });

    const users = Array.from(usersMap.values());

    return res.status(200).json({
      success: true,
      users
    });

  } catch (error) {
    console.error("Get chat users error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const myId = req.user._id;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (message.senderId.toString() !== myId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await Message.findByIdAndDelete(id);

    const receiverSocketId = getReceiverSocketId(message.receiverId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("deletedMessage", id);
    }

    return res.status(200).json({
      success: true,
      message: "Message deleted successfully!",
    });

  } catch (error) {
    console.error("Error in deleteMessage:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const editMessage = async (req,res) =>{
  try {

    const { id } = req.params;
    const { text  } = req.body;

    if(!text?.trim()){
      return res.status(400).json({
        success:false,
        message:"Message cannot be empty"
      });
    }

    const message = await Message.findById(id);

    if(!message){
      return res.status(404).json({
        success:false,
        message:"Message not found"
      });
    }
    if(message.senderId.toString() !== req.user._id.toString()){
      return res.status(403).json({
        success:false,
        message:"Unauthorized"
      });
    }

    const updateData = {};

    if(text?.trim()){
      updateData.text = text.trim();
    }


    updateData.isEdited = true;

    const updatedMessage = await Message.findByIdAndUpdate(
      id,
      updateData,
      { new:true }
    );

    if(!updatedMessage){
      return res.status(404).json({
        success:false,
        message:"Message not found"
      });
    }

    const receieverSocketId = getReceiverSocketId(updatedMessage.receiverId);

    if(receieverSocketId){
      io.to(receieverSocketId).emit("updatedMessage",updatedMessage);
    }

    return res.status(200).json({
      success:true,
      message:updatedMessage
    });

  } catch (error) {

    console.error("Error in editMessage:", error);

    return res.status(500).json({
      success:false,
      message:"Internal server error"
    });

  }
};

