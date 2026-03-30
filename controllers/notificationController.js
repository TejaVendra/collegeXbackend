import { io } from "../libs/socket.js";
import Notification from "../modals/Notification.js";



export const getNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 20 } = req.query;

        // First, get all notifications for the user
        const notifications = await Notification.find({ recipient: userId })
            .populate("author", "username fullName profile")
            .populate("post", "text image")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        // Filter out notifications where the post is deleted (null)
        const filteredNotifications = notifications.filter(notification => {
            // For notification types that don't require a post (like follow, comment, etc.)
            if (!notification.post) {
                return true;
            }
            
            // For notifications that should have a post, check if it exists
            // If the post was populated but is null, it means the post was deleted
            return notification.post !== null;
        });

        // Get unread count (excluding notifications with deleted posts)
        const allNotifications = await Notification.find({ recipient: userId });
        const validNotificationIds = allNotifications
            .filter(notification => {
                if (!notification.post) return true;
                // You might need to check if the post still exists
                // This requires additional logic or a separate query
                return true; // Placeholder
            })
            .map(n => n._id);

        const unreadCount = await Notification.countDocuments({
            recipient: userId,
            isRead: false,
            _id: { $in: validNotificationIds }
        });

        res.status(200).json({
            success: true,
            notifications: filteredNotifications,
            unreadCount,
            hasMore: notifications.length === limit
        });

    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching notifications"
        });
    }
};

export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );

    res.json({ success: true });

  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({
      success: false,
      message: "Error marking all notifications as read"
    });
  }
};


export const deleteNotification = async (req,res) =>{
  try {

    const {id} = req.params;

    if(!id) return res.status(404).json({success:false,message:"ID Invaild or Required"});

    const notification = await Notification.findByIdAndDelete(id);
    
    io.emit("deleteNotification", id); // 🔥 socket event

    return res.status(200).json({success:true,message:"Notification delected successfully"});
    
  } catch (error) {
    console.error("Error in delete notification : ",error);
    return res.status(404).json({success:false,message:"Internal server issuse"});    
  }
}
