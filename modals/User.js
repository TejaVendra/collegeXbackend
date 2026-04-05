import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    fullName:{
        type: String,
        required:true,
    },
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        index:true,
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
    },
    password:{
        type:String,
        required:true,
    },
    bio:{
        type:String,
        maxLength:160,
        default:"",
    },
    profile:{
        type:String,
        default:"https://res.cloudinary.com/dfnbvtqae/image/upload/v1774013220/default-user3_asix4x.jpg",
    },
    coverImg:{
        type:String,
        default:"https://res.cloudinary.com/dfnbvtqae/image/upload/v1774716344/cover_page_o4nifw.png",
    },
    followers:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
            index:true,
        },
    ],
    following:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
            index:true,
        }
    ],
    postCount:{ type: Number, default: 0 },
    followerCount:{ type: Number, default: 0 },
    followingCount:{ type: Number, default: 0 },
    resetPasswordToken:{
        type:String,
    },
    resetPasswordExpires:{
        type:Date,
    },
    gender:{
        type:String,
        enum:["Male","Female","Other"],
    },
    dob:{
        type:Date,
        
    },
    isVerified:{
        type:Boolean,
        default:false,
    },


},{timestamps:true})

const User = mongoose.model("User",userSchema);

export default User;