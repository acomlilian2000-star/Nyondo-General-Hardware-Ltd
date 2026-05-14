const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose').default || require('passport-local-mongoose');
const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  ninNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },

  role: {
    type: String,
    enum: ['admin', 'stock_manager', 'sales_attendant'],
    default: 'sales_attendant'
  },

  isFirstLogin: {
    type: Boolean,
    default: true
  },

  dateJoined: {
    type: Date,
    default: Date.now
  },
  isFirstLogin: {
  type: Boolean,
  default: true
}
});

// IMPORTANT: plugin handles password internally
userSchema.plugin(passportLocalMongoose, {
  usernameField: 'email'
});

module.exports = mongoose.model('User', userSchema);