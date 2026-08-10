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

test("clusters differently worded stories about the same event and merges sources", () => {
  const first = parseNewsRss(`<?xml version="1.0"?><rss><channel><item>
    <title>Carriers expand Red Sea diversions as security risks rise</title>
    <link>https://news.example/red-sea-1</link>
    <pubDate>Tue, 04 Aug 2026 03:00:00 GMT</pubDate>
    <source url="https://news.example/">Shipping News</source>
  </item></channel></rss>`, new Date("2026-08-04T04:00:00Z"));
  const second = parseNewsRss(`<?xml version="1.0"?><rss><channel><item>
    <title>Suez traffic rerouted around Cape of Good Hope after attacks</title>
    <link>https://carrier.example/advisory</link>
    <pubDate>Mon, 03 Aug 2026 18:00:00 GMT</pubDate>
    <source url="https://carrier.example/">Carrier Advisory</source>
  </item></channel></rss>`, new Date("2026-08-04T04:00:00Z"));

  const [cluster] = mergeLiveEvents([first, second]);
  assert.equal(mergeLiveEvents([first, second]).length, 1);
  assert.equal(cluster.titleKo, "홍해·수에즈 해역 긴장에 따른 우회 운항 확대");
  assert.equal(cluster.sourceLinks.length, 2);
  assert.match(cluster.source, /1개 SOURCE/);
});

test("keeps separate events when the event family or affected port differs", () => {
  const singapore = parseNewsRss(rss, new Date("2026-08-04T04:00:00Z"));
  const shanghai = parseNewsRss(rss.replaceAll("Singapore", "Shanghai").replaceAll("singapore", "shanghai"), new Date("2026-08-04T04:00:00Z"));
  assert.equal(mergeLiveEvents([singapore, shanghai]).length, 2);
});

test("does not translate every security story as a Red Sea event", () => {
  const security = parseNewsRss(rss.replace(
    "Singapore port congestion delays transshipment",
    "Security conflict disrupts Singapore terminal operations",
  ), new Date("2026-08-04T04:00:00Z"));
  assert.equal(security[0].titleKo, "싱가포르 지정학·해상 보안 리스크 확대");
});
