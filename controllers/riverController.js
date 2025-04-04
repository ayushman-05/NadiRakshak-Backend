const River = require("../models/riverModel");

// Get all rivers (name and ID only)
exports.getAllRivers = async (req, res) => {
  try {
    const rivers = await River.find().select("name _id");

    res.status(200).json({
      status: "success",
      results: rivers.length,
      data: {
        rivers,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch rivers",
      error: err.message,
    });
  }
};

// Get single river by ID with all details
exports.getRiverById = async (req, res) => {
  try {
    const river = await River.findById(req.params.riverId);

    if (!river) {
      return res.status(404).json({
        status: "fail",
        message: "River not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        river,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch river details",
      error: err.message,
    });
  }
};

// Get all stations for a specific river
exports.getRiverStations = async (req, res) => {
  try {
    const river = await River.findById(req.params.riverId).select(
      "name stations._id stations.stationCode stations.name stations.stateName"
    );

    if (!river) {
      return res.status(404).json({
        status: "fail",
        message: "River not found",
      });
    }

    res.status(200).json({
      status: "success",
      results: river.stations.length,
      data: {
        riverName: river.name,
        stations: river.stations,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch stations",
      error: err.message,
    });
  }
};

exports.getStationData = async (req, res) => {
  try {
    const { riverId, stationCode } = req.params;

    const river = await River.findById(riverId);

    if (!river) {
      return res.status(404).json({
        status: "fail",
        message: "River not found",
      });
    }

    const station = river.stations.find((s) => s.stationCode === stationCode);

    if (!station) {
      return res.status(404).json({
        status: "fail",
        message: "Station not found",
      });
    }

    // Convert Mongoose documents to plain JavaScript objects
    const stationData = station.data.map((record) => record.toObject());

    // Organize data by parameter for easier graph rendering on the client
    const parameters = new Set();
    const yearData = {};

    // Extract all available parameters and years
    stationData.forEach((yearRecord) => {
      const year = yearRecord.year;
      yearData[year] = {};

      // Get only the actual data parameters (not Mongoose internals)
      Object.keys(yearRecord).forEach((key) => {
        if (
          key !== "year" &&
          key !== "_id" &&
          typeof yearRecord[key] === "object"
        ) {
          parameters.add(key);
          yearData[year][key] = yearRecord[key];
        }
      });
    });

    // Format data by parameter
    const parameterData = {};
    parameters.forEach((param) => {
      parameterData[param] = Object.keys(yearData).map((year) => ({
        year,
        min: yearData[year][param]?.min,
        max: yearData[year][param]?.max,
      }));
    });

    console.log(parameters);

    res.status(200).json({
      status: "success",
      data: {
        riverName: river.name,
        stationName: station.name,
        stationCode: station.stationCode,
        stateName: station.stateName,
        parameters: Array.from(parameters),
        parameterData,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch station data",
      error: err.message,
    });
  }
};
// // Get detailed data for a specific station
// exports.getStationData = async (req, res) => {
//   try {
//     const { riverId, stationCode } = req.params;

//     const river = await River.findById(riverId);

//     if (!river) {
//       return res.status(404).json({
//         status: "fail",
//         message: "River not found",
//       });
//     }

//     const station = river.stations.find((s) => s.stationCode === stationCode);

//     if (!station) {
//       return res.status(404).json({
//         status: "fail",
//         message: "Station not found",
//       });
//     }

//     // Organize data by parameter for easier graph rendering on the client
//     const parameters = new Set();
//     const yearData = {};
//    // console.log(station.data);
//     // Extract all available parameters and years
//     station.data.forEach((yearRecord) => {
//       const year = yearRecord.year;
//       yearData[year] = {};
//       console.log(Object.keys(yearRecord));
//       Object.keys(yearRecord).forEach((key) => {
//         if (key !== "year" && key !== "_id") {
//           parameters.add(key);
//           yearData[year][key] = yearRecord[key];
//         }
//       });
//     });
//     console.log(parameters);
//     // Format data by parameter
//     const parameterData = {};
//     parameters.forEach((param) => {
//       parameterData[param] = Object.keys(yearData).map((year) => ({
//         year,
//         min: yearData[year][param]?.min,
//         max: yearData[year][param]?.max,
//       }));
//     });

//     res.status(200).json({
//       status: "success",
//       data: {
//         riverName: river.name,
//         stationName: station.name,
//         stationCode: station.stationCode,
//         stateName: station.stateName,
//         parameters: Array.from(parameters),
//         parameterData,
//       },
//     });
//   } catch (err) {
//     res.status(500).json({
//       status: "error",
//       message: "Failed to fetch station data",
//       error: err.message,
//     });
//   }
// };

// Get specific parameter data for a station
exports.getParameterData = async (req, res) => {
  try {
    const { riverId, stationCode, parameter } = req.params;

    const river = await River.findById(riverId);

    if (!river) {
      return res.status(404).json({
        status: "fail",
        message: "River not found",
      });
    }

    const station = river.stations.find((s) => s.stationCode === stationCode);

    if (!station) {
      return res.status(404).json({
        status: "fail",
        message: "Station not found",
      });
    }

    // Extract data for the specific parameter across all years
    const parameterData = station.data.map((yearRecord) => ({
      year: yearRecord.year,
      min: yearRecord[parameter]?.min,
      max: yearRecord[parameter]?.max,
    }));

    res.status(200).json({
      status: "success",
      data: {
        riverName: river.name,
        stationName: station.name,
        stationCode: station.stationCode,
        stateName: station.stateName,
        parameter,
        parameterData,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch parameter data",
      error: err.message,
    });
  }
};
