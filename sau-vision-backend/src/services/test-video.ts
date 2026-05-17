import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Configure ffmpeg to use the bundled binary so we don't need it installed on the system
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/**
 * Step 1: Change video into Photo Base64
 * 
 * This function takes a video path, extracts frames at the given FPS, 
 * and yields them one by one as Base64 strings.
 * Using an async generator (yield) prevents memory crashes for large videos!
 */
export async function* extractVideoFramesAsBase64(videoPath: string, fps: number = 2) {
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found at path: ${videoPath}`);
  }

  // Create a temporary directory to hold the extracted JPEG frames
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novavision-frames-'));
  console.log(`🎬 Extracting frames from ${videoPath} to ${tmpDir}...`);

  try {
    // Wait for ffmpeg to finish extracting all frames to the temp directory
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions([`-vf fps=${fps}`])
        .output(path.join(tmpDir, 'frame-%04d.jpg'))
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(new Error(`FFmpeg Error: ${err.message}`)))
        .run();
    });

    // Read the extracted files in order
    const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.jpg')).sort();
    console.log(`📸 Successfully extracted ${files.length} frames! Converting to Base64...`);

    // Yield each frame as a Base64 string one by one
    for (const file of files) {
      const filePath = path.join(tmpDir, file);
      const buffer = fs.readFileSync(filePath);
      const base64String = `data:image/jpeg;base64,${buffer.toString('base64')}`;
      
      yield {
        filename: file,
        base64: base64String
      };
    }
  } finally {
    // ALWAYS clean up the temporary directory when done or if an error occurs
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log(`🧹 Cleaned up temporary files.`);
  }
}

// ============================================================================
// Quick Test: Run this file directly using `npx tsx src/services/test-video.ts`
// ============================================================================
if (require.main === module) {
  (async () => {
    const testVideoPath = path.join(process.cwd(), 'video.mp4');
    
    try {
      let frameCount = 0;
      // Loop through the generator to get frames one by one
      for await (const frame of extractVideoFramesAsBase64(testVideoPath, 2)) {
        frameCount++;
        console.log(`✅ Extracted [${frame.filename}] -> Base64 Length: ${frame.base64.length} characters`);
        
        if (frameCount === 1) {
          console.log('\n--- START OF BASE64 STRING ---');
          console.log(frame.base64);
          console.log('--- END OF BASE64 STRING ---\n');
          break;
        }
      }
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  })();
}
