import { parseRange } from '@/utils/rangeParser';

describe('rangeParser', () => {
  const fileSize = 1000;

  describe('parseRange', () => {
    const invalidFormats = [
      { description: 'empty string', input: '' },
      { description: 'invalid format', input: 'invalid' },
      { description: 'empty bytes', input: 'bytes=' },
      { description: 'invalid range format', input: 'bytes=abc-def' },
      { description: 'double dash', input: 'bytes=--' },
      { description: 'invalid bytes', input: 'bytes=abc' },
      { description: 'start > file size', input: 'bytes=1000-2000' },
      { description: 'end > file size', input: 'bytes=900-2000' },
      { description: 'start > end', input: 'bytes=200-100' },
    ];

    test.each(invalidFormats)('should return null for $description', ({ input }) => {
      expect(parseRange(input, fileSize)).toBeNull();
    });

    const validRanges = [
      {
        description: 'range with start and end',
        input: 'bytes=100-200',
        expected: { start: 100, end: 200, length: 101 }
      },
      {
        description: 'range with only start',
        input: 'bytes=500-',
        expected: { start: 500, end: 999, length: 500 }
      },
      {
        description: 'suffix range (only end)',
        input: 'bytes=-100',
        expected: { start: 900, end: 999, length: 100 }
      },
      {
        description: 'range at end of file',
        input: 'bytes=900-999',
        expected: { start: 900, end: 999, length: 100 }
      },
      {
        description: 'single byte range',
        input: 'bytes=0-0',
        expected: { start: 0, end: 0, length: 1 }
      },
      {
        description: 'full file range',
        input: 'bytes=0-999',
        expected: { start: 0, end: 999, length: 1000 }
      },
      {
        description: 'range at start of file',
        input: 'bytes=0-99',
        expected: { start: 0, end: 99, length: 100 }
      },
    ];

    test.each(validRanges)('should parse $description', ({ input, expected }) => {
      expect(parseRange(input, fileSize)).toEqual(expected);
    });
  });
});
