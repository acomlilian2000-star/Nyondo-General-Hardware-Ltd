const mongoose = require("mongoose");

const StockSchema = new mongoose.Schema({

  itemName: {
    type: String,
    trim: true,
    required: true
  },

  category: {
    type: String,
    trim: true,
    default: "General"
  },

  quantity: {
    type: Number,
    default: 0
  },

  supplier: {
    type: String,
    trim: true,
    default: "Unknown"
  },

  contactPerson: {
    type: String,
    trim: true
  },

  supplierPhone: {
    type: String,
    trim: true
  },

  factoryName: {
    type: String,
    trim: true
  },

  unitCost: {
    type: Number,
    default: 0
  },

  unitPrice: {
    type: Number,
    required: true,
    validate: {
      validator: function (value) {
        return value > (this.unitCost || 0);
      },
      message: "unitPrice must be greater than unitCost"
    }
  },

  paymentMethod: {
    type: String,
    enum: ["cash", "credit"],
    default: "cash"
  },

  total: {
    type: Number,
    default: 0
  },

  Attendant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  status: {
    type: String,
    enum: ["Pending", "Paid"],
    default: "Pending"
  }

}, {
  timestamps: true
});

module.exports = mongoose.model("Stock", StockSchema);