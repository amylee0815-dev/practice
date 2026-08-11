import { mergeLiveEvents, parseGdeltJson, parseNewsRss } from "../../event-feed";

const feeds = [
  "https://news.google.com/rss/search?q=shipping+port+congestion+transshipment+OR+canal+disruption&hl=en-US&gl=US&ceid=US:en",
  "https://news.google.com/rss/search?q=%28shipping+OR+port+OR+maritime%29+%28typhoon+OR+hurricane+OR+storm+OR+flood+OR+earthquake+OR+tsunami+OR+wildfire+OR+drought%29&hl=en-US&gl=US&ceid=US:en",
  "https://news.google.com/rss/search?q=%28shipping+OR+port+OR+canal+OR+maritime%29+%28war+OR+attack+OR+sanction+OR+tariff+OR+political+OR+geopolitical+OR+blockade+OR+protest%29&hl=en-US&gl=US&ceid=US:en",
  "https://news.google.com/rss/search?q=%28port+OR+terminal+OR+trucker+OR+dockworker+OR+longshore%29+%28strike+OR+labor+OR+union+OR+walkout+OR+industrial+action%29&hl=en-US&gl=US&ceid=US:en",
  "https://news.google.com/rss/search?q=%28site%3Amykn.kuehne-nagel.com%2Fnews+OR+site%3Amaersk.com%2Fnews+OR+site%3Amsc.com%2Fen%2Fnewsroom+OR+site%3Acma-cgm.com%2Fnews%29+%28shipping+OR+weather+OR+strike+OR+security+OR+disruption%29&hl=en-US&gl=US&ceid=US:en",
];

const gdeltQueries = [
  "(shipping OR port OR maritime) (congestion OR transshipment OR canal OR closure)",
  "(shipping OR port OR maritime) (typhoon OR hurricane OR storm OR flood OR earthquake OR tsunami OR wildfire)",
  "(shipping OR port OR maritime) (war OR attack OR sanction OR tariff OR geopolitical OR blockade OR protest)",
  "(port OR terminal OR trucker OR dockworker OR longshore) (strike OR labor OR union OR walkout)",
];

export async function GET() {
  const startedAt = Date.now();
  const googleResults = await Promise.allSettled(feeds.map(async url => {
    const response = await fetch(url, { cache: "no-store", headers: { "user-agent": "Global-Transshipment-Control-Tower/1.0" } });
    if (!response.ok) throw new Error(`feed ${response.status}`);
    return parseNewsRss(await response.text());
  }));
  const gdeltResults = await Promise.allSettled(gdeltQueries.map(async query => {
    const params = new URLSearchParams({ query: `${query} sourcelang:english`, mode: "ArtList", maxrecords: "40", format: "json", timespan: "2d" });
    const response = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${params}`, { cache: "no-store", headers: { "user-agent": "Global-Transshipment-Control-Tower/1.0" } });
    if (!response.ok) throw new Error(`gdelt ${response.status}`);
    return parseGdeltJson(await response.text());
  }));
  const results = [...googleResults, ...gdeltResults];
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
