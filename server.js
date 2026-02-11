const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const JWT_SECRET = "supersecretkey123"; // you can move this to env later

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

/* ================= USER MODEL ================= */

const userSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  password: String
});

const User = mongoose.model("User", userSchema);

/* ================= MESSAGE MODEL ================= */

const messageSchema = new mongoose.Schema({
  username: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model("Message", messageSchema);

/* ================= AUTH ROUTES ================= */

// Register
app.post("/register", async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  if (!username || !email || !password || !confirmPassword)
    return res.status(400).json({ message: "All fields required" });

  if (password !== confirmPassword)
    return res.status(400).json({ message: "Passwords do not match" });

  const existingUser = await User.findOne({ email });
  if (existingUser)
    return res.status(400).json({ message: "Email already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = new User({
    username,
    email,
    password: hashedPassword
  });

  await newUser.save();

  res.json({ message: "Registered successfully" });
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user)
    return res.status(400).json({ message: "Invalid credentials" });

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword)
    return res.status(400).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { userId: user._id, username: user.username },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token, username: user.username });
});

/* ================= SOCKET CHAT ================= */

io.on("connection", async (socket) => {
  console.log("User connected");

  const messages = await Message.find().sort({ createdAt: 1 });
  socket.emit("load messages", messages);

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
