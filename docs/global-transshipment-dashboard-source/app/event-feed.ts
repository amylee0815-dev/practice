export type LiveEvent = {
  id: number;
  portCodes: string[];
  type: string;
  title: string;
  scope: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  source: string;
  confidence: number;
  delay: string;
  status: "실제";
  updated: string;
  publishedAt: string;
  sourceLinks: Array<{ name: string; type: string; observedAt: string; url: string }>;
};

const ports: Array<[string, RegExp]> = [
  ["SGSIN", /singapore|sgsin/i],
  ["CNSHA", /shanghai|cnsha/i],
  ["CNNGB", /ningbo|cnngb/i],
  ["PAPTY", /panama|papty/i],
  ["NLRTM", /rotterdam|nlrtm/i],
  ["AEJEA", /jebel ali|dubai|aejea/i],
  ["KRPUS", /busan|pusan|krpus/i],
  ["USLAX", /los angeles|uslax/i],
];

const text = (xml: string, tag: string) => {
  const value = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] ?? "";
  return value.replace(/^<!\[CDATA\[|\]\]>$/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
};

const classify = (title: string) => {
  if (/typhoon|hurricane|storm|weather|cyclone/i.test(title)) return "기상";
  if (/strike|labor|union/i.test(title)) return "파업";
  if (/canal|suez|panama/i.test(title)) return "운하 운영";
  if (/attack|war|red sea|security|conflict/i.test(title)) return "지정학";
  return "항만·운송";
};

export function parseNewsRss(xml: string, now = new Date()): LiveEvent[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match, index) => {
    const item = match[1];
    const title = text(item, "title");
    const link = text(item, "link");
    const source = text(item, "source") || "Google News";
    const sourceUrl = item.match(/<source[^>]*url=["']([^"']+)["']/i)?.[1] || link;
    const publishedAt = new Date(text(item, "pubDate"));
    const ageMinutes = Number.isNaN(publishedAt.getTime()) ? 0 : Math.max(0, Math.round((now.getTime() - publishedAt.getTime()) / 60_000));
    const portCodes = ports.filter(([, pattern]) => pattern.test(title)).map(([code]) => code);
    if (!portCodes.length && /red sea|suez|cape of good hope/i.test(title)) portCodes.push("SGSIN", "AEJEA", "NLRTM");
    const severe = /closed|closure|blocked|attack|war|emergency/i.test(title);
    const elevated = /delay|congestion|strike|storm|disruption|rerout/i.test(title);
    const official = /authority|government|port of|canal|maersk|msc|cma cgm|kuehne|nagel/i.test(source);
    return {
      id: 10_000 + index,
      portCodes,
      type: classify(title),
      title,
      scope: portCodes.length ? portCodes.join("·") : "GLOBAL",
      severity: severe ? "CRITICAL" as const : elevated ? "HIGH" as const : "MEDIUM" as const,
      source,
      confidence: official ? 92 : 82,
      delay: "산출 대기",
      status: "실제" as const,
      updated: ageMinutes < 60 ? `${ageMinutes}분 전` : `${Math.floor(ageMinutes / 60)}시간 전`,
      publishedAt: Number.isNaN(publishedAt.getTime()) ? now.toISOString() : publishedAt.toISOString(),
      sourceLinks: [{ name: source, type: official ? "공식·선사 SOURCE" : "뉴스 SOURCE", observedAt: ageMinutes < 60 ? `${ageMinutes}분 전` : `${Math.floor(ageMinutes / 60)}시간 전`, url: sourceUrl }],
    };
  }).filter(event => event.title && event.portCodes.length > 0);
}

export function mergeLiveEvents(groups: LiveEvent[][]) {
  const seen = new Set<string>();
  return groups.flat().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).filter(event => {
    const key = event.title.toLowerCase().replace(/[^a-z0-9가-힣]/g, "").slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20).map((event, index) => ({ ...event, id: 10_000 + index }));
}

