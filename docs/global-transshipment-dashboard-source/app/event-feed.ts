export type LiveEvent = {
  id: number;
  portCodes: string[];
  type: string;
  title: string;
  titleKo: string;
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

const portNames: Record<string, string> = {
  SGSIN: "싱가포르",
  CNSHA: "상하이",
  CNNGB: "닝보",
  PAPTY: "파나마",
  NLRTM: "로테르담",
  AEJEA: "제벨알리",
  KRPUS: "부산",
  USLAX: "로스앤젤레스",
};

export function koreanHeadline(title: string, portCodes: string[]) {
  if (/[가-힣]/.test(title)) return title;
  const place = portCodes.map(code => portNames[code] ?? code).join("·") || "글로벌";
  if (/red sea|suez|cape of good hope|attack|war|security|conflict/i.test(title)) return "홍해·수에즈 해역 긴장에 따른 우회 운항 확대";
  if (/typhoon|hurricane|storm|weather|cyclone/i.test(title)) return `${place} 기상 악화에 따른 해상운송 차질`;
  if (/strike|labor|union/i.test(title)) return `${place} 항만 파업에 따른 운영 차질`;
  if (/canal/i.test(title)) return `${place} 운하 운영 변경 및 통항 지연`;
  if (/closed|closure|blocked/i.test(title)) return `${place} 항만 폐쇄 및 운영 차질`;
  if (/rerout|route change|diversion/i.test(title)) return `${place} 항로 우회 및 운항 일정 변경`;
  if (/congestion|delay|disruption|transshipment/i.test(title)) return `${place} 항만 혼잡 및 환적 지연`;
  return `${place} 해상운송 리스크 동향`;
}

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
      titleKo: koreanHeadline(title, portCodes),
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
  const severityRank = { MEDIUM: 1, HIGH: 2, CRITICAL: 3 } as const;
  const normalizedTitle = (title: string) => title.toLowerCase().replace(/[^a-z0-9가-힣]/g, "").slice(0, 80);
  const eventFamily = (title: string) => {
    if (/red sea|suez|cape of good hope|houthi|bab el.mandeb/i.test(title)) return "RED_SEA_SECURITY";
    if (/attack|war|security|conflict/i.test(title)) return "SECURITY_DISRUPTION";
    if (/typhoon|hurricane|storm|weather|cyclone/i.test(title)) return "SEVERE_WEATHER";
    if (/strike|labor|union|industrial action/i.test(title)) return "LABOR_DISRUPTION";
    if (/panama canal|drought|water level|transit reservation/i.test(title)) return "PANAMA_CANAL";
    if (/closed|closure|blocked/i.test(title)) return "PORT_CLOSURE";
    if (/rerout|route change|diversion/i.test(title)) return "ROUTE_DIVERSION";
    if (/congestion|delay|disruption|transshipment/i.test(title)) return "PORT_CONGESTION";
    return `STORY:${normalizedTitle(title)}`;
  };
  const eventLocation = (event: LiveEvent) => {
    if (eventFamily(event.title) === "RED_SEA_SECURITY") return "RED_SEA_SUEZ";
    return [...event.portCodes].sort().join("+") || "GLOBAL";
  };
  const sourceKey = (source: LiveEvent["sourceLinks"][number]) => source.url || `${source.name}:${source.observedAt}`;
  const clusters: Array<LiveEvent & { clusterFamily: string; clusterLocation: string }> = [];

  for (const event of groups.flat().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))) {
    const family = eventFamily(event.title);
    const location = eventLocation(event);
    const publishedAt = new Date(event.publishedAt).getTime();
    const cluster = clusters.find(candidate => {
      const candidateTime = new Date(candidate.publishedAt).getTime();
      return candidate.clusterFamily === family
        && candidate.clusterLocation === location
        && Math.abs(candidateTime - publishedAt) <= 7 * 24 * 60 * 60 * 1000;
    });

    if (!cluster) {
      clusters.push({ ...event, sourceLinks: [...event.sourceLinks], clusterFamily: family, clusterLocation: location });
      continue;
    }

    const sourceLinks = [...cluster.sourceLinks, ...event.sourceLinks]
      .filter((source, index, all) => all.findIndex(candidate => sourceKey(candidate) === sourceKey(source)) === index);
    cluster.sourceLinks = sourceLinks;
    cluster.portCodes = [...new Set([...cluster.portCodes, ...event.portCodes])];
    cluster.scope = cluster.portCodes.join("·") || "GLOBAL";
    cluster.confidence = Math.min(98, Math.max(cluster.confidence, event.confidence) + Math.min(6, (sourceLinks.length - 1) * 2));
    if (severityRank[event.severity] > severityRank[cluster.severity]) cluster.severity = event.severity;
    cluster.source = sourceLinks.length > 1 ? `${sourceLinks[0].name} + ${sourceLinks.length - 1}개 SOURCE` : sourceLinks[0]?.name ?? cluster.source;
  }

  return clusters.slice(0, 20).map(({ clusterFamily: _family, clusterLocation: _location, ...event }, index) => ({
    ...event,
    id: 10_000 + index,
  }));
}
