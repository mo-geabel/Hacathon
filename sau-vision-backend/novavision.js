const WebSocket = require('ws');

// Connect to the WS channel the pipeline is already broadcasting on
const ws = new WebSocket(`${WS_URL}`);

let classStartTime = null;
let classEndTime = null;
let seenTrackerIDs = new Set();
let emptyTimeout = null;

ws.on('message', (data) => {
  const frame = JSON.parse(data);
  const count = frame?.DgbooY?.outputData?.count ?? 0;  // ObjectCounting output
  const trackerIDs = frame?.ykPbmp?.outputDetections?.map(d => d.trackerID) ?? [];

  // Track unique people
  trackerIDs.forEach(id => seenTrackerIDs.add(id));

  // First person enters
  if (count > 0) {
    if (classStartTime === null) {
      classStartTime = new Date().toISOString();
      console.log('Class started:', classStartTime);
    }
    
    // Clear any pending class-end timeout since someone is still in the room
    if (emptyTimeout) {
      clearTimeout(emptyTimeout);
      emptyTimeout = null;
    }
  }

  // Room becomes empty
  if (count === 0 && classStartTime !== null && !emptyTimeout) {
    // Wait a certain amount of time to confirm the class is actually empty 
    // and not just a momentary loss of tracking (e.g. 10 seconds)
    emptyTimeout = setTimeout(() => {
      classEndTime = new Date().toISOString();
      console.log('Class ended:', classEndTime);
      console.log('Total unique students:', seenTrackerIDs.size);
      
      // Reset variables to be ready for the next class
      classStartTime = null;
      seenTrackerIDs.clear();
      emptyTimeout = null;
    }, 10000); // 10 seconds buffer
  }
});