interface Range {
  start: number;
  end: number;
  length: number;
}

export const parseRange = (range: string, fileSize: number): Range | null => {
  if (!range) return null;

  const matches = range.match(/^bytes=(\d*)-(\d*)$/);
  if (!matches) return null;

  const start = matches[1] ? parseInt(matches[1], 10) : 0;
  let end = matches[2] ? parseInt(matches[2], 10) : fileSize - 1;

  if (isNaN(start) || isNaN(end) || start >= fileSize || end >= fileSize) {
    return null;
  }

  if (!matches[1]) {
    return {
      start: fileSize - end,
      end: fileSize - 1,
      length: end
    };
  }

  if (!matches[2]) {
    end = fileSize - 1;
  }

  if (start > end) {
    return null;
  }

  return {
    start,
    end,
    length: end - start + 1
  };
};
