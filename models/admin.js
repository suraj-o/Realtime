const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const Adminschema = new mongoose.Schema(
  {
    date: { type: String },
    users: [{ ref: "User", type: ObjectId }],
    activeuser: { type: Number, default: 0 },
    returning: [{ type: ObjectId, ref: "User" }],
    returningcount: { type: Number, default: 0 },
  },
  { timestamps: false }
);

Adminschema.index({ date: "text" });

module.exports = mongoose.model("Admin", Adminschema);
