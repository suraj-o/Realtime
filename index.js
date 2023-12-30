const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const cors = require("cors");
const http = require("http").Server(app);
const io = require("socket.io")(http);
const serviceKey = require("./grovyo-89dc2-firebase-adminsdk-pwqju-41deeae515.json");
const admin = require("firebase-admin");
const mongoose = require("mongoose");
const User = require("./models/User");
const Topic = require("./models/topic");
const Message = require("./models/message");
const Minio = require("minio");
const minioClient = new Minio.Client({
  endPoint: "minio.grovyo.xyz",

  useSSL: true,
  accessKey: "shreyansh379",
  secretKey: "shreyansh379",
});

//function to ge nerate a presignedurl of minio
async function generatePresignedUrl(bucketName, objectName, expiry = 604800) {
  try {
    const presignedUrl = await minioClient.presignedGetObject(
      bucketName,
      objectName,
      expiry
    );
    return presignedUrl;
  } catch (err) {
    console.error(err);
    throw new Error("Failed to generate presigned URL");
  }
}

require("dotenv").config();

app.use(cors());
app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(cookieParser());

//connect to DB
const connectDB = async () => {
  try {
    mongoose.set("strictQuery", false);
    mongoose.connect(process.env.DATABASE).then(() => {
      console.log("DB is connected");
    });
  } catch (err) {
    console.log(err);
  }
};
connectDB();

admin.initializeApp({
  credential: admin.credential.cert(serviceKey),
  databaseURL: "https://grovyo-89dc2.firebaseio.com",
});

// roomManager
let rooms = [];

function addUserToRoom(roomName, userId, socketId) {
  let room = rooms.find((r) => r.name === roomName);

  if (!room) {
    room = { name: roomName, users: [] };
    rooms.push(room);
  }

  room.users.push({ userId, socketId });

  console.log(`User ${userId} added to room ${roomName}`);
}

function removeUserFromRoom(roomName, userId) {
  const roomIndex = rooms.findIndex((r) => r.name === roomName);

  if (roomIndex !== -1) {
    const updatedRoom = { ...rooms[roomIndex] };
    const userIndex = updatedRoom.users.findIndex(
      (user) => user.userId === userId
    );

    if (userIndex !== -1) {
      updatedRoom.users.splice(userIndex, 1);
      rooms = [
        ...rooms.slice(0, roomIndex),
        updatedRoom,
        ...rooms.slice(roomIndex + 1),
      ];
      console.log(`User ${userId} removed from room ${roomName}`);
    }
  }
}

function removeUserFromRoombysktid({ roomName, userId, socketId }) {
  const roomIndex = rooms.findIndex((r) => r.name === roomName);

  if (roomIndex !== -1) {
    const updatedRoom = { ...rooms[roomIndex] };
    const userIndex = updatedRoom.users.findIndex(
      (user) => user.socketId === socketId
    );

    if (userIndex !== -1) {
      updatedRoom.users.splice(userIndex, 1);
      rooms = [
        ...rooms.slice(0, roomIndex),
        updatedRoom,
        ...rooms.slice(roomIndex + 1),
      ];
      console.log(
        `User ${userId} and ${socketId} removed from room ${roomName}`
      );
    }
  }
}

function isUserInRoom({ roomName, userId }) {
  let room = rooms.find((r) => r.name === roomName);
  return room ? room.users.some((user) => user.userId === userId) : false;
}

function changeUserRoom(prevRoom, newRoom, userId) {
  const roomIndex = rooms.findIndex((r) => r.name === prevRoom);

  if (roomIndex !== -1) {
    const updatedRoom = { ...rooms[roomIndex] };
    const userIndex = updatedRoom.users.findIndex(
      (user) => user.userId === userId
    );

    if (userIndex !== -1) {
      updatedRoom.users.splice(userIndex, 1);
      rooms = [
        ...rooms.slice(0, roomIndex),
        updatedRoom,
        ...rooms.slice(roomIndex + 1),
      ];
      console.log(`User ${userId} removed from room ${prevRoom}`);
    }
  }

  let newRoomObj = rooms.find((r) => r.name === newRoom);

  if (!newRoomObj) {
    newRoomObj = { name: newRoom, users: [] };
    rooms.push(newRoomObj);
  }

  newRoomObj.users.push({ userId });

  console.log(`User ${userId} added to room ${newRoom}`);
}

function getRoomByName(roomName) {
  return rooms.find((r) => r.name === roomName);
}

//user
let users = [];

const addUser = ({ userId, socketId }) => {
  const existingUserIndex = users.findIndex((user) => user.userId === userId);

  if (existingUserIndex === -1) {
    users.push({ userId, socketId, isactive: true });
  } else {
    users[existingUserIndex].socketId = socketId;
    users[existingUserIndex].isactive = true;
  }
};

const updateUserLeaveTime = ({ socketId }) => {
  const userIndex = users.findIndex((user) => user.socketId === socketId);

  if (userIndex !== -1) {
    users[userIndex].isactive = new Date();
  }
};

const removeUser = ({ socketId }) => {
  const userIndexToRemove = users.findIndex(
    (user) => user.socketId === socketId
  );

  if (userIndexToRemove !== -1) {
    users.splice(userIndexToRemove, 1);
  }
};

const isUserthere = ({ userId }) => {
  return users.some((user) => user.userId === userId);
};

io.on("connection", (socket) => {
  socket.on("joinUser", ({ userId, roomId }) => {
    console.log("user joined", userId, socket.id);
    socket.join(roomId);
    addUser({ userId, socketId: socket.id });
    addUserToRoom(roomId, userId, socket.id);
  });

  socket.on("joinRoom", ({ roomId, userId }) => {
    socket.join(roomId);
    addUserToRoom(roomId, userId, socket.id);
    // const isthere = isUserthere({ socketId: socket.id });
    // console.log(isthere, "alive");
    socket.to(roomId).emit("online", true);
  });

  socket.on("switchRoom", async ({ prevRoom, newRoom, userId }) => {
    const usercheck = await isUserInRoom({
      roomName: prevRoom,
      userId: userId,
    });
    if (usercheck) {
      removeUserFromRoom({ prevRoom, userId });
      socket.leave(prevRoom);
      socket.join(newRoom);
      addUserToRoom(newRoom, userId, socket.id);
    } else {
      socket.leave(prevRoom);
      socket.join(newRoom);
      addUserToRoom(newRoom, userId, socket.id);
    }
    console.log("switched", usercheck, prevRoom, "prev", newRoom, "new");
  });

  socket.on("chatMessage", async ({ roomId, userId, data }) => {
    const usercheck = await isUserInRoom({ roomName: roomId, userId: userId });
    if (usercheck) {
      console.log("sent", roomId);
      socket.join(roomId);
      socket.to(roomId).emit("ms", data);
      savemsg(data);
      sendNotifcation(data);
    } else {
      console.log("joined and sent");
      socket.join(roomId);
      addUserToRoom(roomId, userId, socket.id);
      socket.to(roomId).emit("ms", data);
      savemsg(data);
      sendNotifcation(data);
    }
  });
  socket.on("singleChatMessage", async ({ roomId, userId, data, ext }) => {
    const usercheck = await isUserInRoom({ roomName: roomId, userId: userId });
    if (usercheck) {
      console.log("sent", roomId);
      socket.join(roomId);
      socket.to(roomId).emit("ms", data);
      socket.to(userId).emit("allchats", ext);
      SaveChats(data);
      sendNoti(data);
    } else {
      console.log("joined and sent");
      socket.join(roomId);
      addUserToRoom(roomId, userId, socket.id);
      socket.to(roomId).emit("ms", data);
      socket.to(userId).emit("allchats", ext);
      SaveChats(data);
      sendNoti(data);
    }
  });

  socket.on("singleChatContent", async ({ roomId, userId, data, ext }) => {
    const usercheck = await isUserInRoom({ roomName: roomId, userId: userId });
    if (usercheck) {
      console.log("sent", roomId);
      socket.join(roomId);
      socket.to(roomId).emit("ms", data);
      socket.to(userId).emit("allchats", ext);
      sendNoti(data);
    } else {
      console.log("joined and sent");
      socket.join(roomId);
      addUserToRoom(roomId, userId, socket.id);
      socket.to(roomId).emit("ms", data);
      socket.to(userId).emit("allchats", ext);
      sendNoti(data);
    }
  });

  socket.on("leaveRoom", ({ roomId, userId }) => {
    socket.leave(roomId);
    removeUserFromRoom(roomId, userId);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
    updateUserLeaveTime({ socketId: socket.id });
  });
});

http.listen(4400, function () {
  console.log("Rooms on 4400");
});

const markoffline = async ({ uid }) => {
  await Topic.updateOne(
    { _id: "64ecca149c8418279d97fbe2" },
    { $push: { offline: "64a68d4e736586cadb47dcc4" } }
  );
  console.log("ran");
};

//msg and notificaiton send to chats
const sendchatmsg = async ({ data, user }) => {
  try {
    const sender = await User.findById(data?.sender_id);
    const reciever = await User.findById(data?.reciever);
    let isblocked = false;

    if (reciever && sender) {
      const senderblocks =
        sender?.blockedpeople?.map((item) => item.id?.toString()) || [];
      const recblocks =
        reciever?.blockedpeople?.map((item) => item.id?.toString()) || [];
      const isBlockedbysender = senderblocks.some((blockedId) => {
        if (blockedId === reciever?._id?.toString()) {
          isblocked = true;
        }
      });
      const isBlockedbyrec = recblocks.some((blockedId) => {
        if (blockedId === sender?._id?.toString()) {
          isblocked = true;
        }
      });
    }

    if (isblocked === false) {
      console.log(user, data);
      io.to(user?.socketid).emit("data", data);
      SaveChats(data);
      sendNoti(data);
    } else {
      console.log("blocked");
    }
  } catch (e) {
    console.log(e);
  }
};

//send expression notification
//send notification to people chats
const sendNotiExp = async ({ data, user }) => {
  try {
    const sender = await User.findById(data?.sender_id);
    const reciever = await User.findById(data?.reciever);
    let isblocked = false;

    if (reciever && sender) {
      const senderblocks =
        sender?.blockedpeople?.map((item) => item.id?.toString()) || [];
      const recblocks =
        reciever?.blockedpeople?.map((item) => item.id?.toString()) || [];
      const isBlockedbysender = senderblocks.some((blockedId) => {
        if (blockedId === reciever?._id?.toString()) {
          isblocked = true;
        }
      });
      const isBlockedbyrec = recblocks.some((blockedId) => {
        if (blockedId === sender?._id?.toString()) {
          isblocked = true;
        }
      });
    }

    if (isblocked === false) {
      if (user) {
        io.to(user?.socketid).emit("expressions", data);
        const message = {
          notification: {
            title: user?.fullname,
            body: `Reacted ${data?.exp}`,
          },
          data: {
            screen: "Chats",
            sender_fullname: `${user?.fullname}`,
            sender_id: `${user?._id}`,
            text: `Reacted ${data?.exp}`,
            convId: `${data?.convId}`,
            createdAt: `${data?.createdAt}`,
          },
          token: user?.notificationtoken,
        };
        await admin
          .messaging()
          .send(message)
          .then((response) => {
            console.log("Successfully sent message");
          })
          .catch((error) => {
            console.log("Error sending message:", error);
          });
      }
    } else {
      console.log("blocked");
    }
  } catch (e) {
    console.log(e);
  }
};

//save chat msgs
const SaveChats = async (data) => {
  try {
    const message = new Message({
      text: data?.text,
      sender: data?.sender_id,
      conversationId: data?.convId,
      typ: data?.typ,
      mesId: data?.mesId,
      reply: data?.reply,
      dissapear: data?.dissapear,
      isread: data?.isread,
      sequence: data?.sequence,
      timestamp: data?.timestamp,
      replyId: data?.replyId,
    });
    await message.save();
    console.log("Saved");
    // await User.updateOne(
    //   { _id: data?.reciever },
    //   { $push: { mesIds: data?.mesId } }
    // );
    // await User.updateOne(
    //   { _id: data?.sender_id },
    //   { $push: { mesIds: data?.mesId } }
    // );
  } catch (e) {
    console.log(e);
  }
};

//community msgs
const savemsg = async (data) => {
  try {
    const message = new Message({
      text: data?.text,
      sender: data?.sender_id,
      topicId: data?.sendtopicId,
      typ: data?.typ,
      mesId: data?.mesId,
      reply: data?.reply,
      dissapear: data?.dissapear,
      comId: data?.comId,
      sequence: data?.sequence,
      timestamp: data?.timestamp,
    });
    await message.save();
    console.log("saved");
  } catch (e) {
    console.log(e, "notsaved");
  }
};

//send notification to people chats
const sendNoti = async (data) => {
  try {
    const user = await User.findById(data?.reciever);

    if (user) {
      const message = {
        notification: {
          title: data?.sender_fullname,
          body:
            data?.typ === "image"
              ? "Image"
              : data?.typ === "video"
              ? "Video"
              : data?.typ === "doc"
              ? "Document"
              : data?.text,
        },
        data: {
          screen: "Convs",
          sender_fullname: `${data?.sender_fullname}`,
          sender_id: `${data?.sender_id}`,
          text:
            data?.type === "image"
              ? "Image"
              : data?.typ === "video"
              ? "Video"
              : data?.typ === "doc"
              ? "Document"
              : `${data?.text}`,
          convId: `${data?.convId}`,
          createdAt: `${data?.timestamp}`,
          mesId: `${data?.mesId}`,
          typ: `${data?.typ}`,
          mypic: `${data?.mypic}`,
          reciever_fullname: `${user.fullname}`,
          reciever_username: `${user.username}`,
          reciever_isverified: `${user.isverified}`,
          reciever_pic: `${data?.reciever_pic}`,
          reciever_id: `${user._id}`,
        },
        token: user?.notificationtoken,
      };
      await admin
        .messaging()
        .send(message)
        .then((response) => {
          console.log("Successfully sent message");
        })
        .catch((error) => {
          console.log("Error sending message:", error);
        });
    }
  } catch (e) {
    console.log(e);
  }
};

//send notification to multiple people in topics only
const sendNotifcation = async (data) => {
  try {
    const topic = await Topic.findById(data?.sendtopicId).populate({
      path: "members",
      model: "User",
      select: "notificationtoken",
    });
    // const subscribedTokens = topic?.notificationtoken?.filter(
    //   (token) => token?.subscribed === true
    // );
    // const subscribedTokens = (topic?.notificationtoken || [])
    //   .filter((token) => token.subscribed === true)
    //   .map((token) => token.token);

    // const subscribedTokens = topic?.notifications?.map(
    //   (t) => t.notificationtoken
    // );

    const subscribedTokens = topic?.members?.map((t) => t.notificationtoken);
    let tokens = [];

    if (Array.isArray(subscribedTokens) && subscribedTokens.length > 0) {
      for (const token of subscribedTokens) {
        try {
          tokens.push(token);
        } catch (error) {
          console.error(
            `Error sending notification to token ${token}:`,
            error.message
          );
        }
      }
    } else {
      console.warn("No valid tokens to send notifications.");
    }
    const message = {
      notification: {
        title: data?.comtitle,
        body: `${data?.sender_fullname}: ${data?.text}`,
      },
      data: {
        screen: "ComChat",
        sender_fullname: `${data?.sender_fullname}`,
        sender_id: `${data?.sender_id}`,
        text: `${data?.text}`,
        topicId: `${data?.topicId}`,
        createdAt: `${data?.timestamp}`,
        mesId: `${data?.mesId}`,
        typ: `${data?.typ}`,
        comId: `${data?.comId}`,
        props: `${data?.props}`,
        sendtopicId: `${data?.sendtopicId}`,
        postId: `${data?.postId}`,
      },
      tokens: tokens,
    };

    await admin
      .messaging()
      .sendEachForMulticast(message)
      .then((response) => {
        console.log("Successfully sent message");
      })
      .catch((error) => {
        console.log("Error sending message:", error);
      });
  } catch (e) {
    console.log(e);
  }
};

// await axios.post(`${API}/newmessage/64d7cf927f5cb52c36f8b914`, {
//   topicId: ci,
//   sender: id,
//   text: message,
//   typ: 'message',
//   mesId: rid,
//   comId: comId,
//   dissapear: false,
// });
