const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
    },
    sender: {
      type: ObjectId,
      ref: "User",
    },
    text: {
      type: String,
    },
    topicId: {
      type: ObjectId,
      ref: "Topic",
    },
    hidden: [{ type: ObjectId, ref: "User" }],
    mesId: { type: Number, required: true, unique: true },
    dissapear: { type: Boolean, default: false },
    typ: { type: String, default: "message" },
    status: { type: String, default: "active" },
    ques: { type: String },
    totalVotes: { type: Number, default: 0 },
    option: [
      {
        content: {
          type: String,
          required: true,
        },
        voteCount: { type: Number, default: 0 },
        votedBy: [{ type: ObjectId, ref: "User", default: [] }],
      },
    ],
    voted: [{ type: ObjectId, ref: "User" }],
    expression: { type: String },
    content: {
      uri: { type: String },
      type: { type: String },
      size: { type: String },
      thumbnail: { type: String },
      name: { type: String },
    },
    deletedfor: [{ type: ObjectId, ref: "User" }],
    video: { type: String },
    audio: { type: String },
    doc: { type: String },
    contact: { type: String },
    reply: { type: String },
    replyId: { type: Number },
    comId: { type: ObjectId, ref: "Community" },
    sequence: { type: Number },
    timestamp: { type: String },
    isread: { type: Boolean, default: false },
    readby: [{ type: ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

messageSchema.index({ mesId: "Regular" });
messageSchema.index({ topicId: "Regular" });
messageSchema.index({ sequence: "Regular" });

module.exports = mongoose.model("Message", messageSchema);
