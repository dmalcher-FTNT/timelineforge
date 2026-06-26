const MAX_HISTORY = 50;

function cloneTimeline(timeline) {
  return JSON.parse(JSON.stringify(timeline));
}

/**
 * @param {object} timeline
 */
export function createHistory(timeline) {
  return {
    stack: [cloneTimeline(timeline)],
    index: 0,
  };
}

/**
 * @param {{ stack: object[], index: number }} hist
 * @param {object} timeline
 */
export function pushHistoryState(hist, timeline) {
  const snapshot = cloneTimeline(timeline);
  const last = hist.stack[hist.index];
  if (last && JSON.stringify(last) === JSON.stringify(snapshot)) return;

  hist.stack = hist.stack.slice(0, hist.index + 1);
  hist.stack.push(snapshot);
  if (hist.stack.length > MAX_HISTORY) {
    hist.stack.shift();
  } else {
    hist.index += 1;
  }
}

export function canUndo(hist) {
  return hist.index > 0;
}

export function canRedo(hist) {
  return hist.index < hist.stack.length - 1;
}

export function undoHistory(hist) {
  if (!canUndo(hist)) return null;
  hist.index -= 1;
  return cloneTimeline(hist.stack[hist.index]);
}

export function redoHistory(hist) {
  if (!canRedo(hist)) return null;
  hist.index += 1;
  return cloneTimeline(hist.stack[hist.index]);
}
