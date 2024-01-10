const express = require('express');
const { chats } = require('./data/notes');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
const ConnectDB = require('./config/db');
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

app.use(express.json());

ConnectDB();


app.get("/", (req, res) => {
    res.send("API is running");
})

app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use("/api/message", messageRoutes);


app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, console.log("Server started on PORT 5000"));

const io = require('socket.io')(server, {
    pingTimeout: 60000,
    cors: {
        origin: "http://localhost:3000", 
    },
})

io.on("connection", (socket) => {
    console.log("connected to socket.io");
    socket.on("setup", (userData) => {
        socket.join(userData._id);
        socket.emit("connected");
    });

    socket.on("join chat", (room) => {
        socket.join(room);
        console.log('User Joined Room: ' + room);
    });

    socket.on("typing", (room) => socket.in(room).emit("typing"));
    socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

    socket.on("new message", (newMessageReceived) => {
        var chat = newMessageReceived.chat;

        if (!chat.users) return console.log("chat.users not defined");

        chat.users.forEach((user) => {
            if (user._id == newMessageReceived.sender._id) return;

            socket.in(user._id).emit("message received", newMessageReceived);
        });

        socket.off("setup", () => {
            console.log("USER DISCONNECTED");
            socket.leave(userData._id);
        })

    });
});
