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
const Community = require("./models/community");
const Admin = require("./models/admin");
const Ads = require("./models/Ads");
const Message = require("./models/message");
const Analytics = require("./models/Analytics");
const Advertiser = require("./models/Advertiser");
const Post = require("./models/post");
const Deluser = require("./models/deluser");
const {
  RtcTokenBuilder,
  RtmTokenBuilder,
  RtcRole,
  RtmRole,
} = require("agora-access-token");
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

const emailToSocketIdMap = new Map();
const socketidToEmailMap = new Map();

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

function removeUserFromAllRoomsBySocketId({ socketId }) {
  rooms.forEach((room, roomIndex) => {
    const userIndex = room.users.findIndex(
      (user) => user.socketId === socketId
    );

    if (userIndex !== -1) {
      room.users.splice(userIndex, 1);

      // If the room becomes empty after removing the user, remove the entire room
      if (room.users.length === 0) {
        rooms.splice(roomIndex, 1);
      }

      console.log(
        `User with socket ID ${socketId} removed from room ${room.name}`
      );
    }
  });
}

function removeUserFromRoomBySocketId(socketId) {
  rooms.forEach((room, roomIndex) => {
    const userIndex = room.users.findIndex(
      (user) => user.socketId === socketId
    );

    if (userIndex !== -1) {
      room.users.splice(userIndex, 1);

      // If the room becomes empty after removing the user, remove the entire room
      if (room.users.length === 0) {
        rooms.splice(roomIndex, 1);
      }

      console.log(
        `User with socket ID ${socketId} removed from room ${room.name}`
      );
    }
  });
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

const generateRtcToken = function ({ convId, id, isHost }) {
  let appID = process.env.AGORA_APP_ID;
  let appCertificate = process.env.AGORA_APP_CERTIFICATE;
  var currentTimestamp = Math.floor(Date.now() / 1000);
  var privilegeExpiredTs = currentTimestamp + 3600;
  var channelName = convId;
  let role = isHost ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  console.log("New token Generated for", role);
  var key = RtcTokenBuilder.buildTokenWithUid(
    appID,
    appCertificate,
    channelName,
    id,
    role,
    privilegeExpiredTs
  );

  return key;
};

//middleware
io.use(async (socket, next) => {
  const sessionID = socket.handshake.auth.id;
  const type = socket.handshake.auth.type;

  if (sessionID) {
    socket.join(sessionID);
    if (type === "mobile") {
      const user = await User.findById(sessionID);

      if (user && user.notificationtoken) {
        //awake notification
        let data = { id: user._id, notificationtoken: user.notificationtoken };
        //  sendNotiouter(data);
      }
    }
    // sessionStore(sessionID);
    console.log("middleware ran for", sessionID, "in", type);
    return next();
  }
});

io.on("connection", (socket) => {
  socket.on("joinUser", ({ userId, roomId }) => {
    console.log("user joined", userId, socket.id);
    socket.join(roomId);
    addUser({ userId, socketId: socket.id });
    addUserToRoom(roomId, userId, socket.id);
  });

  socket.on("check-late", async (data) => {
    const finalid = data;
    const allmsgs = await Message.find({
      issent: false,
      rec: data,
      readby: { $nin: [data] },
    })
      .populate("sender", "profilepic fullname username isverified")
      .populate("rec", "profilepic fullname username isverified")
      .sort({ createdAt: -1 })
      .limit(5);

    if (allmsgs?.length > 0) {
      //sending missing messages
      for (let i = 0; i < allmsgs.length; i++) {
        let data = {
          sender_fullname: allmsgs[i].sender.fullname,
          sender_id: allmsgs[i].sender._id,
          text: allmsgs[i].text,
          createdAt: allmsgs[i].createdAt,
          timestamp: allmsgs[i].timestamp,
          mesId: allmsgs[i].mesId,
          typ: allmsgs[i].typ,
          convId: allmsgs[i].conversationId,
          isread: allmsgs[i].isread,
          sender: { _id: allmsgs[i].sender },
          readby: allmsgs[i].readby,
          //reciever: allmsgs[i].rec._id,
          //reciever_pic: allmsgs[i].rec.profilepic,
        };
        let ext = {
          convid: allmsgs[i].conversationId,
          fullname: allmsgs[i].sender.fullname,
          id: allmsgs[i].sender._id,
          isverified: allmsgs[i].sender.isverified,
          msgs: [
            {
              sender: allmsgs[i].sender._id,
              conversationId: allmsgs[i].conversationId,

              isread: allmsgs[i].isread,

              text: allmsgs[i].text,
              createdAt: allmsgs[i].createdAt,
              timestamp: allmsgs[i].timestamp,
              mesId: allmsgs[i].mesId,
              typ: allmsgs[i].typ,
            },
          ],
          pic: process.env.URL + allmsgs[i].sender.profilepic,
          username: allmsgs[i].sender.username,
          readby: allmsgs[i].readby,
        };

        let final = { data, ext };

        io.to(finalid).emit("outer-private", final);

        await Message.updateOne(
          { _id: allmsgs[i]._id },
          { $set: { issent: true } }
        );
      }
    }
  });

  //for marking active users
  socket.on("activeuser", async ({ userId, roomId }) => {
    socket.join(roomId);
    addUser({ userId, socketId: socket.id });
    addUserToRoom(roomId, userId, socket.id);
    console.log("active user:", userId);
    let today = new Date();

    let year = today.getFullYear();
    let month = String(today.getMonth() + 1).padStart(2, "0");
    let day = String(today.getDate()).padStart(2, "0");

    let formattedDate = `${day}/${month}/${year}`;

    const activity = await Admin.findOne({ date: formattedDate });
    if (activity) {
      //visitor count
      if (activity.users.includes(userId)) {
        await Admin.updateOne(
          { _id: activity._id },
          {
            $addToSet: {
              returning: userId,
            },
            $inc: {
              returningcount: 1,
            },
          }
        );
      } else {
        await Admin.updateOne(
          { _id: activity._id },
          {
            $addToSet: {
              users: userId,
            },
            $inc: {
              activeuser: 1,
            },
          }
        );
      }
    } else {
      const a = new Admin({
        date: formattedDate,
        activeuser: 1,
        users: userId,
      });
      await a.save();
    }
  });

  socket.on("isUserInRoom", ({ userId, roomId }) => {
    const isuser = isUserInRoom({ roomName: roomId, userId: userId });

    io.to(socket.id).emit("checkit", isuser);
  });

  socket.on("joinRoom", ({ roomId, userId }) => {
    socket.join(roomId);
    addUserToRoom(roomId, userId, socket.id);
    // const isthere = isUserthere({ socketId: socket.id });
    // console.log(isthere, "alive");

    //marking msgs as seen while entering the room
    let data = { id: userId };
    socket.to(roomId).emit("readconvs", data);

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
      socket.to(roomId).to(userId).emit("outer-ms", data);
      savemsg(data);
      sendNotifcation(data);
    } else {
      console.log("joined and sent");
      socket.join(roomId);
      addUserToRoom(roomId, userId, socket.id);
      socket.to(roomId).emit("ms", data);
      socket.to(roomId).to(userId).emit("outer-ms", data);
      savemsg(data);
      sendNotifcation(data);
    }
  });

  socket.on("chatMessagecontent", async ({ roomId, userId, data }) => {
    const usercheck = await isUserInRoom({ roomName: roomId, userId: userId });
    if (usercheck) {
      console.log("sent", roomId);
      socket.join(roomId);
      socket.to(roomId).emit("ms", data);
      socket.to(roomId).to(userId).emit("outer-ms", data);
      sendNotifcation(data);
    } else {
      console.log("joined and sent");
      socket.join(roomId);
      addUserToRoom(roomId, userId, socket.id);
      socket.to(roomId).to(userId).emit("outer-ms", data);
      socket.to(roomId).emit("ms", data);

      sendNotifcation(data);
    }
  });

  // socket.on("singleChatMessage", async ({ roomId, userId, data, ext }) => {
  //   const usercheck = await isUserInRoom({ roomName: roomId, userId: userId });
  //   const rec = await User.findById(data?.reciever);
  //   const sender = await User.findById(data?.sender_id);

  //   let isblocked = false;
  //   rec.blockedpeople.forEach((p) => {
  //     if (p?.id?.toString() === sender._id.toString()) {
  //       isblocked = true;
  //     }
  //   });
  //   sender.blockedpeople.forEach((p) => {
  //     if (p?.id?.toString() === rec._id.toString()) {
  //       isblocked = true;
  //     }
  //   });
  //   SaveChats(data);
  //   if (isblocked === false) {
  //     if (usercheck) {
  //       console.log("sent to", userId);
  //       socket.join(roomId);
  //       socket.to(roomId).emit("ms", data);
  //       socket.to(userId).emit("allchats", ext);

  //       sendNoti(data);
  //     } else {
  //       console.log("joined and sent");
  //       socket.join(roomId);
  //       addUserToRoom(roomId, userId, socket.id);
  //       socket.to(roomId).emit("ms", data);
  //       socket.to(userId).emit("allchats", ext);

  //       sendNoti(data);
  //     }
  //   }
  // });

  //for private messages
  socket.on("singleChatMessage", async ({ roomId, userId, data, ext }) => {
    const rec = await User.findById(data?.reciever);
    const sender = await User.findById(data?.sender_id);

    let isblocked = false;
    rec.blockedpeople.forEach((p) => {
      if (p?.id?.toString() === sender._id.toString()) {
        isblocked = true;
      }
    });
    sender.blockedpeople.forEach((p) => {
      if (p?.id?.toString() === rec._id.toString()) {
        isblocked = true;
      }
    });
    SaveChats(data);
    if (isblocked === false) {
      socket.to(roomId).to(userId).emit("reads", data);
      // socket.to(userId).emit("allchats", ext);
      let final = { data, ext };

      socket.to(roomId).to(userId).emit("outer-private", final);
      console.log(data, roomId, userId, "message");
      sendNoti(data);
    }
  });

  socket.on("singleChatContent", async ({ roomId, userId, data, ext }) => {
    //const usercheck = await isUserInRoom({ roomName: roomId, userId: userId });

    const rec = await User.findById(data?.reciever);
    const sender = await User.findById(data?.sender_id);

    let isblocked = false;
    rec.blockedpeople.forEach((p) => {
      if (p?.id?.toString() === sender._id.toString()) {
        isblocked = true;
      }
    });
    sender.blockedpeople.forEach((p) => {
      if (p?.id?.toString() === rec._id.toString()) {
        isblocked = true;
      }
    });
    if (isblocked === false) {
      socket.to(roomId).to(userId).emit("reads", data);

      let final = { data, ext };

      socket.to(roomId).to(userId).emit("outer-private", final);
      console.log(data, roomId, userId, "Media");
      sendNoti(data);
    }
  });

  //typing status convsersations
  socket.on("typing", async ({ roomId, id, userId, status }) => {
    let data = { id: userId, status, convId: roomId };
    console.log("typed  by " + userId);
    socket.to(roomId).emit("istyping", data);
    socket.to(id).to(userId).emit("istypingext", data);

    socket.to(roomId).to(id).to(userId).emit("outer-private-typing", data);
  });

  //deleting for everyone conversations
  socket.on("deleteforeveryone", async ({ roomId, rec, userId, data }) => {
    console.log("Deleted by" + userId);
    socket.to(roomId).emit("deleted", data);
    socket.to(userId).to(rec).emit("deletedext", data);
    socket.to(roomId).to(userId).emit("outer-private-delete", data);
  });

  //for instant read msg
  socket.on("readnowupper", async ({ userId, roomId, mesId }) => {
    let data = { id: userId, mesId };
    console.log(userId, roomId, mesId, "success read");
    if (mesId) {
      await Message.updateOne(
        { mesId: mesId },
        { $addToSet: { readby: [userId, roomId] }, $set: { issent: true } }
      );
    }
    console.log("read", data?.id);
  });

  //for reading normally
  socket.on("readnow", async ({ userId, roomId, mesId }) => {
    let data = { id: userId, mesId };
    io.to(userId).to(roomId).emit("readconvs", data);
    console.log("read", data?.id);
  });

  //read success callback
  socket.on("successreadnow", async ({ userId, roomId, mesId }) => {
    console.log(userId, roomId, mesId, "success read");
    if (mesId) {
      await Message.updateOne(
        { mesId: mesId },
        { $addToSet: { readby: userId, roomId }, $set: { issent: true } }
      );
    }
  });

  //for braodcasting poll happened
  socket.on("polled", async ({ id, postId, optionId, comId }) => {
    try {
      const post = await Post.findById(postId);
      const user = await User.findById(id);
      const community = await Community.findById(comId);
      if (post && user && community) {
        //sending notification to whole community
        sendNotifcationCommunity({ id, postId, optionId, comId });
      }
    } catch (e) {
      console.log(e, "poll unsucessfull");
    }
  });

  //recording views
  socket.on("emitviews", async ({ postId }) => {
    try {
      const post = await Post.findById(postId);
      if (post) {
        await Post.updateOne({ _id: post._id }, { $inc: { views: 3 } });
        console.log("post View");
      } else {
        console.log("error inc views");
      }
    } catch (e) {
      console.log(e);
    }
  });

  //rec ads
  socket.on("adviews", async ({ postId, imp, view, click, userId, inside }) => {
    try {
      const post = await Post.findById(postId);
      if (post) {
        let today = new Date();

        let year = today.getFullYear();
        let month = String(today.getMonth() + 1).padStart(2, "0");
        let day = String(today.getDate()).padStart(2, "0");

        let formattedDate = `${day}/${month}/${year}`;

        const latestana = await Analytics.findOne({
          date: formattedDate,
          id: post.promoid,
        });
        console.log(post.promoid);
        const ad = await Ads.findById(post.promoid);
        const user = await User.findById(userId);
        const advertiser = await Advertiser.findById(ad.advertiserid);

        if (
          ad &&
          (ad?.enddate === "Not Selected"
            ? true
            : new Date(ad?.enddate) >= new Date()) &&
          ad.status !== "stopped" &&
          advertiser
        ) {
          //calulating price
          function calculateAdRate(ad) {
            const costs = {
              gender: { male: 3, female: 2 },
              audience: {
                Sales: 9,
                Awareness: 5,
                Clicks: 10,
                Views: 4,
                Downloads: 8,
              },
              type: { banner: 3, skipable: 7, "non-skipable": 9, infeed: 5 },
            };

            let adRate = 0;

            if (ad && ad.type && costs.type.hasOwnProperty(ad.type)) {
              adRate += costs.type[ad.type];

              if (ad.gender && costs.gender.hasOwnProperty(ad.gender)) {
                adRate += costs.gender[ad.gender] || 5;
              }

              if (ad.audience && costs.audience.hasOwnProperty(ad.audience)) {
                adRate += costs.audience[ad.audience];
              }

              // if (ad.totalbudget) {
              //   adRate *= parseInt(ad.totalbudget);
              // }
            }

            return adRate;
          }

          const ad1 = {
            type: ad.type,
            gender: user?.gender,
            audience: ad.goal,
            totalbudget: ad?.totalbudget,
          };

          const adRate = calculateAdRate(ad1);

          if (
            parseInt(adRate) > parseInt(advertiser.currentbalance) ||
            parseInt(ad.totalbudget) < parseInt(ad.totalspent)
          ) {
            await Ads.updateOne(
              { _id: ad._id },
              { $set: { status: "stopped", stopreason: "Low Balance" } }
            );
            await Post.updateOne({ _id: post._id }, { $set: { kind: "post" } });
          } else {
            //updating ad stats
            await Ads.updateOne(
              { _id: ad._id },
              {
                $inc: {
                  totalspent: adRate,
                  views: view ? view : 0,
                  clicks: click ? click : 0,
                  impressions: imp ? imp : 0,
                  cpc: click / adRate || 0,
                },
              }
            );

            if (latestana) {
              await Analytics.updateOne(
                { _id: latestana._id },
                {
                  $inc: {
                    impressions: imp ? imp : 0,
                    views: view ? view : 0,
                    cpc: click / adRate || 0,
                    cost: adRate,
                    click: click ? click : 0,
                  },
                }
              );
            } else {
              const an = new Analytics({
                date: formattedDate,
                id: post.promoid,
                impressions: imp ? imp : 0,
                views: view ? view : 0,
                cpc: click / adRate || 0,
                cost: adRate,
                click: click ? click : 0,
              });
              await an.save();
            }
            console.log(adRate);
            //updating creator stats
            const com = await Community.findById(post.community);
            if (com) {
              if (com.ismonetized === true && inside) {
                //giving 80% to creator
                let moneytocreator = (adRate / 100) * 80;
                let moneytocompany = (adRate / 100) * 20;

                let earned = { how: "Ads", when: Date.now() };
                await User.updateOne(
                  { _id: com.creator },
                  {
                    $inc: { adsearning: moneytocreator },
                    $push: { earningtype: earned },
                  }
                );
                const getrandom = Math.round(Math.random());
                if (getrandom === 0) {
                  await Community.updateOne(
                    { _id: com._id },
                    { $inc: { cpm: moneytocreator } }
                  );
                } else {
                  await Community.updateOne(
                    { _id: com._id },
                    { $inc: { cpc: moneytocreator } }
                  );
                }

                let earning = {
                  how: "Ads",
                  amount: moneytocompany,
                  when: Date.now(),
                  id: ad._id,
                };
                await Admin.updateOne(
                  { date: formattedDate },
                  {
                    $inc: { todayearning: moneytocompany },
                    $push: { earningtype: earning },
                  }
                );
              } else {
                let earning = {
                  how: "Ads",
                  amount: adRate,
                  when: Date.now(),
                  id: ad._id,
                };
                await Admin.updateOne(
                  { date: formattedDate },
                  {
                    $inc: { todayearning: adRate },
                    $push: { earningtype: earning },
                  }
                );
              }
            }

            let amtspt = {
              date: Date.now(),
              amount: adRate,
            };
            //deducting the amount from the advertiser
            await Advertiser.updateOne(
              { _id: ad.advertiserid },
              {
                $inc: { currentbalance: -adRate },
                $push: { amountspent: amtspt },
              }
            );
          }

          await Post.updateOne({ _id: post._id }, { $inc: { views: 1 } });
        }
      } else {
        console.log("error inc views");
      }
    } catch (e) {
      console.log(e);
    }
  });

  //inc share count
  socket.on("incshare", async ({ postId }) => {
    try {
      const post = await Post.findById(postId);
      if (post) {
        await Post.updateOne({ _id: post._id }, { $inc: { sharescount: 1 } });
      } else {
        console.log("error inc shares");
      }
    } catch (e) {
      console.log(e);
    }
  });

  socket.on("blockperson", ({ roomId, rec, userId, action }) => {
    let data = { id: userId, action };
    console.log(roomId, userId, "block");
    socket.to(roomId).to(rec).emit("afterblock", data);
  });

  socket.on("leaveRoom", ({ roomId, userId }) => {
    socket.leave(roomId);
    removeUserFromRoom(roomId, userId);
  });

  //video calling
  socket.on("room:join", (data) => {
    const { room } = data;
    console.log(room);
    io.to(room).emit("user:joined", { id: socket.id });
    socket.join(room);
    io.to(socket.id).emit("room:join", data);
  });

  //call
  socket.on("call:start", ({ id, hisid, convId }) => {
    const sendcall = async ({ id, hisid }) => {
      try {
        const user = await User.findById(id);
        const rec = await User.findById(hisid);
        if (rec.notificationtoken) {
          let dp = process.env.URL + user.profilepic;

          const timestamp = `${new Date()}`;
          const msg = {
            notification: { title: `${user?.fullname}`, body: "Incoming Call" },
            data: {
              screen: "OngoingCall",
              type: "incoming",
              name: `${user?.fullname}`,
              sender_id: `${user._id}`,
              text: `incoming call from ${user.fullname}`,
              recid: `${rec._id}`, //rec id
              callconvId: `${convId}`,
              timestamp: `${timestamp}`,
              dp,
              // offer: JSON.stringify(offer),
            },
            token: rec?.notificationtoken,
          };

          await admin
            .messaging()
            .send(msg)
            .then((response) => {
              console.log("Successfully sent call Alert");
              io.to(id).emit("isringing", true);
            })
            .catch((error) => {
              console.log("Error sending message:", error);
            });
        }
      } catch (e) {
        console.log(e);
      }
    };
    sendcall({ id, hisid });
  });

  socket.on("user:accept", ({ to }) => {
    io.to(to).emit("user:accept:final", {});
  });
  socket.on("send:offer", ({ to, offer }) => {
    socket.to(to).emit("send:ans", { offer });
  });
  socket.on("send:newans", ({ to, ans }) => {
    socket.to(to).emit("set:ans", { ans });
  });

  //end

  socket.on("user:call", ({ to, offer }) => {
    console.log("Calling", to);
    io.to(to).emit("incoming:call", { from: socket.id, offer });
  });

  socket.on("call:picked", ({ check, id }) => {
    if (check) {
      console.log(check, id);
      io.to(id).emit("call:picked:final", { from: socket.id });
    }
  });

  socket.on("call:accepted", ({ to, ans }) => {
    io.to(to).emit("call:accepted", { from: socket.id, ans });
  });

  socket.on("peer:nego:needed", ({ to, offer }) => {
    io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
  });

  socket.on("peer:nego:done", ({ to, ans }) => {
    console.log("peer:nego:done", ans);
    io.to(to).emit("peer:nego:final", { from: socket.id, ans });
  });

  socket.on("call:end", ({ hisid }) => {
    console.log("ending call with", hisid);
    io.to(hisid).emit("call:end:final", { end: true });
  });

  socket.on("decline:call", ({ to }) => {
    io.to(to).emit("decline:call:final", { end: true });
  });

  //agora
  socket.on("generate:token", async ({ to, convId, id, isHost }) => {
    let token = generateRtcToken({ convId, id, isHost });

    io.to(to).emit("gen:final", token);
  });

  socket.on("currentloc", async (data) => {
    const { id, lat, long } = data;
    const user = await Deluser.findById(id);
    if (user && lat && long) {
      user.currentlocation.latitude = lat;
      user.currentlocation.longitude = long;
      await user.save();
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
    updateUserLeaveTime({ socketId: socket.id });
    removeUserFromAllRoomsBySocketId({ socketId: socket.id });
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
      sequence:
        (await Message.countDocuments({ conversationId: data?.convId })) + 1,
      timestamp: data?.timestamp,
      replyId: data?.replyId,
      rec: data?.reciever,
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
    let content = {};
    if (data?.typ === "gif") {
      content = {
        uri: data?.url,
      };
      const message = new Message({
        text: data?.text,
        sender: data?.sender_id,
        topicId: data?.sendtopicId,
        typ: data?.typ,
        mesId: data?.mesId,
        reply: data?.reply,
        dissapear: data?.dissapear,
        comId: data?.comId,
        sequence: (await Message.countDocuments({ comId: data?.comId })) + 1,
        timestamp: data?.timestamp,
        content,
      });
      await message.save();
    } else {
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
    }

    console.log("saved");
  } catch (e) {
    console.log(e, "notsaved");
  }
};

//send notification to people chats
const sendNoti = async (data) => {
  try {
    const user = await User.findById(data?.reciever);
    const sender = await User.findById(data?.sender_id);
    const senderpic = process.env.URL + sender.profilepic;
    if (user) {
      //checking if the rec has conv after deletion or not
      const rec = await User.findById(data?.reciever);
      if (rec?.conversations.includes(data?.convId)) {
      } else {
        await User.updateOne(
          { _id: rec._id },
          {
            $push: {
              conversations: data?.convId,
            },
          }
        );
      }
      if (!rec?.muted?.includes(data?.convId)) {
        const message = {
          notification: {
            title: data?.sender_fullname,
            body:
              data?.type === "image"
                ? "Image"
                : data?.typ === "video"
                ? "Video"
                : data?.typ === "doc"
                ? "Document"
                : data?.typ === "glimpse"
                ? "Glimpse"
                : data?.typ === "gif"
                ? "GIF"
                : data?.typ === "product"
                ? "Product"
                : data?.typ === "post"
                ? "Post"
                : data?.text,
          },
          data: {
            late: "false",
            screen: "Conversation",
            sender_fullname: `${data?.sender_fullname}`,
            sender_id: `${data?.sender_id}`,
            text:
              data?.typ === "image"
                ? "Image"
                : data?.typ === "video"
                ? "Video"
                : data?.typ === "doc"
                ? "Document"
                : data?.typ === "glimpse"
                ? "Glimpse"
                : data?.typ === "gif"
                ? "GIF"
                : data?.typ === "product"
                ? "Product"
                : data?.typ === "post"
                ? "Post"
                : `${data?.text}`,
            convId: `${data?.convId}`,
            createdAt: `${data?.timestamp}`,
            mesId: `${data?.mesId}`,
            typ: `${data?.typ}`,
            senderuname: `${sender?.username}`,
            senderverification: `${sender.isverified}`,
            senderpic: `${senderpic}`,
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
    }
  } catch (e) {
    console.log(e);
  }
};

const sendNotiouter = async (data) => {
  try {
    const message = {
      notification: {},
      data: {
        late: "true",
        screen: "Conversation",
        id: `${data.id}`,
      },
      token: data?.notificationtoken,
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
  } catch (e) {
    console.log(e);
  }
};

//send notification to multiple people in topics only
const sendNotifcation = async (data) => {
  try {
    const topic = await Topic.findById(data?.sendtopicId).populate({
      path: "notifications.id",
      model: "User",
      select: "notificationtoken",
    });

    const subscribedTokens = topic?.notifications?.map((t) =>
      t?.muted === true ? null : t.id.notificationtoken
    );
    let tokens = [];

    if (Array.isArray(subscribedTokens) && subscribedTokens.length > 0) {
      for (const token of subscribedTokens) {
        try {
          if (token !== null) {
            tokens.push(token);
          }
        } catch (error) {
          console.log(
            `Error sending notification to token ${token}:`,
            error.message
          );
        }
      }
    } else {
      console.warn("No valid tokens to send notifications.");
    }

    if (tokens?.length > 0) {
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
    } else {
      console.log("no notifications");
    }
  } catch (e) {
    console.log(e);
  }
};

const sendNotifcationCommunity = async ({ id, postId, optionId, comId }) => {
  try {
    const coms = await Community.findById(comId).populate({
      path: "notifications.id",
      model: "User",
      select: "notificationtoken",
    });
    const post = await Post.findById(postId);
    const user = await User.findById(id);
    if (coms && post && user) {
      const subscribedTokens = coms?.notifications?.map((t) =>
        t?.muted === true ? null : t.id.notificationtoken
      );
      let tokens = [];

      if (Array.isArray(subscribedTokens) && subscribedTokens.length > 0) {
        for (const token of subscribedTokens) {
          try {
            if (token !== null) {
              tokens.push(token);
            }
          } catch (error) {
            console.log(
              `Error sending notification to token ${token}:`,
              error.message
            );
          }
        }
      } else {
        console.warn("No valid tokens to send notifications.");
      }

      if (tokens?.length > 0) {
        const message = {
          notification: {
            title: coms.title,
            body: `${user.fullname} voted in ${post.title}`,
          },
          data: {
            screen: "CommunityChat",
            sender_fullname: `${user.fullname}`,
            sender_id: `${user._id}`,
            text: `A New Vote is Here!`,
            createdAt: `${Date.now()}`,

            comId: `${coms._id}`,

            postId: `${postId}`,
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
      } else {
        console.log("no notifications");
      }
    }
  } catch (e) {
    console.log(e);
  }
};

//sending call
const sendcall = async ({ id, hisid }) => {
  try {
    const user = await User.findById(id);
    const rec = await User.findById(hisid);
    if (rec.notificationtoken) {
      let dp = process.env.URL + user.profilepic;

      const timestamp = `${new Date()}`;
      const msg = {
        notification: { title: `${user?.fullname}`, body: "Incoming Call" },
        data: {
          screen: "OngoingCall",
          type: "incoming",
          name: `${user?.fullname}`,
          sender_id: `${user._id}`,
          text: `incoming call from ${user.fullname}`,
          callconvId: `${rec._id}`, //rec id
          timestamp: `${timestamp}`,
          dp,
        },
        token: rec?.notificationtoken,
      };

      await admin
        .messaging()
        .send(msg)
        .then((response) => {
          console.log("Successfully sent call Alert");
        })
        .catch((error) => {
          console.log("Error sending message:", error);
        });
    }
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
