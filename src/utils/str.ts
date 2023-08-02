import crypto from 'crypto';

export const firstToUpper = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1);

export const md5 = (str: string): string => crypto.createHash('md5').update(str).digest('hex');

export const pad = (val: string, len: number, char = '0'): string => {
  let str = val;
  while (str.length < len) {
    str = char + str;
  }
  return str;
};
