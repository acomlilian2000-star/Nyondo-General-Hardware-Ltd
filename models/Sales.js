
const mongoose = require('mongoose');

const SalesSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now
  },

  customerName: {
    type: String,
    trim: true,
    required: true
  },

  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stock',
    required: true
  },

  Attendant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Registration',
    required: true
  },

  customerType: String,

  quantity: {
    type: Number,
    required: true,
    min: 1
  },

  unitPrice: {
    type: Number,
    required: true
  },

  paymentMethod: {
    type: String,
    required: true,
   
  },

  color: String,

  guage: Number,

  total: Number
}, {
  timestamps: true
});

module.exports = mongoose.model('Sales', SalesSchema);