const request = require('request');
const Joi = require('joi');

const Simulation = require('../config/Simulation');
const TempSimulator = require('../simulators/tempSimulator');
const OptionsSchema = require('../models/options-schema');

var simulationInterval;
var simulationArgs;
var simDuration = 0;
var simulationResults = [];

var simState = [
  'Not Started',
  'Initialized',
  'Running',
  'Completed',
  'Aborted'
];
var simStatus = simState[0];

const initSim = (Simulation) => {
  const result = Joi.validate(Simulation, OptionsSchema);
  if (result.error) {
    throw new Error(`Simulation options error ${result.error}`);
  }
  
  simulationArgs = Simulation;
  TempSimulator.init(simulationArgs);

  console.log(`Simulation Initialized with args: ${JSON.stringify(simulationArgs)}`);

  simStatus = simState[1];
};

const runSim = () => {
  simStatus = simState[2];
  
  simulationInterval = setInterval( () => {
    if (simDuration <= simulationArgs.totalDuration) {
      console.log(`Running: ${simDuration / 1000} seconds`);

      simulationArgs.api.payload.temperature = TempSimulator.getTemp(simDuration);

      console.log(simulationArgs.api.payload.temperature);

      simulationArgs.api.payload.date_created = new Date();

      request.post({
        uri: simulationArgs.api.uri,
        body:  JSON.stringify(simulationArgs.api.payload),
        headers: simulationArgs.api.headers
      }, (err, res, body) => {
        if (err) {
          console.log(`Error posting sim run to api: ${err}`);
        } else {
          simulationResults.push(res.body);
          console.log(`Run posted: ${JSON.stringify(res.body)}`);
        } 
      });
      
      simDuration += simulationArgs.interval;
    } else {
      console.log(`Simulation complete. Total time: ${simDuration / 1000} seconds`);
      reportOnSim();
      
      clearInterval(simulationInterval);
      simStatus = simState[3];
      simDuration = 0;
    }
  }, simulationArgs.interval);
}

const reportOnSim = () => {
  console.log(`Total runs: ${simulationResults.length}`);
}

const getStatus = () => {
  return simStatus;
}

module.exports = {
  init: initSim,
  run: runSim,
  status: getStatus
};
