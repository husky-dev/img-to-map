import { isNum, isStr } from './types';

export interface GpxTrack {
  name: string;
  segments: GpxTrackSegment[];
  time?: Date;
  type?: string; // hiking, running, biking, walking, driving, flying, etc.
}

export type GpxTrackSegment = GpxTrackPoint[];

export interface GpxTrackPoint {
  lat: number;
  lon: number;
  ele?: number;
  meta?: string;
  time: Date;
  heartRate?: number;
}

export const gpxTrackToXml = (track: GpxTrack): string => {
  const { name, segments, type: trackType, time: rawTime } = track;
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    '<gpx version="1.1" creator="img-to-map" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/GpxExtensions/v3 http://www.garmin.com/xmlschemas/TrackPointExtension/v1 http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1" xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3">',
  );
  if (rawTime) {
    const time = parseTime(rawTime);
    lines.push('<metadata>');
    lines.push(`<time>${time}</time>`);
    lines.push('</metadata>');
  }
  lines.push('<trk>');
  lines.push(`<name>${name}</name>`);
  if (trackType) {
    lines.push(`<type>${trackType}</type>`);
  }
  for (const segment of segments) {
    lines.push(gpxTrackSegmentToXml(segment));
  }
  lines.push('</trk>');
  lines.push('</gpx>');
  return lines.join('\n');
};

const gpxTrackSegmentToXml = (points: GpxTrackSegment): string => {
  const lines: string[] = [];
  lines.push('<trkseg>');
  for (const point of points) {
    lines.push(gpxTrackPointToXml(point));
  }
  lines.push('</trkseg>');
  return lines.join('\n');
};

const gpxTrackPointToXml = (point: GpxTrackPoint): string => {
  const { lat, lon, ele, heartRate, meta, time: rawTime } = point;
  const lines: string[] = [];
  lines.push(`<trkpt lat="${lat}" lon="${lon}">`);
  if (ele) {
    lines.push(`  <ele>${ele}</ele>`);
  }
  const time = parseTime(rawTime);
  lines.push(`  <time>${time}</time>`);
  if (heartRate || meta) {
    lines.push(`  <extensions>`);
    if (heartRate) {
      lines.push(`    <gpxtpx:TrackPointExtension>`);
      lines.push(`      <gpxtpx:hr>${heartRate}</gpxtpx:hr>`);
      lines.push(`    </gpxtpx:TrackPointExtension>`);
    }
    if (meta) {
      lines.push(`    <meta>${meta}</meta>`);
    }
    lines.push(`  </extensions>`);
  }
  lines.push('</trkpt>');
  return lines.join('\n');
};

const parseTime = (time: string | Date | number): string => {
  const parsedTime = isStr(time) || isNum(time) ? new Date(time) : time;
  return parsedTime.toISOString();
};
