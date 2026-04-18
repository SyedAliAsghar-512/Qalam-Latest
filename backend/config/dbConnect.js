import mongoose from "mongoose";
import dotenv from 'dotenv';
dotenv.config({path:"backend/config/config.env"});

let DB_URL = "mongodb://localhost:27017/Qalam";

export const connectDatabase = () => { 
    mongoose.connect(DB_URL)
    .then((con) => {
        console.log('connected with database',DB_URL);
    })
    .catch(err => console.error("error:",err));    
};
