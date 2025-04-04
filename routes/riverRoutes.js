const express = require("express");
const router = express.Router();
const riverController = require("../controllers/riverController");

// Get all rivers (basic list)
router.get("/", riverController.getAllRivers);

// Get details for a specific river including all its stations
router.get("/:riverId", riverController.getRiverById);

// Get all stations for a specific river
router.get("/:riverId/stations", riverController.getRiverStations);

// Get detailed data for a specific station
router.get("/:riverId/stations/:stationCode", riverController.getStationData);

// Get parameter data for a specific station
router.get(
  "/:riverId/stations/:stationCode/parameters/:parameter",
  riverController.getParameterData
);

module.exports = router;
