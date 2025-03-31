const AppError = require("../utils/appError");

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    console.log(err.message);
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    //console.error("Error:", err);
    res.status(500).json({
      status: "error",
      //error: err,
      message: "Something went wrong!!",
    });
  }
};

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = Object.values(err.keyValue)[0];
  const message = `Duplicate field value ${value} . Please use Another value. `;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  let error = { ...err };
  error.message = err.message;
  console.log(error);
  //console.log(err);
  if (err.name === "CastError") {
    error = handleCastErrorDB(error);
  }
  if (err.code === 11000) {
    error = handleDuplicateFieldsDB(error);
  }
  if (err.name === "ValidationError") {
    error = handleValidationErrorDB(error);
  }
  if (process.env.NODE_ENV === "development") {
    sendErrorDev(error, res);
  } else if (process.env.NODE_ENV === "production") {
    sendErrorProd(error, res);
  }
  next();
};
