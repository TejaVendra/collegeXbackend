import express, { json } from 'express'
import connectDB from './database/connectDB.js'
import userRouter from './routes/userRouter.js'
import cookieParser from "cookie-parser";
import dotenv from 'dotenv'
import emailRouter from './routes/emailRouter.js'
import postRouter from './routes/postRouter.js'
import notificationRouter from  './routes/notificationRouter.js'
import messageRouter from './routes/messageRouter.js'
import cors from 'cors'
import { app , server } from './libs/socket.js';


dotenv.config()

connectDB()

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);




app.use(express.json({ limit: '5mb' })); 
app.use(express.urlencoded({ limit: '5mb', extended: true }));
app.use(cookieParser())


app.use("/api/auth",userRouter)
app.use('/api/email',emailRouter)
app.use('/api/post',postRouter)
app.use('/api/message',messageRouter)
app.use('/api/notifications',notificationRouter)


const port = process.env.PORT

server.listen(port,()=>{
    console.log("server is running on port: "+ port);
    
})