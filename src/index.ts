import { OptionValues, program } from 'commander';
import { writeFileSync } from 'fs';

import { GpxTrackPoint, gpxTrackToXml, isErr, isFileExists, isStr, listFilesInFolder, log } from './utils';
import { ExifToolMetadata, getImgExifMetadata, parseExifToolDate } from './utils/exiftool';

program
  .name('img-to-map')
  .description(DESCRIPTION)
  .version(VERSION, '-v, --version', 'output the current version')
  .option('-n, --name <name>', 'track name', 'My Track')
  .option('-t, --type <type>', 'track type', 'hiking')
  .option('-f, --folder <folder>', 'folder with photos')
  .option('-o, --output <output>', 'output file', 'track.gpx')
  .option('--split-by-days', 'split each day to a separate file')
  .option('--debug', 'output extra debugging');

program.parse(process.argv);

const exifToolMetadataToGpxTrackPoint = (meta: ExifToolMetadata): GpxTrackPoint | Error => {
  const { GPSPosition, DateTimeOriginal, OffsetTimeOriginal, GPSAltitude, SourceFile } = meta;
  if (!GPSPosition) return new Error('Missing GPSPosition');
  if (!DateTimeOriginal) return new Error('Missing DateTimeOriginal');
  const [latStr, lonStr] = GPSPosition.split(' ');
  if (!latStr || !lonStr) return new Error('Missing lat or lon');
  const lat = parseFloat(latStr);
  if (isNaN(lat)) return new Error('Invalid lat');
  const lon = parseFloat(lonStr);
  if (isNaN(lon)) return new Error('Invalid lon');
  const time = parseExifToolDate(DateTimeOriginal, OffsetTimeOriginal);
  if (isErr(time)) return time;
  let ele: undefined | number = undefined;
  if (GPSAltitude) ele = GPSAltitude;
  return { lat, lon, time, ele, meta: SourceFile };
};

const gpxTrackPointsToSegmentsByDay = (rawPoints: GpxTrackPoint[]): GpxTrackPoint[][] => {
  // Sort points by time
  const points = [...rawPoints].sort((a, b) => a.time.getTime() - b.time.getTime());
  const segments: GpxTrackPoint[][] = [];
  let currentSegment: GpxTrackPoint[] = [];
  let currentDate: Date | undefined = undefined;
  for (const point of points) {
    if (!currentDate || currentDate.getDate() !== point.time.getDate()) {
      currentDate = point.time;
      if (currentSegment.length) {
        segments.push(currentSegment);
        currentSegment = [];
      }
    }
    currentSegment.push(point);
  }
  if (currentSegment.length) {
    segments.push(currentSegment);
  }
  return segments;
};

const run = async (inputArgs: string[], inputOptions: OptionValues) => {
  let filePaths: string[] = inputArgs;
  if (isStr(inputOptions.folder)) {
    if (!isFileExists(inputOptions.folder)) {
      log.err(`Folder not found: ${inputOptions.folder}`);
      return process.exit(1);
    }
    filePaths = listFilesInFolder(inputOptions.folder, ['jpg', 'jpeg', 'png', 'heic']);
  }
  if (!filePaths.length) {
    log.err('No input files');
    return process.exit(1);
  }
  log.info(`${filePaths.length} input files`);
  let points: GpxTrackPoint[] = [];
  for (const filePath of filePaths) {
    const meta = await getImgExifMetadata(filePath);
    const point = exifToolMetadataToGpxTrackPoint(meta);
    if (isErr(point)) {
      log.err(`Error getting metadata for ${filePath}: ${point.message}`);
    } else {
      points.push(point);
    }
  }
  // Sort by time
  points = points.sort((a, b) => a.time.getTime() - b.time.getTime());
  // Name
  let name: string = 'My Track';
  if (isStr(inputOptions.name)) {
    name = inputOptions.name;
  }
  log.info(`Track name: ${name}`);
  // Type
  let trackType: string = 'hiking';
  if (isStr(inputOptions.type)) {
    trackType = inputOptions.type;
  }
  log.info(`Track type: ${trackType}`);
  // Output
  let output: string = 'track.gpx';
  if (isStr(inputOptions.output)) {
    output = inputOptions.output;
  }
  // Split by days
  if (!inputOptions.splitByDays) {
    // Split into segments by day
    const segments = gpxTrackPointsToSegmentsByDay(points);
    const gpx = gpxTrackToXml({ name, segments, type: trackType, time: new Date() });
    log.info(`Saving to file: ${output}`);
    writeFileSync(output, gpx);
  } else {
    // Split into segments by day
    const segments = gpxTrackPointsToSegmentsByDay(points);
    const baseFileName = output.replace(/\.[^/.]+$/, '');
    for (const segment of segments) {
      if (!segment.length) continue;
      const segmentFileName = `${baseFileName}-${segment[0].time.toISOString().slice(0, 10)}.gpx`;
      const gpx = gpxTrackToXml({ name, segments: [segment], type: trackType, time: new Date() });
      log.info(`Saving to file: ${segmentFileName}`);
      writeFileSync(segmentFileName, gpx);
    }
  }
};

run(program.args, program.opts()).catch(err => (isErr(err) ? log.err(err.message) : log.err(err)));
