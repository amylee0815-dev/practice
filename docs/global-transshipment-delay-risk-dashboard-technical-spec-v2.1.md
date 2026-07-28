# 글로벌 환적 지연 인사이트·리스크 관제 대시보드 기술세부문서 v2.1

## 1. 문서 정보

| 항목 | 내용 |
|---|---|
| 제품명 | Global Transshipment Control Tower |
| 문서 유형 | 기술세부문서 |
| 버전 | v2.1 |
| 기준일 | 2026-07-28 |
| 상위 문서 | `global-transshipment-delay-risk-dashboard-prd-v2.md` |
| 대상 독자 | 백엔드·프론트엔드·데이터·ML·인프라·보안·QA·운영팀 |
| 상태 | 구현 검토안 |

### 1.1 목적

본 문서는 PRD v2.1을 구현 가능한 시스템 구성, 데이터 계약, 처리 규칙, 논리 API, 화면 상태, 보안, 운영 및 테스트 기준으로 구체화한다.

### 1.2 기술 원칙

1. 외부 측정값, 서술형 이벤트, 내부 원장을 분리 저장한다.
2. 원본을 보존하고 정규화·파생값을 버전과 함께 추적한다.
3. 결측값과 실패값을 0으로 변환하지 않는다.
4. 실제·추정·예측·오래된 값을 명시적으로 구분한다.
5. 뉴스나 메일만으로 Shipment 지연을 확정하지 않는다.
6. 외부 API 장애가 전체 대시보드 장애로 전파되지 않도록 격리한다.
7. 자동 추천은 근거를 제공하며 실행에는 사람의 승인을 요구한다.

## 2. 시스템 범위

### 2.1 인바운드

- TMS/ERP: Shipment, Booking, B/L, Container, Leg, SLA, 화물가액
- AISStream: 선박 위치 스트림
- 관세청 공공데이터: 국가·HS별 월간 수출입 통계
- openrouteservice: 육상 경로 거리·시간
- Open Exchange Rates: 환율
- Carbon Interface: 운송 시나리오 CO₂e
- 승인 뉴스 피드: 세계 주요 물류·지정학·규제 뉴스
- 공식 기상 경보: 태풍, 폭풍, 홍수, 강풍 등
- 선사 공유메일함: 항만 혼잡, 스케줄 변경, Blank Sailing, Cut-off 공지

### 2.2 아웃바운드

- 실시간 환적 관제 화면
- 이벤트/뉴스 TOP 5 및 영향물동
- 대안 의사결정 워크벤치
- 경보·조치·승인 보드
- 경영진 KPI 화면
- 외부 CDN이 없는 오프라인 단일 HTML 스냅샷
- 감사·데이터 품질·운영 로그

## 3. 논리 아키텍처

```text
[TMS/ERP] [AISStream] [Customs] [ORS] [FX] [Carbon]
    |           |          |       |    |      |
    +-----------+----------+-------+----+------+
                            |
                  Ingestion & Raw Store
                            |
              Validation / Canonical Adapters
                            |
        +-------------------+-------------------+
        |                   |                   |
 Shipment Graph       Scenario Engine      Data Quality
        |                   |                   |
        +---------- Risk & Impact Engine -------+
                            |
 [News Feeds] [Weather Alerts] [Carrier Shared Mailbox]
       |              |                 |
       +------ Event Ingestion & PII Redaction
                            |
         Extraction / Deduplication / Clustering
                            |
             Event-to-Shipment Matching
                            |
          Event Priority & Impact Aggregation
                            |
             Alert / Workflow / Approval
                            |
          Query API / Dashboard / Snapshot
```

### 3.1 구성요소

| 구성요소 | 책임 |
|---|---|
| API Adapter | 외부 API별 인증, 호출, 응답 정규화 |
| Stream Consumer | AIS 연결, 메시지 검증, 위치 집계 |
| Mail Ingestor | 승인 공유메일함과 allowlist 발신자 수집 |
| News/Weather Collector | 승인 소스의 신규 게시물·경보 수집 |
| Raw Store | 원본 응답과 메타데이터 불변 보존 |
| Canonical Store | 공통 Shipment·Leg·Event 모델 저장 |
| Entity Resolver | 항만·선사·선박·국가·HS 식별자 정규화 |
| Event Processor | 추출, 중복 제거, 군집화, 대표 출처 선정 |
| Matching Engine | 이벤트와 활성 Shipment 연결 |
| Risk Engine | 연결 실패 위험과 이벤트 우선순위 계산 |
| Scenario Engine | 경로·비용·탄소 대안 계산 |
| Workflow Service | 담당자, SLA, 승인, 완료 이력 관리 |
| Query API | 화면별 집계·상세 데이터 제공 |
| Snapshot Builder | 오프라인 단일 HTML 생성 |
| Observability | 수집 지연, 오류, 쿼터, 품질 지표 관리 |

## 4. 배포 단위 제안

초기에는 운영 복잡도를 줄이기 위해 모듈형 단일 백엔드와 별도 비동기 Worker를 권장한다.

| 배포 단위 | 포함 모듈 |
|---|---|
| Web/API | 인증, Query API, Workflow, 관리자 기능 |
| Ingestion Worker | REST API, 뉴스, 기상, 메일 수집 |
| Stream Worker | AIS WebSocket 연결과 위치 집계 |
| Processing Worker | 이벤트 추출·군집·매칭·위험 계산 |
| Scheduler | 월간·일간·재처리 작업 |
| Snapshot Job | 임원용 단일 HTML 생성 |

MVP 이후 이벤트량과 AIS 처리량이 임계치를 넘으면 수집, 매칭, 시나리오 계산을 독립 서비스로 분리한다.

## 5. 저장소 설계

### 5.1 저장 계층

| 계층 | 내용 | 변경 정책 |
|---|---|---|
| Raw | API 응답, AIS 원문, 뉴스 메타데이터, 메일 원본 참조 | 불변 |
| Canonical | 표준화된 Shipment, Leg, Event, Source | Upsert+이력 |
| Derived | 위험점수, 매칭, 영향물동, KPI | 계산 버전별 저장 |
| Audit | 사용자 조치, 승인, 수동 보정 | Append only |
| Cache | 경로·탄소·환율·화면 집계 | TTL |

### 5.2 공통 컬럼

모든 Canonical/Derived 테이블은 가능한 경우 다음 컬럼을 갖는다.

```text
id
source_system
source_record_id
source_observed_at
collected_at
last_success_at
data_status
confidence
source_hash
schema_version
calculation_version
created_at
updated_at
```

`data_status` 허용값:

```text
ACTUAL | ESTIMATED | PREDICTED | STALE | PENDING | INVALID
```

## 6. 핵심 데이터 계약

### 6.1 Shipment

| 필드 | 형식 | 필수 | 설명 |
|---|---|---:|---|
| shipment_id | string | Y | 내부 고유 ID |
| booking_no | string | N | Booking 번호 |
| bl_no | string | N | B/L 번호 |
| corporation_id | string | Y | 책임 법인 |
| customer_id | string | N | 고객 |
| origin_unlocode | string | Y | 출발지 |
| destination_unlocode | string | Y | 도착지 |
| hs_code | string | N | HS 코드 |
| cargo_priority | enum | Y | NORMAL/IMPORTANT/CRITICAL |
| promised_delivery_at | datetime UTC | N | 고객 약속일 |
| cargo_value | decimal | N | 화물가액 |
| cargo_currency | string | N | ISO 4217 |
| gross_weight_kg | decimal | N | 총중량 |
| teu | decimal | N | TEU |
| status | enum | Y | ACTIVE/COMPLETED/CANCELLED |

### 6.2 TransportLeg

| 필드 | 형식 | 필수 | 설명 |
|---|---|---:|---|
| leg_id | string | Y | Leg ID |
| shipment_id | string | Y | Shipment ID |
| sequence_no | integer | Y | 운송 순서 |
| mode | enum | Y | OCEAN/TRUCK/RAIL/AIR |
| load_unlocode | string | Y | 출발 항만·지역 |
| discharge_unlocode | string | Y | 도착 항만·지역 |
| carrier_code | string | N | 표준 선사 코드 |
| vessel_imo | string | N | IMO |
| mmsi | string | N | MMSI |
| voyage_no | string | N | Voyage |
| planned_etd | datetime UTC | N | 계획 출발 |
| estimated_etd | datetime UTC | N | 예상 출발 |
| actual_departure | datetime UTC | N | 실제 출발 |
| planned_eta | datetime UTC | N | 계획 도착 |
| estimated_eta | datetime UTC | N | 예상 도착 |
| actual_arrival | datetime UTC | N | 실제 도착 |

### 6.3 ExternalEvent

| 필드 | 형식 | 필수 | 설명 |
|---|---|---:|---|
| event_id | UUID | Y | 내부 사건 ID |
| event_type | enum | Y | 표준 사건 유형 |
| title | string(160) | Y | 자체 생성 한 줄 제목 |
| summary | string(800) | Y | 저작권을 침해하지 않는 자체 요약 |
| severity | enum | Y | INFO/WATCH/HIGH/CRITICAL |
| status | enum | Y | NEW/ACTIVE/MONITORING/RESOLVED/DISMISSED |
| start_at | datetime UTC | N | 사건 시작 |
| end_at | datetime UTC | N | 사건 종료 |
| country_codes | array | N | ISO 국가 |
| port_unlocodes | array | N | 영향 항만 |
| terminal_codes | array | N | 영향 터미널 |
| carrier_codes | array | N | 영향 선사 |
| vessel_imos | array | N | 영향 선박 |
| route_tags | array | N | 영향 항로 |
| source_confidence | decimal | Y | 0~1 |
| extraction_version | string | Y | 추출 규칙/모델 버전 |

`event_type`:

```text
PORT_CONGESTION | WEATHER | STRIKE | ACCIDENT |
GEOPOLITICAL | REGULATORY | CARRIER_SCHEDULE |
INFRASTRUCTURE | OTHER
```

### 6.4 EventSource

| 필드 | 형식 | 필수 | 설명 |
|---|---|---:|---|
| event_source_id | UUID | Y | 출처 ID |
| event_id | UUID | N | 군집화 전에는 null 가능 |
| source_type | enum | Y | NEWS/WEATHER/PORT/CARRIER_EMAIL |
| publisher | string | Y | 기관·매체·선사 |
| source_url | string | N | 공개 원문 |
| message_id | string | N | 메일 원본 ID |
| published_at | datetime UTC | N | 게시시각 |
| received_at | datetime UTC | Y | 수집·수신시각 |
| source_rank | integer | Y | 출처 우선순위 |
| content_hash | string | Y | 중복 검사용 해시 |
| parser_version | string | Y | 파서 버전 |
| parse_status | enum | Y | SUCCESS/PARTIAL/FAILED/REVIEW |

뉴스 원문 전문은 기본 저장 대상에서 제외한다. 메일 본문 원본은 접근이 제한된 Raw 영역에 두고 화면에는 마스킹·요약 결과만 제공한다.

### 6.5 EventShipmentLink

| 필드 | 형식 | 필수 | 설명 |
|---|---|---:|---|
| link_id | UUID | Y | 링크 ID |
| event_id | UUID | Y | 사건 |
| shipment_id | string | Y | Shipment |
| match_score | decimal | Y | 0~100 |
| port_score | decimal | Y | 장소 점수 |
| time_score | decimal | Y | 시간 점수 |
| carrier_vessel_score | decimal | Y | 선사·선박 점수 |
| route_score | decimal | Y | 항로 점수 |
| event_fit_score | decimal | Y | 사건유형 적합성 |
| review_status | enum | Y | AUTO_LINKED/REVIEW/CONFIRMED/REJECTED |
| reviewed_by | string | N | 검토자 |
| reviewed_at | datetime UTC | N | 검토시각 |
| matching_version | string | Y | 매칭 규칙 버전 |

### 6.6 EventImpactSummary

| 필드 | 형식 | 필수 | 설명 |
|---|---|---:|---|
| event_id | UUID | Y | 사건 |
| as_of_at | datetime UTC | Y | 집계 기준시각 |
| shipment_count | integer | Y | 영향 Shipment |
| container_count | integer | N | 영향 Container |
| total_teu | decimal | N | TEU |
| gross_weight_kg | decimal | N | 중량 |
| cargo_value_base | decimal | N | 기준통화 화물가액 |
| base_currency | string | N | 기준통화 |
| fx_published_at | datetime UTC | N | 사용 환율 기준 |
| critical_shipment_count | integer | Y | 중요 화물 수 |
| top_customers | JSON | N | 상위 고객 |
| top_routes | JSON | N | 상위 항로 |
| top_hs_codes | JSON | N | 상위 HS |

TEU, 중량, 화물가액은 서로 변환하지 않는다. 원천값이 없으면 null과 `PENDING`을 사용한다.

## 7. 외부 연동 상세

### 7.1 AISStream

- 프로토콜: WebSocket
- 인증: 서버 비밀저장소의 API Key
- 구독: 운영 대상 항만 Bounding Box와 `PositionReport`
- 정규화 키: MMSI → Vessel → 활성 Leg
- 집계: 선박별 최신 위치와 5분 버킷
- 신선도:
  - 0~15분: FRESH
  - 15~60분: STALE
  - 60분 초과: UNAVAILABLE
- 재연결: 지수 백오프, 최대 간격 60초
- 중복 기준: MMSI+관측시각+좌표

### 7.2 관세청 공공데이터

- 주기: 월 1회, 최신 확정월 재검증
- 입력: 기간, 국가, HS
- 활용: 실시간 위험점수가 아닌 노출도 컨텍스트
- 검증: 응답 코드, 기간, 국가코드, HS 코드, 합계 단위
- 실패: 최근 확정월 유지, 기준월 명시

### 7.3 openrouteservice

- 호출 시점: 위험 Shipment의 대안 시나리오 생성 시
- 입력: 출발·도착 좌표와 운송 프로필
- 출력: GeoJSON, 거리 m, 시간 sec
- 캐시 키: 프로필+좌표 반올림값+경유지+옵션 해시
- TTL: 24시간
- 실패: 직선거리는 참고용으로만 표시하고 비용·탄소 확정 계산에는 사용하지 않음

### 7.4 Open Exchange Rates

- 주기: 일 1회 및 운영자 재수집
- 원본 기준통화와 발표시각 보존
- 교차환율 계산 버전 기록
- 환율 누락: 원통화 표시, 기준통화 합계 제외

### 7.5 Carbon Interface

- 호출 시점: 시나리오 생성·수정 시
- 입력: 중량, 거리, 단위, 운송수단
- 캐시 키: 정규화된 입력 JSON의 해시
- TTL: 30일
- 결과: g/kg/mt 중 내부 표준은 kg CO₂e
- 상태: 실제 배출량이 아닌 `ESTIMATED`

### 7.6 뉴스·기상 수집

- 승인 소스 목록과 수집 라이선스를 관리 화면에서 버전 관리한다.
- 수집 주기 목표: 5~10분.
- 필수 메타데이터: 출처, URL, 게시시각, 수집시각, 언어, 제목, 콘텐츠 해시.
- 공식 기상 경보는 사건지역, 유효 시작·종료, 심각도를 우선 사용한다.
- robots 정책과 이용약관을 준수한다.
- 원문 전체를 화면이나 오프라인 HTML에 포함하지 않는다.

### 7.7 선사 혼잡 메일

- 대상: 승인 공유메일함만 사용.
- 필터: 허용 발신 도메인·주소와 제목 패턴.
- 지원 형식: 본문 HTML/Text, 승인된 PDF/XLSX 첨부.
- 파싱 전 수신자, 서명, 전화번호, 개인 이메일을 마스킹한다.
- `message_id`와 첨부파일 해시로 중복 수신을 제거한다.
- 파싱 실패는 삭제하지 않고 검토 큐로 이동한다.
- 메일 원본 접근은 관리자와 감사 역할로 제한한다.

## 8. 이벤트 처리 파이프라인

### 8.1 처리 단계

```text
수집
→ 형식 검증
→ PII 마스킹
→ 언어 감지
→ 사건 속성 추출
→ 식별자 정규화
→ 중복 후보 검색
→ 사건 군집화
→ 대표 출처 선정
→ Shipment 후보 검색
→ 매칭점수 계산
→ 영향물동 집계
→ 우선순위 계산
→ TOP 5 갱신
→ 경보/검토 큐 발행
```

### 8.2 식별자 정규화

- 항만: 별칭과 도시명을 UN/LOCODE로 변환
- 국가: ISO 3166-1 alpha-2
- 선사: 내부 `carrier_code`
- 선박: IMO 우선, MMSI 보조
- 시간: 원문 시간대 보존 후 UTC 변환
- HS: 원천 세분류를 보존하고 비교용 2/4/6단위 파생

식별자 후보가 둘 이상이면 자동 확정하지 않고 `REVIEW`로 보낸다.

### 8.3 중복 제거와 군집화

1차 정확 중복:

```text
content_hash 동일
OR source_type+source_record_id 동일
OR CARRIER_EMAIL message_id 동일
```

2차 사건 유사도:

```text
ClusterScore =
  30% 장소 일치 +
  25% 사건유형 +
  20% 시간창 겹침 +
  15% 선사·선박 +
  10% 제목·요약 의미 유사도
```

- 85점 이상: 자동 군집
- 65~84점: 검토
- 65점 미만: 별도 사건

공식 출처의 종료·정정 공지는 기존 사건의 상태를 갱신하되 원래 출처를 삭제하지 않는다.

### 8.4 대표 출처 선정

우선순위:

1. 정부·기상기관·항만·터미널·선사 공식 공지
2. 국제기구
3. 승인된 주요 언론
4. 기타 검토 소스

동일 등급에서는 최신성보다 사건 최초성, 구체성, 교차확인 수를 함께 고려한다.

## 9. 이벤트↔Shipment 매칭

### 9.1 후보군

- 상태가 ACTIVE인 Shipment
- 사건 시작 7일 전부터 종료 7일 후까지의 관련 Leg
- 종료시각이 없으면 사건유형별 최대 시간창 적용
- 항만·국가·항로·선사·선박 중 하나 이상 일치

### 9.2 점수

```text
MatchScore =
  0.35 × PortRegionScore +
  0.25 × TimeWindowScore +
  0.15 × CarrierVesselScore +
  0.15 × RouteScore +
  0.10 × EventFitScore
```

| 점수 | 처리 |
|---:|---|
| 80~100 | AUTO_LINKED |
| 60~79 | REVIEW |
| 0~59 | 기본 화면 제외 |

각 하위점수와 일치한 원본 필드를 저장해야 한다. 사용자가 확정·제외한 결과는 기존 점수를 덮어쓰지 않고 검토 이력으로 보존한다.

### 9.3 영향물동 집계

집계 대상은 `AUTO_LINKED`와 `CONFIRMED`이다. `REVIEW`는 별도 잠재 영향으로 표시하며 확정 합계에 포함하지 않는다.

```text
shipment_count = distinct shipment_id
container_count = distinct container_no
total_teu = sum(teu where teu is not null)
gross_weight_kg = sum(gross_weight_kg where value is not null)
cargo_value_base = sum(converted cargo value where FX exists)
```

각 합계에는 `포함 레코드 수/전체 레코드 수`를 완전성 지표로 제공한다.

## 10. 위험 및 우선순위 엔진

### 10.1 환적 연결 여유

```text
connection_buffer_hours =
  outbound_estimated_departure
  - inbound_estimated_berthing
  - minimum_connection_hours
```

| 연결 여유 | 초기 등급 |
|---:|---|
| < 0시간 | MISSED |
| 0~12시간 | CRITICAL |
| 12~24시간 | HIGH |
| 24~48시간 | WATCH |
| > 48시간 | NORMAL |

### 10.2 Shipment 위험점수

```text
ShipmentRisk =
  35% 연결여유 +
  20% AIS 도착신뢰도 +
  15% 항만/운항 지연 +
  15% 고객 SLA +
  10% 화물 중요도 +
   5% 데이터 불확실성
```

점수 결과에는 `risk_version`, 하위점수, 사용 데이터 기준시각을 저장한다.

### 10.3 이벤트 TOP 5

```text
EventPriority =
  30% 영향물동 +
  20% 사건심각도 +
  15% 발생근접성 +
  15% 고객 SLA +
  10% 출처신뢰도 +
  10% 확산추세
```

- 기사 수는 우선순위의 직접 입력으로 사용하지 않는다.
- 중복 제거 후 사건 단위로 계산한다.
- 동점: CRITICAL Shipment 수 → 약속일 임박도 → 출처 신뢰도.
- TOP 5 계산 시점과 계산 버전을 저장한다.

## 11. 시나리오 엔진

### 11.1 시나리오 유형

```text
BASELINE | ALTERNATIVE_PORT | TRUCK_REROUTE |
NEXT_VESSEL | EMERGENCY_AIR
```

### 11.2 처리

1. 기준 Shipment, 중량, 현재 경로, SLA를 로드한다.
2. 대안별 실행 가능 조건을 검증한다.
3. openrouteservice에서 육상 거리·시간을 조회한다.
4. 추가비용을 원통화로 계산한다.
5. Open Exchange Rates로 기준통화 환산한다.
6. Carbon Interface로 CO₂e를 계산한다.
7. ETA, SLA 충족, 비용, 탄소, 신뢰도를 반환한다.

### 11.3 추천 규칙

기본 정책은 SLA 충족 가능 대안만 후보로 두고 추가비용 최소, 탄소 증가 최소 순으로 정렬한다. 정책은 `SLA_PRIORITY`, `COST_PRIORITY`, `CARBON_PRIORITY` 중 선택할 수 있으나 자동 실행하지 않는다.

## 12. 논리 API

### 12.1 조회

```text
GET /api/v2/dashboard/live-ops
GET /api/v2/dashboard/executive?period=YYYY-MM
GET /api/v2/transshipment-connections/risk?window_hours=72
GET /api/v2/transshipment-connections/{connection_id}
GET /api/v2/shipments/{shipment_id}
GET /api/v2/shipments/{shipment_id}/timeline
GET /api/v2/events/top?limit=5
GET /api/v2/events/{event_id}
GET /api/v2/events/{event_id}/sources
GET /api/v2/events/{event_id}/affected-shipments
GET /api/v2/events/{event_id}/impact-summary
GET /api/v2/events/review-queue
GET /api/v2/scenarios/{scenario_id}
GET /api/v2/actions
GET /api/v2/data-sources/health
GET /api/v2/kpis?period=YYYY-MM
```

### 12.2 명령

```text
POST  /api/v2/events/{event_id}/links/{link_id}/confirm
POST  /api/v2/events/{event_id}/links/{link_id}/reject
POST  /api/v2/events/{event_id}/merge
POST  /api/v2/events/{event_id}/dismiss
POST  /api/v2/shipments/{shipment_id}/scenarios
POST  /api/v2/alerts/{alert_id}/acknowledge
PATCH /api/v2/alerts/{alert_id}/owner
POST  /api/v2/actions
POST  /api/v2/actions/{action_id}/approve
POST  /api/v2/actions/{action_id}/reject
POST  /api/v2/actions/{action_id}/complete
POST  /api/v2/admin/ingestion/{source}/retry
```

모든 변경 API는 `Idempotency-Key`, 사용자 ID, 사유, 요청시각을 기록한다.

### 12.3 TOP 5 응답 예시

```json
{
  "as_of_at": "2026-07-28T03:00:00Z",
  "calculation_version": "event-priority-2.1.0",
  "items": [
    {
      "event_id": "evt-001",
      "event_type": "PORT_CONGESTION",
      "title": "싱가포르 환적 대기 증가",
      "severity": "HIGH",
      "priority_score": 82.4,
      "status": "ACTIVE",
      "source": {
        "publisher": "Carrier Official Notice",
        "published_at": "2026-07-28T01:10:00Z",
        "additional_source_count": 3,
        "confidence": 0.92
      },
      "impact": {
        "shipment_count": 42,
        "container_count": 38,
        "total_teu": 61.5,
        "gross_weight_kg": null,
        "gross_weight_status": "PENDING",
        "cargo_value_base": 1250000,
        "base_currency": "USD"
      },
      "matching": {
        "auto_linked": 36,
        "confirmed": 6,
        "review_required": 4
      }
    }
  ]
}
```

## 13. 화면 기술 요구사항

### 13.1 Live Ops

- 초기 응답은 KPI, 위험 큐, TOP 5, 소스 상태를 한 번에 제공한다.
- 지도 데이터는 현재 뷰포트와 위험등급으로 제한한다.
- 목록과 지도는 동일 필터 상태를 공유한다.
- 갱신 중 기존값을 지우지 않고 기준시각을 유지한다.

### 13.2 이벤트/뉴스 TOP 5

카드 필수 필드:

- 사건유형·심각도·상태
- 장소·항만·항로·선사
- 발생/예정시간·최초 게시·마지막 갱신
- 대표 출처·추가 출처 수·신뢰도
- Shipment·Container·TEU·중량·화물가액
- 상위 고객·법인·항로·HS
- 예상 지연·SLA 위험·비용 노출
- 매칭점수·근거
- Shipment 보기·확정·제외·담당자 지정

`REVIEW` 물동은 확정 합계와 색·라벨을 달리한다.

### 13.3 상태 표시

| 상태 | 표현 |
|---|---|
| ACTUAL | 실제 |
| ESTIMATED | 추정 |
| PREDICTED | 예측 |
| STALE | 오래된 값+마지막 갱신 |
| PENDING | 산출 대기 |
| INVALID | 검증 실패 |

색상만으로 상태를 전달하지 않고 텍스트와 아이콘을 병기한다.

### 13.4 반응형

- 1366×768: 지도와 우선조치 큐를 병렬 배치
- 390×844: CRITICAL 큐 → TOP 5 → KPI → 지도 순서
- 가로 스크롤이 필요한 표는 핵심 열을 고정한다.
- 키보드 탐색과 명확한 포커스 상태를 제공한다.

### 13.5 오프라인 HTML

- 외부 CDN, 폰트, 이미지, API 호출을 포함하지 않는다.
- 생성시점의 승인된 스냅샷 데이터만 인라인으로 포함한다.
- API 키, 메일 원문, 개인식별정보를 포함하지 않는다.
- 화면에 `Snapshot as of`와 데이터별 기준시각을 표시한다.

## 14. 워크플로와 권한

### 14.1 역할

| 역할 | 권한 |
|---|---|
| Viewer | 조회·출처 확인 |
| Controller | 경보 인수, 링크 검토, 조치 생성 |
| Approver | 비용·대안 승인/반려 |
| Data Steward | 식별자·출처·군집 보정 |
| Administrator | 소스 설정, 재처리, 사용자 관리 |
| Auditor | 원본·감사로그 읽기 |

### 14.2 상태 전이

```text
OPEN
→ ACKNOWLEDGED
→ IN_PROGRESS
→ APPROVAL_PENDING
→ RESOLVED
→ CLOSED
```

반려 시 `IN_PROGRESS`로 돌아간다. `CLOSED` 재개방은 관리자 또는 승인자만 수행한다.

## 15. 보안

- 외부 API 키는 서버 비밀저장소에서 주입한다.
- 클라이언트, 로그, HTML 스냅샷에 자격증명을 포함하지 않는다.
- 전송구간과 저장구간을 암호화한다.
- B/L, Container, 고객 식별자는 화면 권한에 따라 마스킹한다.
- 메일 서명, 연락처, 수신자 정보를 이벤트 처리 전에 마스킹한다.
- Raw 메일 접근은 최소권한과 감사기록을 적용한다.
- 서비스 계정과 사용자 계정을 분리한다.
- 변경 API는 CSRF 방어, 권한검사, 멱등성 검사를 적용한다.
- 보존기간과 삭제정책은 공급자 약관·사내 정책 승인 후 설정한다.

## 16. 장애·복구

| 장애 | 자동 처리 | 화면 |
|---|---|---|
| AIS 연결 종료 | 백오프 재연결, 마지막 위치 유지 | STALE |
| REST API 429 | Retry-After 준수, 캐시 사용 | 지연·기준시각 |
| REST API 5xx | 제한 재시도 후 회로 차단 | 직전값 또는 산출 대기 |
| 뉴스 접근 실패 | 메타데이터 유지 | 원문 접근 실패 |
| 메일 파싱 실패 | Dead Letter/검토 큐 | 영향 집계 보류 |
| 출처 상충 | 자동 심각도 상향 차단 | 출처 상충 |
| 식별자 모호 | 자동 링크 차단 | 검토 필요 |
| 환율 누락 | 원통화 유지 | 기준통화 산출 대기 |
| 경로 실패 | 시나리오 부분 저장 | 경로 산출 실패 |
| 탄소 실패 | 다른 결과 저장 | 탄소 산출 대기 |

재처리는 원본 ID와 처리 버전을 사용해 멱등성을 보장한다.

## 17. 관측성

### 17.1 메트릭

- 소스별 수집 성공률·지연시간·마지막 성공시각
- API별 2xx/4xx/5xx/429와 쿼터 사용량
- AIS 메시지 수·중복률·신선도
- 메일 파싱 성공/부분/실패
- 사건 생성량·군집률·검토 큐 크기
- 자동 링크 수·확정률·거절률
- TOP 5 계산시간
- 화면 API p50/p95/p99
- Snapshot 생성 성공률

### 17.2 로그

구조화 로그 필드:

```text
timestamp
trace_id
job_id
source_system
source_record_id
entity_id
operation
status
duration_ms
error_code
schema_version
```

로그에 API 키, 메일 본문, 고객명, B/L, Container 번호를 평문으로 기록하지 않는다.

### 17.3 경보

- 핵심 소스 마지막 성공시각 임계 초과
- AIS 신선도 준수율 95% 미만
- 이벤트 처리 p95 15분 초과
- 메일 파싱 실패율 급증
- 자동 링크 거절률 임계 초과
- Query API 오류율 또는 p95 초과

## 18. 성능 목표

| 항목 | 목표 |
|---|---:|
| 첫 화면 | p95 3초 이내 |
| 필터 반영 | p95 2초 이내 |
| AIS→위험 큐 | p95 5분 이내 |
| 뉴스/기상/메일→TOP 5 | p95 15분 이내 |
| 이벤트 상세 | p95 2초 이내 |
| 월간 API 가용성 | 99% |

부하시험 데이터 규모는 출시 전 활성 Shipment, 선박, 일일 기사·메일량의 3배를 기준으로 확정한다.

## 19. 테스트 전략

### 19.1 단위 테스트

- 연결 여유시간과 경계값
- 위험등급 구간
- 환율 교차계산과 반올림
- 탄소 단위 변환
- 사건 군집 임계값
- Shipment 매칭 하위점수
- 영향물동 집계의 중복 제거
- 분모 0의 N/A 처리

### 19.2 계약 테스트

- 5개 외부 API의 샘플 응답 스키마
- 오류·429·빈 응답·부분 응답
- AIS 메시지 필드 누락
- 뉴스 게시시각·시간대
- 메일 HTML/Text/PDF/XLSX 형식
- TMS 식별자와 enum

### 19.3 통합 테스트

1. TMS Shipment와 AIS 위치가 Leg에 연결되는지 검증
2. 연결 지연이 위험 큐에 반영되는지 검증
3. 동일 사건의 뉴스·기상·메일이 하나로 군집되는지 검증
4. 이벤트가 관련 Shipment에만 연결되는지 검증
5. 확정 링크만 영향물동 확정 합계에 포함되는지 검증
6. 경로·환율·탄소가 같은 시나리오 ID로 추적되는지 검증
7. 소스 실패 시 부분 화면이 정상 렌더링되는지 검증
8. 조치 생성부터 승인·완료까지 감사이력이 남는지 검증

### 19.4 데이터 품질 테스트

- 중복 Shipment와 Container
- 잘못된 UN/LOCODE·ISO·IMO·MMSI
- ETA가 ETD보다 비정상적으로 빠른 값
- 미래 실제시각
- 음수 중량·TEU·금액
- 환율 기준일 누락
- 기상 사건 종료시각 누락
- 출처 상충
- 매칭점수와 하위점수 불일치

### 19.5 화면 테스트

- 1366×768과 390×844
- KPI 카드 4개 이상
- 이벤트/뉴스 TOP 5 다섯 건
- 영향물동 결측과 산출 대기
- 긴 제목·다국어·긴 항만명
- 키보드 탐색과 포커스
- 빈 상태·오류·부분 성공
- 브라우저 콘솔 오류 0건
- 오프라인 HTML 외부 요청 0건

### 19.6 표본 대조

최소 다음 7개 수치를 원본과 계산식으로 역추적한다.

1. 72시간 위험 Shipment 수
2. CRITICAL 수
3. 연결 여유시간
4. 이벤트별 Shipment 수
5. 이벤트별 TEU
6. 기준통화 화물가액
7. 시나리오 CO₂e

## 20. 수용 기준 추적표

| ID | 수용 기준 | 검증 |
|---|---|---|
| AC-01 | 위험 건에서 AIS·연결·Shipment·조치 추적 | 통합 테스트 |
| AC-02 | 대안별 ETA·비용·CO₂e와 기준시각 표시 | 시나리오 테스트 |
| AC-03 | API 하나 실패 시 부분 서비스 유지 | 장애 주입 |
| AC-04 | 뉴스·기상·메일이 사건 단위로 중복 제거 | 군집 테스트 |
| AC-05 | TOP 5에 영향물동과 결측 상태 표시 | UI+데이터 대조 |
| AC-06 | 매칭 근거·점수·확정·제외 제공 | API+UI 테스트 |
| AC-07 | 상충·비공식 출처를 확정 사실로 표시하지 않음 | 규칙 테스트 |
| AC-08 | 월간 통계를 실시간 위험으로 사용하지 않음 | 계산 계보 검토 |
| AC-09 | KPI 5개 이상 원본 역추적 | 표본 대조 |
| AC-10 | 자동 재부킹·비용집행·고객통지 없음 | 권한·E2E 테스트 |
| AC-11 | 실제·추정·예측·오래된 값 구분 | UI 테스트 |

## 21. 구현 순서

| 단계 | 구현 | 종료 조건 |
|---|---|---|
| 0 | 데이터 사전·식별자·소스 계약 | 데이터 책임자 승인 |
| 1 | Raw/Canonical 저장소와 TMS 적재 | 샘플 계보 검증 |
| 2 | AIS 수집과 환적 위험 큐 | 과거 실패사례 재현 |
| 3 | 뉴스·기상·메일 수집과 이벤트 군집 | 중복·파싱 품질 통과 |
| 4 | Event-Shipment 매칭과 영향물동 | 정밀도 초기 목표 충족 |
| 5 | Live Ops와 TOP 5 | 데스크톱·모바일 QA |
| 6 | 경로·환율·탄소 시나리오 | 단위·캐시·재현성 검증 |
| 7 | Workflow와 승인 | 권한·감사 테스트 |
| 8 | 경영진 KPI와 Snapshot | 원본 대조·오프라인 검증 |
| 9 | 4주 운영 안정화 | SLA·오탐 리뷰 통과 |

## 22. 출시 전 결정사항

- 승인 뉴스 매체와 공식 기상기관 목록
- 뉴스·메일 수집 이용약관 및 보존기간
- 공유메일함 주소, 허용 발신자, 첨부파일 범위
- TMS의 IMO/MMSI·UN/LOCODE 완전성
- 선사 ETA·터미널 Cut-off 제공범위
- API별 요금제, 쿼터, 재배포 조건
- 기준통화, 환율 반올림, 비용 승인 한도
- 사건 군집·매칭·우선순위 가중치 소유자
- 경보 SLA와 운영 당직체계
- TEU·중량·화물가액의 데이터 완전성 목표

## 23. 변경관리

- 스키마, 계산식, 매칭 규칙은 Semantic Version으로 관리한다.
- 점수 가중치 변경은 과거 표본 재계산과 승인 후 반영한다.
- 외부 API 응답 변경은 계약 테스트 실패로 감지한다.
- 파서 변경 전후 결과를 동일 메일·기사 표본으로 회귀 테스트한다.
- 사용자 수동 확정·제외 결과를 삭제하지 않고 규칙 개선의 검증자료로 사용한다.
- PRD 요구사항 변경 시 본 문서의 수용 기준 추적표를 함께 갱신한다.

