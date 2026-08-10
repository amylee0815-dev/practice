import assert from "node:assert/strict";
import test from "node:test";
import { mergeLiveEvents, parseNewsRss } from "../app/event-feed.ts";

const rss = `<?xml version="1.0"?><rss><channel><item>
  <title>Singapore port congestion delays transshipment</title>
  <link>https://news.example/item</link>
  <pubDate>Tue, 04 Aug 2026 03:00:00 GMT</pubDate>
  <source url="https://www.mpa.gov.sg/">Maritime and Port Authority of Singapore</source>
</item></channel></rss>`;

test("maps a live story to a port and preserves its source", () => {
  const [event] = parseNewsRss(rss, new Date("2026-08-04T04:00:00Z"));
  assert.deepEqual(event.portCodes, ["SGSIN"]);
  assert.equal(event.severity, "HIGH");
  assert.equal(event.confidence, 92);
  assert.equal(event.titleKo, "싱가포르 항만 혼잡 및 환적 지연");
  assert.equal(event.sourceLinks[0].url, "https://www.mpa.gov.sg/");
});

test("deduplicates repeated feed stories", () => {
  const events = parseNewsRss(rss, new Date("2026-08-04T04:00:00Z"));
  assert.equal(mergeLiveEvents([events, events]).length, 1);
});
