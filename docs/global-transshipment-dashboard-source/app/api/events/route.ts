import { mergeLiveEvents, parseNewsRss } from "../../event-feed";

const feeds = [
  "https://news.google.com/rss/search?q=shipping+port+congestion+transshipment+OR+canal+disruption&hl=en-US&gl=US&ceid=US:en",
  "https://news.google.com/rss/search?q=%28site%3Amykn.kuehne-nagel.com%2Fnews+OR+site%3Amaersk.com%2Fnews+OR+site%3Amsc.com%2Fen%2Fnewsroom+OR+site%3Acma-cgm.com%2Fnews%29+shipping&hl=en-US&gl=US&ceid=US:en",
];

export async function GET() {
  const startedAt = Date.now();
  const results = await Promise.allSettled(feeds.map(async url => {
    const response = await fetch(url, { cache: "no-store", headers: { "user-agent": "Global-Transshipment-Control-Tower/1.0" } });
    if (!response.ok) throw new Error(`feed ${response.status}`);
    return parseNewsRss(await response.text());
  }));
  const events = mergeLiveEvents(results.flatMap(result => result.status === "fulfilled" ? [result.value] : []));
  return Response.json({
    mode: events.length ? "LIVE" : "UNAVAILABLE",
    collectedAt: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
    sourcesSucceeded: results.filter(result => result.status === "fulfilled").length,
    sourcesTotal: feeds.length,
    events,
  }, { headers: { "cache-control": "no-store" } });
}
