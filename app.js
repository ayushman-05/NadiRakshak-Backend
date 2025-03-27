const express = require("express");
const morgan = require("morgan");
const mongoose = require("mongoose");
const session = require("express-session");
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const authRoutes = require("./routes/authRoutes");
const app = express();

app.use(express.json());
app.use(morgan('dev'));

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_fallback_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      httpOnly: true, // Prevents client-side JS from reading the cookie
    },
  })
);
//All routes
app.use("/api/v1/auth", authRoutes);


//for fun
app.get('/',(req,res)=>{
    res.status(200).send("Hello from server!!");
});

//Handling undefined routes not caught by above route
app.use((req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server!`, 404));
});


//GLOBAL ERROR HANDLING MIDDLEWARE
app.use(globalErrorHandler);

module.exports = app;
