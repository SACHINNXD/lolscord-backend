const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// Message Schema
const messageSchema = new mongoose.Schema({
  username: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model("Message", messageSchema);

io.on("connection", async (socket) => {
  console.log("User connected");

  // 🔹 SEND OLD MESSAGES TO NEW USER
  const messages = await Message.find().sort({ createdAt: 1 });
  socket.emit("load messages", messages);

  // 🔹 SAVE & BROADCAST NEW MESSAGE
  socket.on("chat message", async (data) => {
    const newMessage = new Message(data);
    await newMessage.save();

    io.emit("chat message", newMessage);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
