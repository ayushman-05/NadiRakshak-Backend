const mongoose = require("mongoose");
const dotenv = require("dotenv");

process.on("uncaughtException", (err) => {
  console.log(err.name, err.message);
  console.log("UNHANDLED EXCEPTION! SHUTTING DOWN APPLICATION");

  process.exit(1);
});

// Import the functions you need from the SDKs you need

//import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// const firebaseConfig = {
//   apiKey: "AIzaSyBdhantGlqIx9HC3vChZv18A0ErgGocV90",
//   authDomain: "nadirakshak-39327.firebaseapp.com",
//   projectId: "nadirakshak-39327",
//   storageBucket: "nadirakshak-39327.firebasestorage.app",
//   messagingSenderId: "994996342354",
//   appId: "1:994996342354:web:9a379e458703dc5018198b",
//   measurementId: "G-Y0F82XN83Q",
// };

// // Initialize Firebase
// const app2 = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app2);

dotenv.config({ path: "./config.env" });
const app = require("./app");

//MONGODB connection
const DB = process.env.MONGODB_URL.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    autoIndex: true,
  })
  .then((con) => {
    //console.log(con.connection);
    console.log("DB connection successful!");
  });

const port = process.env.PORT;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}`);
});

process.on("unhandledRejection", (err) => {
  console.log(err.name, err.message);
  console.log("UNHANDLED REJECTION! SHUTTING DOWN APPLICATION");
  server.close(() => {
    process.exit(1);
  });
});
