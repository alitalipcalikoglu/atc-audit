/**
 * Counts `denied` events per source in a sliding window and reports when a source crosses the
 * threshold: a burst of denials (a leaked key being tried, a broken deploy, a scan) is worth a human
 * look even though each single denial is normal. One report per source per window; the counter
 * restarts after the report, so a sustained attack reports once per window, not once per event.
 */
export class DeniedSpike {
  /** @param {{ threshold: number, windowMs: number }} o  threshold 0 = off. */
  constructor({ threshold, windowMs }) {
    this.threshold = threshold;
    this.windowMs = windowMs;
    /** @type {Map<string, number[]>} */
    this.seen = new Map();
    this.maxSources = 1_000;
  }

  /**
   * @param {string} source @param {number} denied  Denied events in this batch. @param {number} now
   * @returns {{ source: string, count: number, windowSec: number }|null}
   */
  observe(source, denied, now) {
    if (this.threshold <= 0 || denied <= 0) return null;
    const cutoff = now - this.windowMs;
    const times = (this.seen.get(source) ?? []).filter((t) => t > cutoff);
    for (let i = 0; i < denied; i += 1) times.push(now);
    if (times.length < this.threshold) {
      if (this.seen.size >= this.maxSources && !this.seen.has(source)) this.seen.delete(/** @type {string} */ (this.seen.keys().next().value));
      this.seen.set(source, times);
      return null;
    }
    this.seen.delete(source);
    return { source, count: times.length, windowSec: Math.round(this.windowMs / 1000) };
  }
}
