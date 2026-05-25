const mongoose = require('mongoose');
// mongoose.connect('mongodb://localhost/MyDatabase'),
const passportLocalMongoose = require ('passport-local-mongoose').default|| require('passport-local-mongoose');

const UserSchema = new mongoose.Schema({
  fullName: {
    type: String,
    trim: true,
    required: true
  },
  email: {
    type: String,
    trim: true,
    unique:true,
  },
  // userName: {
  //   type: String,
  //   trim: true
  // },
  ugPhoneNumber: {
    type: Number,
    required: true
  },
  ninNumber: {
    type: String,
    required: true,
    trim:true
  },
  role: {
    type: String,
    required: true,
    trim:true,
    enum: ["admin" ,"stock_manager","sales_attendant"]
  },
  password: {
    type: String,
    required: true
},
 
});

UserSchema.plugin(passportLocalMongoose, {
  usernameField: "email"
});

module.exports = mongoose.model('User', UserSchema);