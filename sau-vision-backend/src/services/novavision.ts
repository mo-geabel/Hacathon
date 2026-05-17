import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Use the bundled ffmpeg binary — no system install required
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// ─── Config ──────────────────────────────────────────────────────────────────
const NOVA_API_URL  = process.env.NOVA_API_URL  || 'http://localhost:7001/api';
const NOVA_API_KEY  = process.env.NOVAVISION_WEBHOOK_SECRET || 'G0xXI7ZgwAsKdPR7rcz4Wsu_c72RohNh';
const DEFAULT_VIDEO = process.env.VIDEO_PATH    || path.join(process.cwd(), 'video.mp4');
const FPS           = 1;
const EMPTY_TIMEOUT = 10_000; // ms

// ─── State ───────────────────────────────────────────────────────────────────
let classStartTime:  string | null = null;
let classEndTime:    string | null = null;
let maxConcurrent    = 0;
let lastFrameResult: any = null;
let emptyTimeout:    NodeJS.Timeout | null = null;
let isProcessing     = false;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsePersonCount(data: any): number {
  try {
    const nodes: any[] = Object.values(data);
    const personNode   = nodes.find((n) => n.name === 'PersonDetection');
    if (!personNode) return 0;

    const detections: any[] =
      personNode?.configs?.executor?.value?.value?.outputs?.outputDetections?.value ?? [];

    return detections.filter((d) => d.classLabel === 'person').length;
  } catch {
    return 0;
  }
}

function toBase64DataUrl(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

/** Extract frames from videoPath into tmpDir at FPS frames/sec. */
function extractFrames(videoPath: string, tmpDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([`-vf fps=${FPS}`])
      .output(path.join(tmpDir, 'frame%04d.jpg'))
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(new Error(`ffmpeg error: ${err.message}`)))
      .run();
  });
}

async function sendFrame(framePath: string) {
  const resource = toBase64DataUrl(framePath);

  // Read the full pipeline configuration template
  const templatePath = path.join(process.cwd(), 'pipeline-template.json');
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
        'access-token': NOVA_API_KEY,
      },
      timeout: 30_000, // YOLO inference can take longer
    }
  );

  const count = parsePersonCount(response.data);
  
  // Extract the rendered image (with bounding boxes) from the response JSON
  const responseStr = JSON.stringify(response.data);
  // Nova Vision returns the rendered frame in one of the node outputs as a data URL
  const base64Matches = responseStr.match(/data:image\/[a-zA-Z]*;base64,[A-Za-z0-9+/=]+/g);
  
  let processedBase64 = null;
  if (base64Matches && base64Matches.length > 0) {
    // The last base64 string in the payload is typically the final rendered image from the ImageView node
    processedBase64 = base64Matches[base64Matches.length - 1];
  }

  return { processedBase64, count };
}

function handleCount(count: number): void {
  if (count > maxConcurrent) maxConcurrent = count;

  if (count > 0) {
    if (classStartTime === null) {
      classStartTime = new Date().toISOString();
      console.log('✅ Class started:', classStartTime);
    }
    if (emptyTimeout) {
      clearTimeout(emptyTimeout);
      emptyTimeout = null;
    }
  }

  if (count === 0 && classStartTime !== null && !emptyTimeout) {
    emptyTimeout = setTimeout(() => {
      classEndTime = new Date().toISOString();
      console.log('🏁 Class ended :', classEndTime);
      console.log('👥 Peak students:', maxConcurrent);

      classStartTime = null;
      maxConcurrent  = 0;
      emptyTimeout   = null;
    }, EMPTY_TIMEOUT);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function processVideo(videoPath = DEFAULT_VIDEO): Promise<void> {
  if (isProcessing) {
    console.warn('⚠️  Already processing — skipping.');
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

    const frames = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.jpg')).sort();
    console.log(`📸 Sending ${frames.length} frame(s) to Nova Vision…\n`);

    for (const frame of frames) {
      const { processedBase64, count } = await sendFrame(path.join(tmpDir, frame));
      lastFrameResult = { frame, count, receivedAt: new Date().toISOString(), processedBase64 };
      console.log(`  [${frame}] 👥 ${count} person(s) detected`);
      handleCount(count);
    }

    console.log('\n✅ Done. Stats:', getNovaVisionStats());
  } catch (err: any) {
    console.error('❌ processVideo error:', err.message);
    throw err;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    isProcessing = false;
  }
}

export function getNovaVisionStats() {
  return {
    classStartTime,
    classEndTime,
    totalStudents: maxConcurrent,
    isClassActive: classStartTime !== null,
    isProcessing,
  };
}

export function getLastRawFrame() {
  return {
    frame: lastFrameResult,
    wsConnected: false, // kept for API compatibility; pipeline is HTTP-based
  };
}
