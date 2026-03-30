import mongoose from "mongoose";
import dotenv from 'dotenv'

dotenv.config()

const connectDB = async () =>{
    try{

        const conn = await mongoose.connect(process.env.MONGODB_URL)
        console.log("Database connection is sucessfull");
        

    }catch(err){ 
         console.log("Database is not connected "+ err.message);
         
    }
}
export default connectDB;