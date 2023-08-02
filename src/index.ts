import { OptionValues, program } from 'commander';

import { GpxTrackPoint, gpxTrackToXml, isErr, isStr, log } from './utils';
import { ExifToolMetadata, getImgExifMetadata } from './utils/exiftool';
import { writeFileSync } from 'fs';

program
  .name('img-to-map')
  .description(DESCRIPTION)
  .version(VERSION, '-v, --version', 'output the current version')
  .option('-n, --name <name>', 'track name', 'My Track')
  .option('-t, --type <type>', 'track type', 'hiking')
  .option('-o, --output <output>', 'output file', 'track.gpx')
  .option('--debug', 'output extra debugging');

program.parse(process.argv);

const exifToolMetadataToGpxTrackPoint = (meta: ExifToolMetadata): GpxTrackPoint | Error => {
  const { GPSPosition, DateTimeOriginal } = meta;
  if (!GPSPosition || !DateTimeOriginal) return new Error('Missing GPSPosition or DateTimeOriginal');
  const [latStr, lonStr] = GPSPosition.split(' ');
  if (!latStr || !lonStr) return new Error('Missing lat or lon');
  const lat = parseFloat(latStr);
  if (isNaN(lat)) return new Error('Invalid lat');
  const lon = parseFloat(lonStr);
  if (isNaN(lon)) return new Error('Invalid lon');
  const time = parseExifToolDate(DateTimeOriginal);
  if (isErr(time)) return time;
  return { lat, lon, time };
};

const parseExifToolDate = (dateStr: string): Date | Error => {
  const [date, time] = dateStr.split(' ');
  if (!date || !time) return new Error('Missing date or time');
  const [year, month, day] = date.split(':');
  if (!year || !month || !day) return new Error('Missing year, month, or day');
  const [hour, minute, second] = time.split(':');
  if (!hour || !minute || !second) return new Error('Missing hour, minute, or second');
  const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
  if (isNaN(parsed.getTime())) return new Error('Invalid date');
  return parsed;
};

const run = async (inputArgs: string[], inputOptions: OptionValues) => {
  if (!inputArgs.length) {
    log.err('No input files');
    return process.exit(1);
  }
  log.info(`${inputArgs.length} input files`);
  const points: GpxTrackPoint[] = [];
  for (const arg of inputArgs) {
    const meta = await getImgExifMetadata(arg);
    const point = exifToolMetadataToGpxTrackPoint(meta);
    if (isErr(point)) {
      log.err(`Error getting metadata for ${arg}: ${point.message}`);
    } else {
      points.push(point);
    }
  }
  let name: string = 'My Track';
  if (isStr(inputOptions.name)) {
    name = inputOptions.name;
  }
  log.info(`Track name: ${name}`);
  let trackType: string = 'hiking';
  if (isStr(inputOptions.type)) {
    trackType = inputOptions.type;
  }
  log.info(`Track type: ${trackType}`);
  let output: string = 'track.gpx';
  if (isStr(inputOptions.output)) {
    output = inputOptions.output;
  }
  const gpx = gpxTrackToXml({ name: 'My Track', segments: [points], type: trackType, time: new Date() });
  log.info(`Saving to file: ${output}`);
  writeFileSync(output, gpx);
};

run(program.args, program.opts()).catch(err => (isErr(err) ? log.err(err.message) : log.err(err)));
