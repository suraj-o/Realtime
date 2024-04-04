const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const PostSchema = new mongoose.Schema(
  {
    likedby: [{ type: [ObjectId], ref: "User", required: true }],
    likes: { type: Number, default: 0 },
    dislike: { type: Number, default: 0 },
    dislikedby: [{ type: ObjectId, ref: "User", required: true }],
    comments: { type: [String], default: [] },
    totalcomments: { type: Number, default: 0 },
    tags: { type: [String] },
    views: { type: Number, default: 0 },
    title: { type: String, maxLength: 100 },
    desc: { type: String, maxLength: 500 },
    community: { type: ObjectId, ref: "Community" },
    sender: { type: ObjectId, ref: "User" },
    isverified: { type: Boolean, default: false },
    commpic: { type: ObjectId, ref: "Community" },
    kind: { type: String, default: "post" },
    post: [
      {
        content: { type: String },
        type: { type: String },
        size: { type: String },
        thumbnail: { type: String },
      },
    ],
    topicId: { type: ObjectId, ref: "Topic" },
    options: [
      {
        title: String,
        strength: { type: Number, default: 0 },
        votedby: [{ type: ObjectId, ref: "User" }],
      },
    ],
    votedby: [{ type: ObjectId, ref: "User" }],
    totalvotes: { type: Number, default: 0 },
    contenttype: { type: [String] },
    user: { type: String },
    date: { type: Date, default: Date.now() },
    status: {
      type: String,
      default: "Unblock",
      enum: ["Unblock", "Block"],
    },
    sharescount: { type: Number, default: 0 },
    type: { type: String, default: "Post" },
    promoid: { type: ObjectId, ref: "Post" },
    isPromoted: { type: Boolean, default: false },
    reportstatus: {
      type: String,
      enum: ["unblock", "block"],
      default: "unblock",
    },
  },
  { timestamps: true }
);

PostSchema.index({ title: "text" });

module.exports = mongoose.model("Post", PostSchema);
