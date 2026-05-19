const mongoose = require("mongoose");

const StockSchema = new mongoose.Schema({
  itemName: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    trim: true,
  },
  quantity: {
    type: Number,
    trim: true,
  },
  supplier: {
    type: String,
    trim: true,
  },
  contactPerson: {
    type: String,
    trim: true,
  },
  supplierPhone: {
    type: Number,
    trim: true,
  },
  factoryName: {
    type: String,
    trim: true,
  },
  unitCost: {
    type: Number,
    trim: true,
  },
  unitPrice: {
    type: Number,
    trim: true,
    required:true,
  validate:{
    validator:function(value){
      return value > this.unitCost;
    },
    message:'unitPrice must be greater than unitCost'
  }

  },
 
  paymentMethod: {
    type: String,
    trim: true,
  },
  total:{
    type:Number,
  },
  Attendant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
  type: String,
  enum: ["Pending", "Paid"],
  default: "Pending"
},
  
});

module.exports = mongoose.model("Stock", StockSchema);
