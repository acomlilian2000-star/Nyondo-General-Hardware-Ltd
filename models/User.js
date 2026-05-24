const mongoose = require("mongoose");

const passportLocalMongoose =
  require("passport-local-mongoose").default ||
  require("passport-local-mongoose");

console.log("PLUGIN TYPE:", typeof passportLocalMongoose); // MUST BE function

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },

  ninNumber: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },

  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },

  address: {
    type: String,
    required: true,
    trim: true
  },

  role: {
    type: String,
    enum: ["admin", "stock_manager", "sales_attendant"],
    default: "sales_attendant"
  },

  isFirstLogin: {
    type: Boolean,
    default: true
  },

  dateJoined: {
    type: Date,
    default: Date.now
  }
});

// CRITICAL CHECK
if (typeof passportLocalMongoose !== "function") {
  throw new Error("passport-local-mongoose is NOT a function. Check installation.");
}

userSchema.plugin(passportLocalMongoose, {
  usernameField: "email"
});

module.exports = mongoose.model("User", userSchema);