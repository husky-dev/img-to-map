import { exec } from 'child_process';
import { isArr, isStr, isUnknownDict } from './types';

export interface ExifToolMetadata {
  SourceFile: string; // "/some/path/IMG_4132.jpeg",
  ExifToolVersion: number; // 12.60
  FileName: string; // IMG_4132.jpeg
  Directory: string; // /some/path
  FileSize: number; // 938507
  FileModifyDate: string; // 2023:08:02 10:16:03+03:00
  FileAccessDate: string; // 2023:08:02 10:16:23+03:00
  FileInodeChangeDate: string; // 2023:08:02 10:16:13+03:00
  FilePermissions: number; // 100644
  FileType: string; // JPEG
  FileTypeExtension: string; // JPG
  MIMEType: string; // image/jpeg
  ExifByteOrder: string; // MM
  Make: string; // Apple
  Model: string; // iPhone 6s Plus
  Orientation: number; // 1
  XResolution: number; // 72
  YResolution: number; // 72
  ResolutionUnit: number; // 2
  Software: number; // 11.4
  ModifyDate: string; // 2018:06:09 20:32:46
  YCbCrPositioning: number; // 1
  ExposureTime: number; // 0.04
  FNumber: number; // 2.2
  ExposureProgram: number; // 2
  ISO: number; // 40
  ExifVersion: string; // 0221
  DateTimeOriginal: string; // 2018:06:09 20:32:46
  CreateDate: string; // 2018:06:09 20:32:46
  OffsetTime: string; // +03:00
  OffsetTimeOriginal: string; // +03:00
  OffsetTimeDigitized: string; // +03:00
  ComponentsConfiguration: string; // 1 2 3 0
  ShutterSpeedValue: number; // 0.0400000012691449
  ApertureValue: number; // 2.2000000590909
  BrightnessValue: number; // 4.009092746
  ExposureCompensation: number; // 0
  MeteringMode: number; // 5
  Flash: number; // 24
  FocalLength: number; // 2.65
  MakerNoteVersion: number; // 9
  RunTimeFlags: number; // 1
  RunTimeValue: number; // 5967265874416
  RunTimeScale: number; // 1000000000
  RunTimeEpoch: number; // 0
  AEStable: number; // 1
  AETarget: number; // 206
  AEAverage: number; // 210
  AFStable: number; // 1
  AccelerationVector: string; // -0.9470131402 0.3431072235 0.1839757263
  LivePhotoVideoIndex: number; // 0
  SubSecTime: string; // 051
  SubSecTimeOriginal: string; // 051
  SubSecTimeDigitized: string; // 051
  FlashpixVersion: string; // 0100
  ColorSpace: number; // 1
  ExifImageWidth: number; // 2576
  ExifImageHeight: number; // 1932
  SensingMethod: number; // 2
  SceneType: number; // 1
  ExposureMode: number; // 0
  WhiteBalance: number; // 0
  FocalLengthIn35mmFormat: number; // 31
  SceneCaptureType: number; // 0
  LensInfo: string; // 2.650000095 2.650000095 2.2 2.2
  LensMake: string; // Apple
  LensModel: string; // iPhone 6s Plus front camera 2.65mm f/2.2
  GPSLatitudeRef: string; // N
  GPSLongitudeRef: string; // E
  GPSAltitudeRef: number; // 0
  GPSSpeedRef: string; // K
  GPSSpeed: number; // 0
  GPSImgDirectionRef: string; // T
  GPSImgDirection: number; // 161.7628458
  GPSHPositioningError: number; // 10
  XMPToolkit: string; // XMP Core 6.0.0
  CreatorTool: number; // 11.4
  PersonInImage: string; // Jaroslav
  Subject: string; // Travel
  CurrentIPTCDigest: string; // e19c78b8cc340eea55f28c49d0bf74f9
  CodedCharacterSet: string; // \u001B%G
  ApplicationRecordVersion: number; // 2
  DigitalCreationTime: string; // 20:32:46
  DigitalCreationDate: string; // 2018:06:09
  Keywords: string; // Travel
  DateCreated: string; // 2018:06:09
  TimeCreated: string; // 20:32:46+03:00
  IPTCDigest: string; // e19c78b8cc340eea55f28c49d0bf74f9
  ImageWidth: number; // 2576
  ImageHeight: number; // 1932
  EncodingProcess: number; // 0
  BitsPerSample: number; // 8
  ColorComponents: number; // 3
  YCbCrSubSampling: string; // 2 2
  RunTimeSincePowerUp: number; // 5967.265874416
  Aperture: number; // 2.2
  ImageSize: string; // 2576 1932
  Megapixels: number; // 4.976832
  ScaleFactor35efl: number; // 11.6981132075472
  ShutterSpeed: number; // 0.04
  SubSecCreateDate: string; // 2018:06:09 20:32:46.051+03:00
  SubSecDateTimeOriginal: string; // 2018:06:09 20:32:46.051+03:00
  SubSecModifyDate: string; // 2018:06:09 20:32:46.051+03:00
  GPSAltitude: number; // 757.4
  GPSLatitude: number; // 48.0952722222222
  GPSLongitude: number; // 24.7204388888889
  DateTimeCreated: string; // 2018:06:09 20:32:46+03:00
  DigitalCreationDateTime: string; // 2018:06:09 20:32:46
  CircleOfConfusion: string; // 0.00256847066666118
  FOV: number; // 60.282822022872
  FocalLength35efl: number; // 31.0000000000001
  GPSPosition: string; // 48.0952722222222 24.7204388888889
  HyperfocalDistance: number; // 1.24278057599734
  LightValue: number; // 8.24079133216196
  LensID: string; // iPhone 6s Plus front camera 2.65mm f/2.2
}

const isExifToolMetadata = (val: unknown): val is ExifToolMetadata => isUnknownDict(val) && isStr(val.SourceFile);

export const getImgExifMetadata = async (imgPath: string): Promise<ExifToolMetadata> =>
  new Promise((resolve, reject) => {
    exec(`exiftool -j -n ${imgPath}`, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else if (stderr) {
        reject(stderr);
      } else {
        try {
          resolve(parseExifToolOutput(stdout));
        } catch (err: unknown) {
          reject(err);
        }
      }
    });
  });

const parseExifToolOutput = (output: string): ExifToolMetadata => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const data = JSON.parse(output);
  if (!data) throw new Error('No data');
  if (!isArr(data)) throw new Error('Data is not array');
  if (data.length !== 1) throw new Error('Data array is empty');
  const meta = data[0];
  if (!isExifToolMetadata(meta)) throw new Error('Invalid metadata');
  return meta;
};
