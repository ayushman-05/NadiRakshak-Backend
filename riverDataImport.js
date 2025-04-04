// riverDataImport.js
const mongoose = require("mongoose");
const fs = require("fs");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: "./config.env" });

// River Schema
const riverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A river must have a name"],
      unique: true,
      trim: true,
    },
    stations: [
      {
        stationCode: {
          type: String,
          required: [true, "A station must have a code"],
          trim: true,
        },
        name: {
          type: String,
          required: [true, "A station must have a name"],
          trim: true,
        },
        stateName: {
          type: String,
          required: [true, "A station must have a state name"],
          trim: true,
        },
        data: [
          {
            year: String,
            "Temperature (°C)": {
              min: Number,
              max: Number,
            },
            "Dissolved Oxygen (mg/L)": {
              min: Number,
              max: Number,
            },
            pH: {
              min: Number,
              max: Number,
            },
            "Conductivity (µmhos/cm)": {
              min: Number,
              max: Number,
            },
            "Bio-Chemical Oxygen Demand (mg/L)": {
              min: Number,
              max: Number,
            },
            "Nitrate (mg/L)": {
              min: mongoose.Schema.Types.Mixed, // Could be Number or String ("BDL")
              max: mongoose.Schema.Types.Mixed,
            },
            "Faecal Coliform (MPN/100ml)": {
              min: Number,
              max: Number,
            },
            "Total Coliform (MPN/100ml)": {
              min: Number,
              max: Number,
            },
            "Faecal Streptococci (MPN/100ml)": {
              min: Number,
              max: Number,
            },
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Create River model
const River = mongoose.model("River", riverSchema);

// Read the JSON file
const importData = async () => {
  try {
    // Connect to MongoDB
    const DB = process.env.MONGODB_URL.replace(
      "<PASSWORD>",
      process.env.DATABASE_PASSWORD
    );

    await mongoose.connect(DB, {
      autoIndex: true,
    });

    console.log("DB connection successful!");

    // Read the JSON file
    const filePath = path.join(__dirname, "rivers.json");
    const jsonData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    // Clear existing data (optional)
    await River.deleteMany();
    console.log("Existing river data deleted");

    // Import new data
    await River.insertMany(jsonData.rivers);
    console.log("River data successfully imported!");

    // Close connection
    mongoose.connection.close();
    console.log("DB connection closed");

    process.exit(0);
  } catch (err) {
    console.error("ERROR:", err);
    process.exit(1);
  }
};

// Process unhandled errors
process.on("unhandledRejection", (err) => {
  console.log(err.name, err.message);
  console.log("UNHANDLED REJECTION! SHUTTING DOWN IMPORT");
  mongoose.connection.close(() => {
    process.exit(1);
  });
});

// Run the import
importData();
