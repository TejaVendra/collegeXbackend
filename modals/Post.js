import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
    content:{
        type:String,
        maxLength:600
    },
    images:[{
        type:String,
    }],//arrays of images it can be
    author:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
        index:true,
    },
    likes:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        default:[],
    }],
    comments:[{
        text:{
            type:String,
            required:true,
            maxLength:280,
        },
        author:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
            required:true,
        },
        createdAt:{
            type:Date,
            default:Date.now,
            index:true,
        }
    }],
    isEdited:{
        type:Boolean,
        default:false,
    }
  ,


},{timestamps:true});

postSchema.index({author:1,createdAt:-1});


const Post = mongoose.model("Post",postSchema);

export default Post;