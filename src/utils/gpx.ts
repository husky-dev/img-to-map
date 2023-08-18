import { parseStringPromise as parseXmlString } from 'xml2js';
import { z } from 'zod';

import { isNum, isStr } from './types';

// GPX to XML

export interface GpxTrack {
  name: string;
  segments: GpxTrackSegment[];
  viewpoints?: GpxViewPoint[];
  time?: Date;
  type?: string; // hiking, running, biking, walking, driving, flying, etc.
}

export type GpxTrackSegment = GpxTrackPoint[];

export interface GpxTrackPoint {
  lat: number;
  lon: number;
  elevation?: number;
  meta?: string;
  time: Date;
  heartRate?: number;
}

export const GpxViewPointSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  elevation: z.number().optional(),
  name: z.string(),
  description: z.string().optional(),
  symbol: z.string().optional(),
});

export type GpxViewPoint = z.infer<typeof GpxViewPointSchema>;

export const gpxTrackToXml = (track: GpxTrack): string => {
  const { name, segments, type: trackType, time: rawTime, viewpoints } = track;
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
  if (viewpoints) {
    for (const viewpoint of viewpoints) {
      lines.push(gpxViewpointToXml(viewpoint));
    }
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
  const { lat, lon, elevation, heartRate, meta, time: rawTime } = point;
  const lines: string[] = [];
  lines.push(`  <trkpt lat="${lat}" lon="${lon}">`);
  if (elevation) {
    lines.push(`    <ele>${elevation}</ele>`);
  }
  const time = parseTime(rawTime);
  lines.push(`    <time>${time}</time>`);
  if (heartRate || meta) {
    lines.push(`    <extensions>`);
    if (heartRate) {
      lines.push(`      <gpxtpx:TrackPointExtension>`);
      lines.push(`        <gpxtpx:hr>${heartRate}</gpxtpx:hr>`);
      lines.push(`      </gpxtpx:TrackPointExtension>`);
    }
    if (meta) {
      lines.push(`      <meta>${meta}</meta>`);
    }
    lines.push(`    </extensions>`);
  }
  lines.push('  </trkpt>');
  return lines.join('\n');
};

const gpxViewpointToXml = (point: GpxViewPoint): string => {
  const { lat, lon, elevation, name, description, symbol } = point;
  const lines: string[] = [];
  lines.push(`<wpt lat="${lat}" lon="${lon}">`);
  lines.push(`  <name>${name}</name>`);
  if (elevation) {
    lines.push(`  <ele>${elevation}</ele>`);
  }
  if (description) {
    lines.push(`  <desc>${description}</desc>`);
  }
  if (symbol) {
    lines.push(`  <sym>${symbol}</sym>`);
  }
  lines.push('</wpt>');
  return lines.join('\n');
};

const parseTime = (time: string | Date | number): string => {
  const parsedTime = isStr(time) || isNum(time) ? new Date(time) : time;
  return parsedTime.toISOString();
};

// XML to GPX

const XmlGpxTrackPointAttributes = z.object({
  lat: z.string(),
  lon: z.string(),
});

const XmlGpxTrackPointExtension = z.object({
  'gpxtpx:TrackPointExtension': z
    .array(
      z
        .object({
          'gpxtpx:hr': z.array(z.string()).optional(),
        })
        .optional(),
    )
    .optional(),
});

const XmlGpxTrackPointSchema = z.object({
  $: XmlGpxTrackPointAttributes,
  ele: z.array(z.string()),
  time: z.array(z.string()),
  extensions: z.array(XmlGpxTrackPointExtension).optional(),
});

type XmlGpxTrackPoint = z.infer<typeof XmlGpxTrackPointSchema>;

const XmlGpxTrackSegment = z.object({
  trkpt: z.array(XmlGpxTrackPointSchema),
});

const XmlGpxTrack = z.object({
  name: z.array(z.string()).optional(),
  type: z.array(z.string()).optional(),
  trkseg: z.array(XmlGpxTrackSegment),
});

const XmlGpxAttributes = z.object({
  creator: z.string().optional(),
  'xmlns:xsi': z.string().optional(),
  'xsi:schemaLocation': z.string().optional(),
  version: z.string().optional(),
  xmlns: z.string().optional(),
  'xmlns:gpxtpx': z.string().optional(),
  'xmlns:gpxx': z.string().optional(),
});

const XmlGpxMetadata = z.object({
  time: z.array(z.string()).optional(),
});

const XmlGPX = z.object({
  $: XmlGpxAttributes,
  metadata: z.array(XmlGpxMetadata).optional(),
  trk: z.array(XmlGpxTrack),
});

const XmlGpxFileSchema = z.object({
  gpx: XmlGPX,
});

export type XmlGpxFile = z.infer<typeof XmlGpxFileSchema>;

export const parseXmlGpxFile = async (xml: string): Promise<XmlGpxFile> => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const data = await parseXmlString(xml);
  const parsed = XmlGpxFileSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.message);
  }
  return parsed.data;
};

export const xmlGpxFileToGpxTrackPoints = (xmlGpxFile: XmlGpxFile): GpxTrackPoint[] => {
  const points: GpxTrackPoint[] = [];
  for (const trk of xmlGpxFile.gpx.trk) {
    for (const seg of trk.trkseg) {
      for (const point of seg.trkpt) {
        const lat = parseFloat(point.$.lat);
        const lon = parseFloat(point.$.lon);
        const elevation = point.ele.length ? parseFloat(point.ele[0]) : undefined;
        const time = point.time.length ? new Date(point.time[0]) : undefined;
        const heartRate = xmlGpxTrackPointToHeartRate(point);
        if (time) {
          points.push({ lat, lon, elevation, time, heartRate });
        }
      }
    }
  }
  return points;
};

const xmlGpxTrackPointToHeartRate = ({ extensions }: XmlGpxTrackPoint): number | undefined => {
  if (!extensions || extensions.length) return undefined;
  for (const extension of extensions) {
    if (extension['gpxtpx:TrackPointExtension']) {
      const trackPointExtension = extension['gpxtpx:TrackPointExtension'];
      if (trackPointExtension.length) {
        for (const vals of trackPointExtension) {
          if (vals && vals['gpxtpx:hr']) {
            const hr = vals['gpxtpx:hr'];
            if (hr.length) {
              const hrStr = hr[0];
              const hrNum = parseFloat(hrStr);
              if (!isNaN(hrNum)) {
                return hrNum;
              }
            }
          }
        }
      }
    }
  }
  return undefined;
};
