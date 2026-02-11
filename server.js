const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// Message Schema
const messageSchema = new mongoose.Schema({
  username: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model("Message", messageSchema);

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

io.on("connection", async (socket) => {
  console.log("User connected");

  try {
    // Load previous messages
    const messages = await Message.find().sort({ createdAt: 1 });
    socket.emit("load messages", messages);
  } catch (err) {
    console.error("Error loading messages:", err);
  }

  socket.on("chat message", async (data) => {
    try {
      const newMessage = new Message({
        username: data.username,
        message: data.message
      });

      await newMessage.save();
      io.emit("chat message", data);
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
