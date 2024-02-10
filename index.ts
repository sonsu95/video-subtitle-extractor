import * as fs from 'fs';
import * as path from 'path';
import Ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';

const readdirAsync = promisify(fs.readdir);
const existsAsync = promisify(fs.exists);
const mkdirAsync = promisify(fs.mkdir);

const videoInputPath: string = './video-input';
const audioOutput: string = './audio-output';

// 오디오 형식에 따른 코덱 매핑
const audioCodecMap: { [format: string]: string } = {
  mp3: 'libmp3lame',
  aac: 'aac',
  ogg: 'libvorbis',
  wav: 'pcm_s16le',
  flac: 'flac',
};

async function convertVideo(
  sourcePath: string,
  outputPath: string,
  audioFormat: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const codec = audioCodecMap[audioFormat] || '';
    const fileName = sourcePath.split('/').pop();

    Ffmpeg(sourcePath)
      .output(outputPath)
      .withAudioCodec(codec)
      .on('progress', (progress) => {
        console.log(`Processing ${fileName}: ${progress.percent}% done`);
      })
      .on('end', () => {
        console.log(`Successfully converted ${fileName} to ${audioFormat.toUpperCase()}.`);
        resolve();
      })
      .on('error', (err) => {
        console.error(`Error converting ${fileName}: ${err.message}`);
        reject(err);
      })
      .run();
  });
}

async function convertVideosSequentially(
  inputPath: string,
  outputPath: string,
  audioFormat: 'mp3' | 'aac' | 'ogg' | 'wav' | 'flac',
): Promise<void> {
  const entries = await readdirAsync(inputPath, { withFileTypes: true });
  // 파일 및 디렉토리를 이름에 따라 정렬합니다.
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const sourcePath = path.join(inputPath, entry.name);
    const targetPath = path.join(
      outputPath,
      entry.isDirectory() ? entry.name : `${path.parse(entry.name).name}.${audioFormat}`,
    );

    if (entry.isDirectory()) {
      if (!(await existsAsync(targetPath))) {
        await mkdirAsync(targetPath, { recursive: true });
      }
      await convertVideosSequentially(sourcePath, targetPath, audioFormat);
    } else {
      if (await existsAsync(targetPath)) {
        console.log(`File ${targetPath} already exists. Skipping conversion.`);
        continue;
      }
      await convertVideo(sourcePath, targetPath, audioFormat);
    }
  }
}

async function main() {
  if (!(await existsAsync(audioOutput))) {
    await mkdirAsync(audioOutput, { recursive: true });
  }
  await convertVideosSequentially(videoInputPath, audioOutput, 'mp3');
}

main().catch(console.error);
