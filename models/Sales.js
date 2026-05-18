const mongoose = require('mongoose');

const SalesSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now
  },

  customerName: {
    type: String,
    required: true,
    trim: true
  },

  phoneNumber: {
    type: String,
    trim: true
  },

  customerAddress: {
    type: String,
    trim: true
  },

  customerType: {
    type: String,
    default: 'individual'
  },

  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stock',
    required: true
  },

  /* =========================
     FIXED: NO ARRAYS
  ========================= */

  specification: {
    type: String,
    default: "-"
  },

  quantity: {
    type: Number,
    required: true
  },

  unitPrice: {
    type: Number,
    required: true
  },

  distance: {
    type: Number,
    default: 0
  },

  transportCost: {
    type: Number,
    default: 0
  },

  subTotal: {
    type: Number,
    default: 0
  },

  grandTotal: {
    type: Number,
    default: 0
  },

  paymentMethod: {
    type: String,
    required: true
  },
  image: {
  type: String,
  default: ""
},

  Attendant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }

}, {
  timestamps: true
});

module.exports = mongoose.model('Sales', SalesSchema);