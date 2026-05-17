require('dotenv').config();
const axios   = require('axios');
const ffmpeg  = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const fs      = require('fs');
const path    = require('path');
const os      = require('os');

// Point fluent-ffmpeg at the bundled binary (no system install needed)
ffmpeg.setFfmpegPath(ffmpegPath);

// ─── Config ──────────────────────────────────────────────────────────────────
const NOVA_API_URL  = process.env.NOVA_API_URL  || 'http://localhost:7001/api';
const NOVA_API_KEY  = process.env.NOVAVISION_WEBHOOK_SECRET || '';
const VIDEO_PATH    = process.env.VIDEO_PATH    || path.join(__dirname, 'video.mp4');
const FPS           = 2;   // frames to sample per second of video
const EMPTY_TIMEOUT = 10000; // ms of empty room before class is declared ended

// ─── State ───────────────────────────────────────────────────────────────────
let classStartTime  = null;
let classEndTime    = null;
let maxConcurrent   = 0;   // highest simultaneous count seen
let lastFrameResult = null;
let emptyTimeout    = null;
let isProcessing    = false;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse a Nova Vision API response and return the number of detected people.
 * Finds the PersonDetection capsule by name (not hard-coded node ID).
 */
function parsePersonCount(data) {
  try {
    const nodes = Object.values(data);
    const personNode = nodes.find(n => n.name === 'PersonDetection');
    if (!personNode) return 0;

    const detections =
      personNode?.configs?.executor?.value?.value?.outputs?.outputDetections?.value ?? [];

    return detections.filter(d => d.classLabel === 'person').length;
  } catch {
    return 0;
  }
}

/** Read a JPEG file from disk and return a base64 data-URL string. */
function toBase64DataUrl(filePath) {
  const buf = fs.readFileSync(filePath);
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

/**
 * POST one frame to the Nova Vision pipeline.
 * Returns the raw response + parsed person count.
 */
async function sendFrame(framePath) {
  const resource = toBase64DataUrl(framePath);

  // Read the full pipeline configuration template
  const templatePath = path.join(__dirname, 'pipeline-template.json');
  let payloadStr = fs.readFileSync(templatePath, 'utf8');
  
  // Inject the base64 string into the template
  payloadStr = payloadStr.replace('__BASE64_PLACEHOLDER__', resource);
  const payload = JSON.parse(payloadStr);

  const response = await axios.post(
    NOVA_API_URL,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        'access-token': NOVA_API_KEY
      },
      timeout: 30000 // YOLO inference can take longer
    }
  );

  const count = parsePersonCount(response.data);
  return { raw: response.data, count };
}

/** Update shared class-session state based on the latest person count. */
function handleCount(count) {
  // Track peak attendance
  if (count > maxConcurrent) maxConcurrent = count;

  if (count > 0) {
    // First detection → class starts
    if (classStartTime === null) {
      classStartTime = new Date().toISOString();
      console.log('✅ Class started:', classStartTime);
    }

    // Someone is still in the room — cancel any pending end
    if (emptyTimeout) {
      clearTimeout(emptyTimeout);
      emptyTimeout = null;
    }
  }

  if (count === 0 && classStartTime !== null && !emptyTimeout) {
    // Room just became empty — start the countdown
    emptyTimeout = setTimeout(() => {
      classEndTime = new Date().toISOString();
      console.log('🏁 Class ended :', classEndTime);
      console.log('👥 Peak students:', maxConcurrent);

      // Reset for a potential next class
      classStartTime = null;
      maxConcurrent  = 0;
      emptyTimeout   = null;
    }, EMPTY_TIMEOUT);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * Extract frames from VIDEO_PATH at FPS frames/sec, send each to Nova Vision,
 * and update the class-session state.
 */
/** Extract frames from videoPath into tmpDir at FPS frames/sec using bundled ffmpeg. */
function extractFrames(videoPath, tmpDir) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([`-vf fps=${FPS}`])
      .output(path.join(tmpDir, 'frame%04d.jpg'))
      .on('end', resolve)
      .on('error', (err) => reject(new Error(`ffmpeg error: ${err.message}`)))
      .run();
  });
}

/** Extract frames, send each to Nova Vision, update class-session state. */
async function processVideo(videoPath = VIDEO_PATH) {
  if (isProcessing) {
    console.warn('⚠️  Already processing a video — skipping.');
    return;
  }
  isProcessing = true;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novavision-'));

  try {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    console.log(`🎬 Extracting frames at ${FPS} fps from: ${videoPath}`);
    await extractFrames(videoPath, tmpDir);

    const frames = fs.readdirSync(tmpDir).filter(f => f.endsWith('.jpg')).sort();
    console.log(`📸 Sending ${frames.length} frame(s) to Nova Vision…\n`);

    for (const frame of frames) {
      const { raw, count } = await sendFrame(path.join(tmpDir, frame));
      lastFrameResult = { frame, count, receivedAt: new Date().toISOString(), raw };
      console.log(`  [${frame}] 👥 ${count} person(s) detected`);
      handleCount(count);
    }

    console.log('\n✅ Done. Stats:', getStats());
  } catch (err) {
    console.error('❌ Error processing video:', err.message);
    throw err;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    isProcessing = false;
  }
}

/** Return the current class-session snapshot. */
function getStats() {
  return {
    classStartTime,
    classEndTime,
    totalStudents: maxConcurrent,   // peak simultaneous count (best proxy without trackerID)
    isClassActive:  classStartTime !== null,
    isProcessing,
  };
}

/** Return the last raw API response (useful for debugging the payload). */
function getLastRawFrame() {
  return lastFrameResult;
}

module.exports = { processVideo, getStats, getLastRawFrame };

// ─── Run directly ─────────────────────────────────────────────────────────────
if (require.main === module) {
  processVideo().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}