import { describe, expect, test } from '@jest/globals';

import {
  isArr,
  isBool,
  isBoolOrUndef,
  isDate,
  isErr,
  isFunc,
  isNull,
  isNum,
  isNumArr,
  isNumArrOrUndef,
  isNumOrUndef,
  isStr,
  isStrArr,
  isStrOrUndef,
  isUndef,
  isUnknownDict,
} from './types';

describe('Type Checking Functions', () => {
  test('isUnknownDict', () => {
    expect(isUnknownDict({})).toBe(true);
    expect(isUnknownDict([])).toBe(false);
  });

  test('isStr', () => {
    expect(isStr('hello')).toBe(true);
    expect(isStr(123)).toBe(false);
  });

  test('isStrOrUndef', () => {
    expect(isStrOrUndef('hello')).toBe(true);
    expect(isStrOrUndef(undefined)).toBe(true);
    expect(isStrOrUndef(123)).toBe(false);
  });

  test('isStrArr', () => {
    expect(isStrArr(['hello', 'world'])).toBe(true);
    expect(isStrArr([1, 2, 3])).toBe(false);
  });

  test('isNum', () => {
    expect(isNum(123)).toBe(true);
    expect(isNum('123')).toBe(false);
  });

  test('isNumOrUndef', () => {
    expect(isNumOrUndef(123)).toBe(true);
    expect(isNumOrUndef(undefined)).toBe(true);
    expect(isNumOrUndef('123')).toBe(false);
  });

  test('isNumArr', () => {
    expect(isNumArr([1, 2, 3])).toBe(true);
    expect(isNumArr(['1', '2', '3'])).toBe(false);
  });

  test('isNumArrOrUndef', () => {
    expect(isNumArrOrUndef([1, 2, 3])).toBe(true);
    expect(isNumArrOrUndef(undefined)).toBe(true);
    expect(isNumArrOrUndef(['1', '2', '3'])).toBe(false);
  });

  test('isBool', () => {
    expect(isBool(true)).toBe(true);
    expect(isBool(false)).toBe(true);
    expect(isBool('true')).toBe(false);
  });

  test('isBoolOrUndef', () => {
    expect(isBoolOrUndef(true)).toBe(true);
    expect(isBoolOrUndef(undefined)).toBe(true);
    expect(isBoolOrUndef('true')).toBe(false);
  });

  test('isNull', () => {
    expect(isNull(null)).toBe(true);
    expect(isNull(undefined)).toBe(false);
  });

  test('isUndef', () => {
    expect(isUndef(undefined)).toBe(true);
    expect(isUndef(null)).toBe(false);
  });

  test('isArr', () => {
    expect(isArr([])).toBe(true);
    expect(isArr({})).toBe(false);
  });

  test('isFunc', () => {
    expect(isFunc(() => {})).toBe(true);
    expect(isFunc({})).toBe(false);
  });

  test('isDate', () => {
    expect(isDate(new Date())).toBe(true);
    expect(isDate('2021-12-30')).toBe(false);
  });

  test('isErr', () => {
    expect(isErr(new Error())).toBe(true);
    expect(isErr('error')).toBe(false);
  });
});
