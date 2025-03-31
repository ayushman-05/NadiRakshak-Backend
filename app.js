const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const authRoutes = require("./routes/authRoutes");
const campaignRoutes = require("./routes/campaignRoutes");
const reportRoutes = require("./routes/reportRoutes");
const storeRouter = require("./routes/storeRoutes");
const newsRoutes = require("./routes/newsRoutes");
const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

//All routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/campaigns", campaignRoutes);
app.use("/api/v1/reports",reportRoutes);
app.use("/api/v1/store", storeRouter);
app.use("/api/v1/news", newsRoutes);
//for fun
app.get("/", (req, res) => {
  res.send("Hello from server!!");
});

//Handling undefined routes not caught by above route
app.use((req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server!`, 404));
});

//GLOBAL ERROR HANDLING MIDDLEWARE
app.use(globalErrorHandler);

module.exports = app;
