import { isNum, isStr } from './types';

export interface GpxTrack {
  name: string;
  segments: GpxTrackSegment[];
  time?: string | Date | number;
  type?: string; // hiking, running, biking, walking, driving, flying, etc.
}

export type GpxTrackSegment = GpxTrackPoint[];

export interface GpxTrackPoint {
  lat: number;
  lon: number;
  ele?: number;
  time: string | Date | number;
  heartRate?: number;
}

export const gpxTrackToXml = (track: GpxTrack): string => {
  const { name, segments, type: trackType, time: rawTime } = track;
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<gpx version="1.1" creator="img-to-map">');
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
  const { lat, lon, ele, heartRate, time: rawTime } = point;
  const lines: string[] = [];
  lines.push(`<trkpt lat="${lat}" lon="${lon}">`);
  if (ele) {
    lines.push(`  <ele>${ele}</ele>`);
  }
  const time = parseTime(rawTime);
  lines.push(`  <time>${time}</time>`);
  if (heartRate) {
    lines.push(`  <extensions>`);
    lines.push(`    <gpxtpx:TrackPointExtension>`);
    lines.push(`      <gpxtpx:hr>${heartRate}</gpxtpx:hr>`);
    lines.push(`    </gpxtpx:TrackPointExtension>`);
    lines.push(`  </extensions>`);
  }
  lines.push('</trkpt>');
  return lines.join('\n');
};

const parseTime = (time: string | Date | number): string => {
  const parsedTime = isStr(time) || isNum(time) ? new Date(time) : time;
  return parsedTime.toISOString();
};
