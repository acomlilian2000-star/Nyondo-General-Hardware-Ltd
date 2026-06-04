const mongoose = require('mongoose');


const SalesItemSchema = new mongoose.Schema({

  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stock',
    required: true
  },

  itemName: {
    type: String,
    required: true
  },

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

  subTotal: {
    type: Number,
    default: 0
  }

}, { _id: false });


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
    default: "individual"
  },

  items: {
    type: [SalesItemSchema],
    default: []
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
    ref: "User",
    default: null
  }

}, {
  timestamps: true
});

module.exports = mongoose.model("Sales", SalesSchema);