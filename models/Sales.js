const mongoose = require('mongoose');

/* =========================
   SALES ITEM SCHEMA
========================= */
const SalesItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stock',
      required: true
    },

    // saves product name at time of sale (prevents "Deleted Product" issue)
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
  },
  { _id: false }
);

/* =========================
   SALES SCHEMA
========================= */
const SalesSchema = new mongoose.Schema(
  {
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

    /* MULTI-PRODUCT SALES */
    items: [SalesItemSchema],

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

    /* FIXED: Attendant should NOT break saving */
    Attendant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Sales', SalesSchema);