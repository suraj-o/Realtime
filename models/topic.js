const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const topicSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    creator: { type: ObjectId, ref: "User", required: true },
    community: {
      type: ObjectId,
      ref: "Community",
      // , required: true
    },
    type: { type: String, default: "free" },
    members: [{ type: ObjectId, ref: "User" }],
    purchased: [
      { id: { type: ObjectId, ref: "User" }, broughton: { type: Number } },
    ],
    memberscount: { type: Number, default: 0 },
    posts: [{ type: ObjectId, ref: "Post" }],
    postcount: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    message: { type: String },
    notifications: [
      {
        id: { type: ObjectId, ref: "User" },
        muted: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Topic", topicSchema);
