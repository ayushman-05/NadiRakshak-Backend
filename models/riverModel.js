const mongoose = require("mongoose");

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

const River = mongoose.model("River", riverSchema);

module.exports = River;
