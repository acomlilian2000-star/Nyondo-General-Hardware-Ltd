const mongoose = require("mongoose");

const connectDB = async () => {
  console.log("Mongo URI:", process.env.MONGO_URI);

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.log(`Connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;