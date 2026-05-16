const mongoose = require("mongoose");

const connectDB = async () => {
   console.log(process.env.DATABASE);

  try {
    const conn = await mongoose.connect(process.env.DATABASE);
    console.log(" congs mongoose has successfully opened");
  } catch (error) {
    console.log(`Connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;