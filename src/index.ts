import { OptionValues, program } from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import { parse as parsePath } from 'path';

import {
  GpxTrackPoint,
  gpxTrackToXml,
  GpxViewPoint,
  GpxViewPointSchema,
  isArr,
  isErr,
  isFileExists,
  isStr,
  isStrArr,
  listFilesInFolder,
  log,
  parseXmlGpxFile,
  xmlGpxFileToGpxTrackPoints,
} from './utils';
import { ExifToolMetadata, getImgExifMetadata, parseExifToolDate } from './utils/exiftool';

program
  .name('img-to-map')
  .description(DESCRIPTION)
  .version(VERSION, '-v, --version', 'output the current version')
  .option('-n, --name <name>', 'track name', 'My Track')
  .option('-t, --type <type>', 'track type', 'hiking')
  .option('-vp, --viewpoints <viewpoints>', 'path to JSON file with viewpoints')
  .option('-e, --extend <extend...>', 'paths to GPX files to extend with the track')
  .option('-f, --folder <folder>', 'folder with photos')
  .option('-o, --output <output>', 'output file', 'track.gpx')
  .option('--split-by-days', 'split each day to a separate file')
  .option('--debug', 'output extra debugging');

program.parse(process.argv);

const exifToolMetadataToGpxTrackPoint = (data: ExifToolMetadata): GpxTrackPoint | Error => {
  const { GPSPosition, DateTimeOriginal, OffsetTimeOriginal, GPSAltitude, SourceFile } = data;
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
  let elevation: undefined | number = undefined;
  if (GPSAltitude) elevation = GPSAltitude;
  const meta = parsePath(SourceFile).base;
  return { lat, lon, time, elevation, meta };
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

const strToViewpoints = (str: string): GpxViewPoint[] | Error => {
  const viewpoints: GpxViewPoint[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const data = JSON.parse(str);
    if (!isArr(data)) return new Error('Invalid viewpoints file format');
    for (const item of data) {
      const parsed = GpxViewPointSchema.safeParse(item);
      if (!parsed.success) {
        log.warn('Invalid viewpoint item format: ', JSON.stringify(item));
        continue;
      }
      viewpoints.push(parsed.data);
    }
  } catch (err: unknown) {
    return new Error('Parsing viewpoints file error');
  }
  return viewpoints;
};

const run = async (inputArgs: string[], inputOptions: OptionValues) => {
  let filePaths: string[] = inputArgs;
  if (isStr(inputOptions.folder)) {
    if (!isFileExists(inputOptions.folder)) {
      log.err(`Folder not found: ${inputOptions.folder}`);
      return process.exit(1);
    }
    filePaths = listFilesInFolder(inputOptions.folder, { extensions: ['jpg', 'jpeg', 'png', 'heic'], recursive: false });
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
      log.warn(`Error getting metadata for ${filePath}: ${point.message}`);
    } else {
      points.push(point);
    }
  }
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
  // Viewpoints
  let viewpoints: GpxViewPoint[] = [];
  if (isStr(inputOptions.viewpoints)) {
    if (!isFileExists(inputOptions.viewpoints)) {
      log.err(`Viewpoints file not found: ${inputOptions.viewpoints}`);
      return process.exit(1);
    }
    const content = readFileSync(inputOptions.viewpoints, 'utf8');
    const parsed = strToViewpoints(content);
    if (isErr(parsed)) {
      log.err(`Error parsing viewpoints file: ${parsed.message}`);
      return process.exit(1);
    }
    viewpoints = parsed;
  }
  // Extend with other tracks
  if (isStrArr(inputOptions.extend)) {
    for (const extendFilePath of inputOptions.extend) {
      if (!isFileExists(extendFilePath)) {
        log.err(`Extend file not found: ${extendFilePath}`);
        return process.exit(1);
      }
      log.info(`Extending with file: ${extendFilePath}`);
      try {
        const content = readFileSync(extendFilePath, 'utf8');
        const xml = await parseXmlGpxFile(content);
        const newPoints = xmlGpxFileToGpxTrackPoints(xml);
        points = points.concat(newPoints);
      } catch (err: unknown) {
        log.err(`Error parsing file: ${extendFilePath}`, isErr(err) ? err.message : err);
      }
    }
  }
  // Sort by time
  points = points.sort((a, b) => a.time.getTime() - b.time.getTime());
  log.info(`Total points: ${points.length}`);
  // Output
  let output: string = 'track.gpx';
  if (isStr(inputOptions.output)) {
    output = inputOptions.output;
  }
  // Split by days
  if (!inputOptions.splitByDays) {
    // Split into segments by day
    const segments = gpxTrackPointsToSegmentsByDay(points);
    const gpx = gpxTrackToXml({ name, segments, type: trackType, viewpoints, time: new Date() });
    log.info(`Saving to file: ${output}`);
    writeFileSync(output, gpx);
  } else {
    // Split into segments by day
    const segments = gpxTrackPointsToSegmentsByDay(points);
    const baseFileName = output.replace(/\.[^/.]+$/, '');
    for (const segment of segments) {
      if (!segment.length) continue;
      const segmentFileName = `${baseFileName}-${segment[0].time.toISOString().slice(0, 10)}.gpx`;
      const gpx = gpxTrackToXml({ name, segments: [segment], type: trackType, viewpoints, time: new Date() });
      log.info(`Saving to file: ${segmentFileName}`);
      writeFileSync(segmentFileName, gpx);
    }
  }
};

run(program.args, program.opts()).catch(err => {
  isErr(err) ? log.err(err.message) : log.err(err);
  process.exit(1);
});
