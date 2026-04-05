import mongoose from "mongoose";


const NotificationSchema = new mongoose.Schema({

    author:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    recipient:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    type:{
        type: String,
        enum:["post","like","comment","follow","message"],
        required:true,
    },
    post:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Post",
    },
    chat:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Message",
    },
    follow:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    message:{
        type:String,
        required:true,

    },
    isRead:{
        type:Boolean,
        default:false,
        index:true,
    },
    createdAt:{
        type:Date,
        default:Date.now,
        expires: 7*24*60*60 , // expires in 10 days - auto delete
    },

});

NotificationSchema.index({recipient:1,isRead:1,createdAt:-1});

const Notification = mongoose.model("Notification",NotificationSchema);
export default Notification;