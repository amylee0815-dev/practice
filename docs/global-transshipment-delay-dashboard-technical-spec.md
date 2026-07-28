# 글로벌 환적 지연 인사이트·리스크 관제 대시보드 PRD 기술세부문서

## 1. 문서 정보

| 항목 | 내용 |
|---|---|
| 문서명 | 글로벌 환적 지연 인사이트·리스크 관제 대시보드 PRD 기술세부문서 |
| 버전 | v1.0 |
| 상태 | 검토 준비 |
| 기준일 | 2026-07-28 |
| 대상 범위 | 전 세계 환적 해상화물 |
| 대상 운송 | FCL·LCL 컨테이너 해상운송 |
| 데이터 상태 | 실제 물동량 연계 전 |
| 기본 출력 위치 | `outputs/day5-dashboard-prd/` |
| 첫 화면 목업 | `global-transshipment-risk-dashboard-first-screen.png` |

### 1.1 요구사항 식별자

- `BR`: 비즈니스 요구사항
- `FR`: 기능 요구사항
- `DR`: 데이터·추적성 요구사항
- `RR`: 위험·인사이트 요구사항
- `UI`: 화면·사용성 요구사항
- `INT`: 외부 연동 요구사항
- `SEC`: 보안·감사 요구사항
- `NFR`: 비기능 요구사항
- `QA`: 시험·수용 요구사항

## 2. 제품 개요

### 2.1 비전

글로벌 환적 화물의 지연 현황과 원인을 조기에 탐지하고, 위험 항만·뉴스·법인 화물을 하나의 흐름으로 연결해 담당자가 우선순위와 다음 행동을 결정하도록 지원한다.

### 2.2 SCR 문제정의

#### Situation

- 글로벌 해상화물은 여러 선사와 환적항을 거친다.
- 각 선사·항만·뉴스 데이터가 서로 다른 형식과 갱신주기로 제공된다.
- 법인별 담당자는 이메일, 웹사이트와 파일을 개별 확인한다.

#### Complication

- 환적 지연을 인지했을 때는 이미 연결선 출항이 임박했거나 놓친 경우가 많다.
- 항만 혼잡과 뉴스가 자사 화물에 미치는 영향을 즉시 판단하기 어렵다.
- 동일 이슈에 영향을 받는 법인·고객·Shipment를 수작업으로 찾는다.
- 수치의 기준시각과 출처가 달라 일관된 의사결정이 어렵다.

#### Resolution

- 환적항, 선사 이벤트, 일정, 뉴스와 법인 화물을 공통 모델로 통합한다.
- 환적 위험점수와 연결 실패 위험을 계산한다.
- 주요 뉴스와 실제 경로를 자동 매칭한다.
- 고위험 환적지, 긴급 화물, 뉴스와 연관 화물을 첫 화면에서 연결한다.
- 담당자, 기한, 승인과 조치 결과를 기록한다.

### 2.3 성공 정의

1. 사용자가 30초 이내에 최우선 위험 환적지를 식별한다.
2. 2회 이내의 상호작용으로 영향받는 법인 화물을 확인한다.
3. 뉴스와 화물이 연결된 이유를 설명할 수 있다.
4. 모든 긴급 경보에 담당자, 대응기한과 권고 조치가 존재한다.
5. 화면 수치에서 원본과 계산식까지 역추적할 수 있다.

## 3. 범위

### 3.1 포함 범위

- 전 세계 출발지·도착지의 1회 이상 환적 해상화물
- Shipment·Booking·B/L·Container 기준 통합검색
- 계획·예상·실제 운송 이벤트 타임라인
- 전 항차와 연결 항차의 ETA·ETD 비교
- 환적 연결 여유시간 계산
- 항만 혼잡·기상·파업·사고·선사 일정변경 위험
- 환적지별 위험순위와 영향 Shipment 목록
- 뉴스 수집, 이슈 중복제거, 위험등급과 화물 연관분석
- 법인·고객·선사·항만·위험등급별 필터
- 조치, 담당자, 기한, 승인과 완료이력
- 월간 KPI와 ROI 측정
- 온라인 운영 화면과 오프라인 단일 HTML 스냅샷

### 3.2 제외 범위

- 선사 Booking 자동 변경
- 선사·터미널 시스템에 대한 무인 업무지시
- 승인 없는 긴급 운송비 집행
- 승인 없는 고객 메시지 발송
- 뉴스만을 근거로 한 자동 항차 변경
- 1차 버전의 머신러닝 자동 재학습
- 보험금 청구와 손해배상 자동 처리

## 4. 사용자와 의사결정

| 사용자 | 핵심 질문 | 주요 행동 |
|---|---|---|
| 글로벌 물류 담당자 | 어느 환적지와 화물이 위험한가 | 선사 확인, 대체 항차·항만 검토 |
| 해외 법인 담당자 | 우리 법인의 긴급 화물은 무엇인가 | 현지 조치, 우선순위 조정 |
| 영업·CS | 어떤 고객 납기가 영향받는가 | 고객 안내와 약속일 조정 |
| 물류 관리자 | 어떤 조치와 비용을 승인할 것인가 | 대체 운송·비용 승인 |
| 경영진 | 어떤 항만·선사·노선 정책을 바꿀 것인가 | 공급망 운영정책 결정 |
| 데이터·시스템 관리자 | 데이터가 신뢰 가능한가 | 연동·오류·코드 관리 |

## 5. 설계 원칙

1. 첫 화면의 모든 요소는 다음 행동에 연결한다.
2. 실제값, 예측값, 추정값과 예시값을 구분한다.
3. 누락값을 `0`으로 바꾸지 않는다.
4. 계산할 수 없는 값은 `산출 대기`로 표시한다.
5. 실제 데이터 연계 전 모든 수치는 `DEMO DATA`로 표시한다.
6. 뉴스 제목만으로 영향 화물을 확정하지 않는다.
7. 위험점수와 연관도는 근거를 설명할 수 있어야 한다.
8. 오래된 API 값을 현재값처럼 표시하지 않는다.
9. 서로 다른 단위·기간은 정규화 전 직접 비교하지 않는다.
10. 자동 권고와 실제 실행 사이에 담당자 승인 절차를 둔다.

## 6. 핵심 비즈니스 요구사항

| ID | 요구사항 | 우선순위 |
|---|---|---|
| BR-001 | 글로벌 전체 환적 화물을 단일 화면에서 관리한다. | Must |
| BR-002 | 위험도가 높은 환적지 TOP 5를 제시한다. | Must |
| BR-003 | 즉시 조치가 필요한 법인 화물을 우선순위로 제시한다. | Must |
| BR-004 | 주요 물류 뉴스 TOP 5를 제시한다. | Must |
| BR-005 | 뉴스와 연관된 화물 및 연결 근거를 제시한다. | Must |
| BR-006 | 지연 원인별 대응 방안을 제안한다. | Must |
| BR-007 | 대체 항차·항만 검토에 필요한 근거를 제공한다. | Should |
| BR-008 | 법인·선사·항만별 반복 위험을 비교한다. | Should |
| BR-009 | 조치 효과와 회피 지연·비용을 측정한다. | Should |

## 7. 첫 화면 요구사항

### 7.1 화면 목적

첫 화면은 `글로벌 현황 → 고위험 환적지 → 긴급 법인 화물 → 외부 뉴스 → 뉴스 영향 화물 → 다음 행동` 순서로 의사결정을 지원한다.

### 7.2 상단 KPI

| KPI | 정의 | 데이터 미연계 시 |
|---|---|---|
| 환적 예정 화물 | 분석기간 내 환적 예정 활성 Shipment 수 | `산출 대기` |
| 고위험 화물 | 위험등급 HIGH 이상 활성 Shipment 수 | `산출 대기` |
| 즉시 조치 | 기한 내 조치가 필요한 Shipment 수 | `산출 대기` |
| 뉴스 영향 | 활성 뉴스 이슈와 연관도 기준을 충족한 Shipment 수 | `산출 대기` |

### 7.3 환적 RISK가 높은 환적지 TOP 5

| 표시 항목 | 설명 |
|---|---|
| 순위 | 종합 환적 위험점수 내림차순 |
| 환적항 | 항만명과 UN/LOCODE |
| 위험점수 | 0~100 |
| 위험등급 | NORMAL, WATCH, HIGH, CRITICAL |
| 예상 대기 | 입항 또는 접안 대기시간 |
| 평균 지연 | 계획 대비 예상 지연 |
| 영향 화물 | 해당 항만을 경유하는 활성 Shipment 수 |
| 주요 원인 | 혼잡, 기상, 파업, 전 항차 지연 등 |
| 추세 | 직전 24시간·7일 대비 |
| 데이터 신선도 | 원천과 마지막 갱신시각 |

항만 선택 시 영향 Shipment 목록으로 드릴다운한다.

### 7.4 당장 조치가 필요한 법인 화물

| 표시 항목 | 설명 |
|---|---|
| 법인 | 화물 책임 법인 |
| Shipment No. | 내부 또는 선사 참조번호 |
| 선사·항차 | Carrier, Vessel, Voyage |
| 환적항 | 현재 또는 예정 환적지 |
| 연결 여유 | 지연 반영 후 남은 연결시간 |
| 예상 지연 | 최종 목적지 예상 지연 |
| 위험 원인 | 점수에 기여한 핵심 요인 |
| 고객 영향 | SLA 또는 납기 영향 |
| 권고 조치 | 선사 확인, 대체 항차, 고객 안내 등 |
| 담당자·기한 | 실행 책임과 완료기한 |
| 승인 상태 | 불필요, 승인 대기, 승인, 반려 |

긴급도는 연결 실패 위험, 고객 중요도, 화물가액, 대체 가능성, 예상 비용과 데이터 신뢰도를 조합한다.

### 7.5 주요 뉴스 TOP 5

| 표시 항목 | 설명 |
|---|---|
| 순위 | 뉴스 운영 영향점수 |
| 제목 | 한 줄 핵심 요약 |
| 위험 유형 | 혼잡, 기상, 파업, 사고, 규제 등 |
| 영향 지역 | 국가·항만·항로 |
| 게시시각 | 기사 게시시각 |
| 사건시각 | 실제 사건 발생·예정시각 |
| 신뢰도 | 출처 품질과 교차확인 수준 |
| 영향 화물 | 연관도 기준을 충족한 Shipment 수 |
| 권고 조치 | 확인, 우회, 안내 등 |

동일 사건을 다룬 기사는 하나의 이슈로 묶고 대표 출처와 보조 출처를 보존한다.

### 7.6 주요 뉴스 연관 화물

| 표시 항목 | 설명 |
|---|---|
| 뉴스 이슈 | 중복제거된 이슈 ID와 제목 |
| Shipment | 연관된 화물 |
| 연관 근거 | 항만, 기간, 선사, 선박, 항로 등의 일치 |
| 연관도 | 0~100 |
| 예상 영향 | 지연시간·비용·고객 영향 |
| 담당자 | 확인·조치 책임자 |
| 상태 | 확인 필요, 조치 중, 승인 대기, 종료 |

### 7.7 공통 필터

- 기간
- 글로벌 권역
- 법인
- 고객
- 선사
- 환적항
- 위험등급
- 화물 중요도
- 데이터 신선도

### 7.8 첫 화면 제외 항목

- 통관·서류 제출률 상세
- 문서별 진행상태
- 장식 목적 차트
- 근거가 없는 미래 예측
- 원본 기준시각이 없는 KPI

## 8. 상세 화면

### 8.1 환적항 상세

- 혼잡점수 구성요소
- 입항·접안 대기 추이
- 선석·터미널 상태
- 영향 선사·항차·Shipment
- 지연 원인과 뉴스
- 대체 환적항 후보
- 담당자 조치 현황

### 8.2 Shipment 상세

- Shipment·Booking·B/L·Container 통합 참조
- 법인·고객·중요도
- 전체 Leg와 환적 경로
- 계획·예상·실제 이벤트 타임라인
- 연결 여유시간
- 최초 ETA·선사 ETA·내부 예측 ETA
- 위험점수와 기여요인
- 관련 뉴스와 연관 근거
- 조치·승인·이력
- 원천과 마지막 갱신시각

### 8.3 뉴스 상세

- 대표 기사와 보조 출처
- 사건 발생·예정 기간
- 엔터티: 항만, 국가, 선사, 선박, 항로
- 위험유형과 심각도
- 연관 Shipment와 매칭 근거
- 담당자 확인 및 오탐 처리

### 8.4 통관·서류 상세

통관·서류 기능은 유지하되 첫 화면과 분리한다.

- CI, PL, B/L, ISF, ACI 등 필수서류
- 신고기한과 Cut-off
- 불일치와 반려 사유
- HOLD·EXAM·RELEASED 상태
- 담당자와 보완기한

## 9. 기능 요구사항

| ID | 요구사항 | 우선순위 | 검증 |
|---|---|---|---|
| FR-001 | 환적항 위험 TOP 5를 계산한다. | Must | 점수 표본 대조 |
| FR-002 | 항만 선택 시 영향 Shipment를 조회한다. | Must | 드릴다운 테스트 |
| FR-003 | 즉시 조치가 필요한 법인 화물을 정렬한다. | Must | 긴급도 경계 테스트 |
| FR-004 | 뉴스를 이슈 단위로 중복제거한다. | Must | 유사 기사 테스트 |
| FR-005 | 뉴스와 활성 Shipment를 매칭한다. | Must | 매칭 표본 검토 |
| FR-006 | 뉴스–화물 연관 근거를 표시한다. | Must | 설명가능성 검토 |
| FR-007 | 지연 원인별 권고 조치를 제공한다. | Must | 원인별 시나리오 |
| FR-008 | 담당자, 기한, 승인과 상태를 관리한다. | Must | 상태 전이 테스트 |
| FR-009 | Shipment·Booking·B/L·Container를 통합검색한다. | Must | 참조 매핑 테스트 |
| FR-010 | 선사 이벤트를 공통 이벤트로 정규화한다. | Must | 계약 테스트 |
| FR-011 | 법인·지역·선사·환적항별 필터를 제공한다. | Must | 필터 조합 테스트 |
| FR-012 | 모든 수치의 출처와 기준시각을 제공한다. | Must | 추적성 테스트 |
| FR-013 | 실제 데이터 미연계 시 `DEMO DATA`를 표시한다. | Must | 화면 검사 |
| FR-014 | 계산 불가능한 값은 `산출 대기`로 표시한다. | Must | 결측 테스트 |
| FR-015 | 임원용 오프라인 HTML 스냅샷을 생성한다. | Should | 오프라인 테스트 |

## 10. MoSCoW 우선순위

### Must

- 환적 위험 TOP 5
- 긴급 법인 화물
- 뉴스 TOP 5
- 뉴스 연관 화물
- 위험점수와 근거
- 지연 원인 분류
- Shipment 타임라인
- 담당자·기한·조치상태
- 출처·기준시각·데이터 상태

### Should

- 선사·항만 API
- 대체 항차·항만 후보
- 위험 변화 추이
- 고객 납기 영향
- 월간 KPI와 ROI
- 뉴스 연관 오탐 피드백

### Could

- AIS 실시간 위치
- 이메일·Teams·Slack 알림
- 자연어 질의
- 머신러닝 ETA 예측
- 비용 회피 시뮬레이션

### Won't in v1

- 무인 Booking 변경
- 자동 고객 통지
- 자동 비용집행
- 자동 보험청구

## 11. 전체 아키텍처

```text
[TMS·ERP·법인 파일]   [선사 API·EDI]   [항만·터미널·AIS]   [뉴스·기상]
         \                  |                   |                 /
          +---------------- 수집·원본 보존 ---------------------+
                                   |
                         검증·코드·시간대 표준화
                                   |
       +---------------------------+---------------------------+
       |                           |                           |
  Shipment·Leg 모델           뉴스 이벤트 모델            데이터 품질 로그
       |                           |
       +------------ 위험·연관도·우선순위 엔진 ------------+
                                   |
                       경보·조치·승인 워크플로
                                   |
                         KPI·ROI·추적성 계층
                                   |
                 온라인 대시보드 / 오프라인 HTML 스냅샷
```

### 11.1 구성요소

| 구성요소 | 책임 |
|---|---|
| Ingestion | 파일·API·Webhook 수집과 원본 보존 |
| Carrier Adapter | 선사별 이벤트를 공통 모델로 변환 |
| Port Adapter | 항만·터미널·AIS 혼잡지표 정규화 |
| News Collector | 뉴스·공식 공지·기상 이벤트 수집 |
| Entity Resolver | 항만·선사·선박·항로 엔터티 식별 |
| Shipment Matcher | 뉴스와 Shipment 연관도 계산 |
| Risk Engine | 환적항·Shipment 위험점수 계산 |
| Workflow | 담당자·기한·승인·조치상태 관리 |
| KPI Engine | KPI·ROI 집계 |
| Traceability | 원본·변환·산식·결과 연결 |
| Dashboard Builder | 온라인 화면과 단일 HTML 생성 |
| Audit | 변경·승인·보정 이력 저장 |

## 12. 데이터 상태와 입력 계약

### 12.1 실제 데이터 연계 전

- 목업과 화면 테스트에는 합성 데이터를 사용한다.
- 모든 합성값에 `DEMO DATA`를 표시한다.
- KPI 목표와 위험 임계값은 `가정값`으로 관리한다.
- 실측값을 요구하는 패널은 `산출 대기` 상태를 지원한다.
- 샘플 데이터는 성능·성과 주장에 사용하지 않는다.

### 12.2 실제 데이터 연계 시 필수 메타데이터

| 필드 | 설명 |
|---|---|
| source_system | 데이터 원천 |
| source_record_id | 원천 레코드 ID |
| source_updated_at | 원천 갱신시각 |
| collected_at | 수집시각 |
| as_of_date | 업무 기준일 |
| confidence | 데이터 신뢰도 |
| data_status | ACTUAL, PREDICTED, ESTIMATED, DEMO, PENDING |
| source_hash | 원본 무결성 해시 |

## 13. 핵심 데이터 모델

### 13.1 Shipment

| 필드 | 형식 | 필수 | 설명 |
|---|---|---:|---|
| shipment_id | string | Y | 내부 고유 ID |
| carrier_shipment_no | string | N | 선사 Shipment 참조 |
| booking_no | string | N | Booking 번호 |
| bl_no | string | N | B/L 번호 |
| corporation_id | string | Y | 책임 법인 |
| customer_id | string | N | 고객 |
| carrier_code | string | Y | 선사 코드 |
| origin_code | string | Y | 출발지 UN/LOCODE |
| destination_code | string | Y | 도착지 UN/LOCODE |
| cargo_priority | enum | Y | NORMAL, IMPORTANT, CRITICAL |
| promised_delivery_at | datetime | N | 고객 약속일 |
| status | enum | Y | 활성·완료·취소 |

### 13.2 Container

| 필드 | 형식 | 필수 | 설명 |
|---|---|---:|---|
| container_no | string | Y | 컨테이너 번호 |
| shipment_id | string | Y | Shipment 참조 |
| container_type | string | N | 20GP, 40HC 등 |
| gross_weight_kg | decimal | N | 총중량 |
| dangerous_goods | boolean | Y | 위험물 여부 |
| reefer | boolean | Y | 냉동·냉장 여부 |

### 13.3 TransportLeg

| 필드 | 형식 | 필수 | 설명 |
|---|---|---:|---|
| leg_id | string | Y | 운송 Leg ID |
| shipment_id | string | Y | Shipment 참조 |
| sequence_no | integer | Y | Leg 순서 |
| load_port_code | string | Y | 적재항 |
| discharge_port_code | string | Y | 양하항 |
| carrier_code | string | Y | 선사 |
| vessel_imo | string | N | IMO 번호 |
| vessel_name | string | N | 선박명 |
| voyage_no | string | N | 항차 |
| planned_etd | datetime | N | 계획 출항 |
| estimated_etd | datetime | N | 예상 출항 |
| actual_departure | datetime | N | 실제 출항 |
| planned_eta | datetime | N | 계획 도착 |
| estimated_eta | datetime | N | 예상 도착 |
| actual_arrival | datetime | N | 실제 도착 |

### 13.4 TransshipmentConnection

| 필드 | 형식 | 필수 | 설명 |
|---|---|---:|---|
| connection_id | string | Y | 환적 연결 ID |
| shipment_id | string | Y | Shipment 참조 |
| port_code | string | Y | 환적항 |
| inbound_leg_id | string | Y | 전 항차 |
| outbound_leg_id | string | Y | 연결 항차 |
| minimum_connection_hours | decimal | N | 최소 작업시간 |
| available_connection_hours | decimal | N | 현재 연결 여유 |
| predicted_delay_hours | decimal | N | 예상 지연 |
| missed_connection_risk | decimal | N | 0~1 |
| status | enum | Y | PLANNED, AT_RISK, MISSED, COMPLETED |

### 13.5 PortCongestionSnapshot

| 필드 | 형식 | 필수 | 설명 |
|---|---|---:|---|
| snapshot_id | string | Y | 스냅샷 ID |
| port_code | string | Y | UN/LOCODE |
| terminal_code | string | N | 터미널 |
| observed_at | datetime | Y | 관측시각 |
| congestion_score | decimal | N | 0~100 |
| severity | enum | Y | NORMAL, WATCH, HIGH, CRITICAL |
| anchorage_vessel_count | integer | N | 대기 선박 |
| median_wait_hours | decimal | N | 대기시간 중앙값 |
| berth_utilization_pct | decimal | N | 선석 가동률 |
| schedule_delay_hours | decimal | N | 일정 지연 |
| source | string | Y | 데이터 원천 |
| confidence | decimal | Y | 0~1 |

### 13.6 NewsEvent

| 필드 | 형식 | 필수 | 설명 |
|---|---|---:|---|
| news_event_id | string | Y | 중복제거 이슈 ID |
| title | string | Y | 대표 제목 |
| summary | string | Y | 운영 관점 요약 |
| risk_type | enum | Y | 혼잡, 기상, 파업, 사고, 규제 등 |
| published_at | datetime | Y | 게시시각 |
| event_start_at | datetime | N | 사건 시작 |
| event_end_at | datetime | N | 사건 종료 |
| port_codes | array | N | 영향 항만 |
| country_codes | array | N | 영향 국가 |
| carrier_codes | array | N | 영향 선사 |
| vessel_imos | array | N | 영향 선박 |
| route_tags | array | N | 영향 항로 |
| severity | enum | Y | 뉴스 위험등급 |
| confidence | decimal | Y | 0~1 |
| sources | array | Y | 대표·보조 출처 |

### 13.7 NewsShipmentLink

| 필드 | 형식 | 필수 | 설명 |
|---|---|---:|---|
| link_id | string | Y | 연결 ID |
| news_event_id | string | Y | 뉴스 이슈 |
| shipment_id | string | Y | Shipment |
| port_match | boolean | Y | 항만 일치 |
| time_overlap | boolean | Y | 기간 중첩 |
| carrier_match | boolean | Y | 선사 일치 |
| vessel_match | boolean | Y | 선박 일치 |
| route_match | boolean | Y | 항로 일치 |
| relevance_score | decimal | Y | 0~100 |
| impact_score | decimal | Y | 0~100 |
| rationale | array | Y | 연관 근거 |
| review_status | enum | Y | PENDING, CONFIRMED, REJECTED |

### 13.8 RiskAlert

| 필드 | 형식 | 필수 | 설명 |
|---|---|---:|---|
| alert_id | string | Y | 경보 ID |
| target_type | enum | Y | PORT, SHIPMENT, NEWS |
| target_id | string | Y | 대상 ID |
| rule_id | string | Y | 위험 규칙 |
| total_score | decimal | Y | 0~100 |
| severity | enum | Y | NORMAL, WATCH, HIGH, CRITICAL |
| causes | array | Y | 위험 원인 |
| evidence | array | Y | 근거 참조 |
| recommended_action | string | Y | 권고 조치 |
| owner_id | string | N | 담당자 |
| due_at | datetime | N | 기한 |
| status | enum | Y | 워크플로 상태 |

### 13.9 Action

| 필드 | 형식 | 필수 | 설명 |
|---|---|---:|---|
| action_id | string | Y | 조치 ID |
| alert_id | string | Y | 경보 |
| action_type | string | Y | 선사 확인, 대체 항차 등 |
| owner_id | string | Y | 담당자 |
| approver_id | string | N | 승인자 |
| status | enum | Y | OPEN, PENDING_APPROVAL, IN_PROGRESS, DONE |
| due_at | datetime | Y | 완료기한 |
| expected_delay_avoidance_hours | decimal | N | 예상 회피시간 |
| actual_delay_avoidance_hours | decimal | N | 실측 회피시간 |
| expected_cost_avoidance | decimal | N | 예상 회피비용 |
| actual_cost_avoidance | decimal | N | 실측 회피비용 |

## 14. 코드·시간·단위 표준

- 국가: ISO 3166-1 alpha-2
- 항만·위치: UN/LOCODE
- 선박: IMO Number
- 통화: ISO 4217
- 날짜·시각: ISO 8601
- 저장 시간대: UTC
- 화면 시간대: 사용자 설정과 원천 시간대 병기
- 중량: kg
- 기간: 시간 단위 저장
- 금액: 원통화와 기준통화 동시 저장
- 이벤트: 계획, 예상, 요청과 실제 구분

## 15. 데이터 처리 파이프라인

1. 파일·API·Webhook 원본을 변경 없이 보존한다.
2. 출처, 수집시각, 기준시각과 해시를 기록한다.
3. 필수키·형식·참조코드를 검증한다.
4. 국가·항만·선사·선박·법인 코드를 표준화한다.
5. Shipment와 Container, Leg, 환적 연결을 구성한다.
6. 뉴스 기사를 중복 이슈로 묶는다.
7. 뉴스에서 항만·국가·선사·선박·항로·기간을 추출한다.
8. 뉴스와 활성 Shipment의 연관도를 계산한다.
9. 항만과 Shipment 위험점수를 계산한다.
10. 긴급조치 우선순위를 계산한다.
11. 경보를 생성·병합·재개한다.
12. KPI와 ROI를 집계한다.
13. 추적성 메타데이터와 대시보드 데이터를 생성한다.

### 15.1 멱등성과 중복

- `source_system + source_record_id + source_updated_at`을 멱등 키로 사용한다.
- 같은 선사 이벤트가 재수신돼도 중복 타임라인을 만들지 않는다.
- 동일 사건의 유사 뉴스는 하나의 `news_event_id`로 묶는다.
- 같은 Shipment와 원인에 열린 경보가 있으면 기존 경보를 갱신한다.
- 종료 경보가 재발하면 이전 경보와 연결해 다시 연다.

### 15.2 오류 처리

| 오류 | 처리 |
|---|---|
| Shipment 키 누락 | 격리, 운영 집계 제외 |
| 항만 코드 불명 | 원문 보존, 매핑 대기 |
| 날짜 파싱 실패 | `미수집`, 오류 로그 |
| API 실패 | 직전 성공값과 기준시각 표시 |
| 뉴스 원문 접근 실패 | 메타데이터만 보존, 신뢰도 하향 |
| 환율 누락 | 원통화 유지, 환산액 `산출 대기` |
| 연결 Leg 누락 | 연결 위험 `산출 대기`, 데이터 경보 |

## 16. 환적 위험모델

### 16.1 Shipment 위험점수

```text
Shipment 위험점수 =
항만 혼잡 × 0.25
+ 연결 여유시간 위험 × 0.25
+ 선박 일정 지연 × 0.20
+ 뉴스·외부 이벤트 × 0.15
+ 화물 영향도 × 0.10
+ 데이터 품질 위험 × 0.05
```

가중치는 초기 가정이며 실제 지연 이력으로 검증 후 변경한다.

### 16.2 연결 여유시간

```text
연결 여유시간 =
연결선 예상 출항시각
− 전 항차 예상 도착시각
− 최소 환적 작업시간
```

- 양수이고 충분: 정상
- 양수이나 경고 임계값 미만: 주의
- 0 이하: 연결 실패 위험
- 필수 시간이 없음: `산출 대기`

### 16.3 환적항 위험점수

```text
환적항 위험점수 =
대기시간 표준점수
+ 대기 선박 표준점수
+ 선석 가동률 표준점수
+ 일정 지연 표준점수
+ 활성 뉴스 심각도
+ 영향 Shipment 가중치
```

원천별 단위가 다르면 정규화 전 합산하지 않는다.

### 16.4 위험등급

| 점수 | 등급 | 대응 |
|---:|---|---|
| 0~29 | NORMAL | 정기 모니터링 |
| 30~59 | WATCH | 담당자 확인 |
| 60~79 | HIGH | 조치와 기한 등록 |
| 80~100 | CRITICAL | 즉시 조치·관리자 보고 |

## 17. 지연 원인 분류

| 대분류 | 세부 원인 |
|---|---|
| 항만 | 접안 대기, 선석 부족, 야드 혼잡 |
| 선박 | 전 항차 지연, 감속, 항로 변경 |
| 선사 | Blank Sailing, 연결선 취소, 스케줄 변경 |
| 터미널 | 터미널 변경, 장비·인력 부족 |
| 기상 | 태풍, 강풍, 폭우, 안개 |
| 노무 | 파업, 작업 중단 |
| 규정 | 검사 강화, 위험물 제한 |
| 화물 | 미반입, VGM·서류 오류 |
| 보안·사고 | 항만 사고, 사이버 장애 |
| 데이터 | API 장애, 이벤트 누락, 갱신 지연 |

주원인과 보조원인을 분리하고 근거를 함께 저장한다.

## 18. 뉴스–화물 연관모델

### 18.1 연관도

```text
뉴스–화물 연관도 =
항만 일치 × 0.30
+ 기간 중첩 × 0.25
+ 선사 일치 × 0.15
+ 선박 일치 × 0.15
+ 항로 일치 × 0.10
+ 위험유형 일치 × 0.05
```

### 18.2 연관도 구간

| 점수 | 처리 |
|---:|---|
| 80~100 | 직접 영향 후보 |
| 60~79 | 영향 가능성 높음 |
| 40~59 | 담당자 검토 |
| 0~39 | 첫 화면 제외 |

연관도와 실제 영향도는 분리한다. 연관도가 높아도 사건이 종료됐거나 항차가 변경됐다면 영향도는 낮을 수 있다.

### 18.3 뉴스 위험점수

```text
뉴스 위험점수 =
운영 심각도
× 출처 신뢰도
× 시간 근접도
× 영향 Shipment 규모
```

주요 뉴스 TOP 5는 조회수나 화제성이 아니라 운영 영향점수로 정렬한다.

## 19. 초기 위험 규칙

| 규칙 ID | 조건 예시 | 기본 조치 |
|---|---|---|
| TRN-001 | 연결 여유시간이 경고 임계값 미만 | 선사 연결 가능성 확인 |
| TRN-002 | 연결 여유시간이 0 이하 | 대체 항차·항만 검토 |
| TRN-003 | 컨테이너가 연결선 적재 이벤트 없이 출항 임박 | 터미널·선사 긴급 확인 |
| PRT-001 | 환적항 혼잡등급 HIGH 이상 | 영향 Shipment 확인 |
| PRT-002 | 혼잡등급이 24시간 내 2단계 상승 | 관리자 조기 경보 |
| VSL-001 | 전 항차 ETA가 허용시간 이상 악화 | 연결 여유 재계산 |
| CAR-001 | Blank Sailing 또는 연결선 취소 | 대체 항차 검색 |
| WEA-001 | 환적기간과 중대 기상기간 중첩 | ETA 재평가 |
| LAB-001 | 파업기간과 항만 체류기간 중첩 | 우회·조기 반출 검토 |
| NWS-001 | 고심각도 뉴스와 활성 Shipment 직접 연관 | 담당자 확인 |
| DQ-001 | 선사 이벤트 신선도 기준 초과 | 데이터 단절 경보 |

## 20. 조치·승인 워크플로

```text
NEW → ACKNOWLEDGED → PENDING_APPROVAL → IN_PROGRESS → RESOLVED
                    ↘ REJECTED
RESOLVED → REOPENED
```

| 상태 전이 | 필수 정보 |
|---|---|
| NEW → ACKNOWLEDGED | 담당자, 확인시각 |
| ACKNOWLEDGED → PENDING_APPROVAL | 조치안, 비용, 승인자 |
| ACKNOWLEDGED → IN_PROGRESS | 승인 불필요 근거 |
| PENDING_APPROVAL → IN_PROGRESS | 승인자와 승인시각 |
| PENDING_APPROVAL → REJECTED | 반려사유 |
| IN_PROGRESS → RESOLVED | 결과, 증빙, 완료시각 |
| RESOLVED → REOPENED | 재발사유 |

## 21. KPI 정의

| KPI | 산식 | 단위 | 목표 |
|---|---|---|---|
| 환적 지연률 | 지연 완료 건수 ÷ 환적 완료 건수 × 100 | % | 산출 대기 |
| 평균 환적 지연 | AVG(실제 연결출항−계획 연결출항) | 시간 | 산출 대기 |
| 연결 실패율 | MISSED 건수 ÷ 환적 예정 건수 × 100 | % | 산출 대기 |
| 고위험 환적항 | HIGH 이상 활성 환적항 수 | 개 | 산출 대기 |
| 고위험 화물 비율 | HIGH 이상 Shipment ÷ 활성 환적 Shipment × 100 | % | 산출 대기 |
| 긴급조치 화물 | 기한 내 조치 필요 Shipment 수 | 건 | 산출 대기 |
| 경보 선행시간 | 위험 현실화시각−최초 경보시각 | 시간 | 산출 대기 |
| 평균 대응시간 | 최초 조치시각−경보시각 | 시간 | 산출 대기 |
| 뉴스 연관 정밀도 | CONFIRMED 연결 ÷ 검토 완료 연결 × 100 | % | 산출 대기 |
| 이벤트 신선도 | 기준시간 내 갱신 Shipment ÷ 연계 Shipment × 100 | % | 산출 대기 |
| 회피 지연시간 | 조치 전 예상지연−조치 후 실제지연 | 시간 | 산출 대기 |
| 회피 비용 | 기준 예상비용−실제비용 | 기준통화 | 산출 대기 |

각 KPI에 산식 버전, 분자·분모, 제외조건, 원천, 기준시각과 담당자를 저장한다.

## 22. ROI

```text
총편익 =
회피한 지연 페널티
+ 회피한 긴급운송비
+ 감소한 체화·체선·보관료
+ 방지한 고객 SLA 손실
+ 절감한 모니터링 시간의 환산가치

ROI(%) = (총편익−총비용) ÷ 총비용 × 100
```

### 22.1 원칙

- 보수·기준·낙관 시나리오 제공
- 일회성 구축비와 반복 운영비 분리
- 추정 편익과 실측 편익 분리
- 측정기간과 할인율 공개
- 실제 데이터 전에는 `산출 대기`

## 23. 외부 연동

### 23.1 선사

- DCSA Track & Trace 공통 모델 우선
- 선사 Native API·EDI는 어댑터로 격리
- Shipment, Booking, B/L, Container 참조 지원
- Webhook·Subscription 우선, Polling 보조
- Rate Limit, 지수 백오프와 캐시
- 원본 이벤트 ID와 API 버전 보존
- 자격증명은 Secret Manager 저장

### 23.2 항만·터미널·AIS

- 항만·터미널 공식 피드 우선
- 데이터가 부족한 지역은 승인된 AIS·혼잡 공급자 검토
- 대기시간, 대기 선박, 선석 가동률, 일정 지연 수집
- 공급자별 산식·라이선스·재배포 조건 관리

### 23.3 뉴스·기상

- 공식 항만·선사·기상·정부 발표 우선
- 출처 등급과 교차확인 수를 저장
- 기사 게시시각과 실제 사건시각 분리
- 원문 접근 실패 시 신뢰도 하향

## 24. 논리 API

### 24.1 조회

```text
GET /api/v1/dashboard/global-transshipment-summary
GET /api/v1/transshipment-ports/top-risk?limit=5
GET /api/v1/ports/{port_code}/affected-shipments
GET /api/v1/shipments/urgent-actions
GET /api/v1/shipments/search?reference_type={type}&reference={value}
GET /api/v1/shipments/{shipment_id}
GET /api/v1/shipments/{shipment_id}/timeline
GET /api/v1/news/top-risk?limit=5
GET /api/v1/news/{news_event_id}/affected-shipments
GET /api/v1/alerts
GET /api/v1/actions
GET /api/v1/kpis?period={yyyy-mm}
```

### 24.2 변경

```text
POST  /api/v1/alerts/{alert_id}/acknowledge
POST  /api/v1/alerts/{alert_id}/actions
PATCH /api/v1/alerts/{alert_id}/owner
POST  /api/v1/actions/{action_id}/approve
POST  /api/v1/actions/{action_id}/reject
POST  /api/v1/actions/{action_id}/complete
POST  /api/v1/news-links/{link_id}/confirm
POST  /api/v1/news-links/{link_id}/reject
```

### 24.3 공통 메타데이터

```json
{
  "as_of": "2026-07-28T00:00:00Z",
  "generated_at": "2026-07-28T00:05:00Z",
  "data_status": "DEMO",
  "data_quality": "PARTIAL",
  "source_ids": ["source-id"],
  "formula_version": "transshipment-risk-v1.0"
}
```

## 25. 추적성

```text
화면 요소
→ KPI·위험·연관 결과 ID
→ 산식·규칙·모델 버전
→ 정규화 데이터 ID
→ 원본 파일·API 응답·뉴스 출처
→ 수집시각·기준시각·해시
```

| ID | 요구사항 |
|---|---|
| DR-001 | 모든 결과는 원천과 기준시각을 가져야 한다. |
| DR-002 | 수동 보정은 원본을 덮어쓰지 않는다. |
| DR-003 | 위험점수는 기여요인을 제공한다. |
| DR-004 | 뉴스 연결은 연관 근거를 제공한다. |
| DR-005 | 예측·추정·실적·예시값을 구분한다. |
| DR-006 | 산식과 규칙 버전을 보존한다. |
| DR-007 | 누락값은 명시적 상태로 저장한다. |

## 26. 보안·감사

### 26.1 보안

- 역할 기반 접근제어
- 법인·고객별 데이터 접근 제한
- 전송·저장구간 암호화
- API 자격증명 비밀 저장소 보관
- 로그의 B/L·Container·고객정보 마스킹
- 업로드 파일 형식·크기·악성 콘텐츠 검사
- 대시보드 HTML에 API Key 포함 금지

### 26.2 감사대상

- 위험등급 수동 변경
- 뉴스 연관 확인·거절
- 경보 억제
- 담당자 변경
- 조치 승인·반려·완료
- 규칙·임계값·가중치 변경
- 원천 데이터 수동 보정

## 27. 비기능 요구사항

| ID | 구분 | 요구사항 |
|---|---|---|
| NFR-001 | 성능 | 기준 규모 확정 후 SLA 수립; 첫 화면 목표 3초 이내 |
| NFR-002 | 신뢰성 | 같은 입력 재처리 시 중복 결과 금지 |
| NFR-003 | 가용성 | 연동 실패 시 직전 성공값과 기준시각 표시 |
| NFR-004 | 확장성 | 항만·선사·법인을 어댑터와 설정으로 추가 |
| NFR-005 | 관측성 | 단계별 처리량·지연·오류·신선도 기록 |
| NFR-006 | 유지보수 | 데이터 계약·규칙·산식 독립 버전관리 |
| NFR-007 | 이식성 | 최신 주요 브라우저와 단일 HTML 지원 |
| NFR-008 | 복구 | 원본과 처리이력으로 결과 재생성 |

## 28. 오프라인 단일 HTML

- CSS·JavaScript·아이콘·데이터를 인라인 포함한다.
- 외부 URL·CDN·외부 폰트·로컬 절대경로를 사용하지 않는다.
- 생성시점의 데이터 스냅샷만 포함한다.
- `DEMO DATA` 또는 데이터 기준일을 화면 전역에 표시한다.
- 네트워크 없이 주요 화면과 차트가 동작한다.
- 운영 API 자격증명을 포함하지 않는다.

## 29. 화면·접근성

- 기준 화면: 1366×768, 390×844
- 키보드 탐색
- 색상·텍스트·아이콘으로 위험등급 병기
- 충분한 색상 대비
- 차트 대체 설명
- 긴 항만명·뉴스 제목 줄바꿈
- 예측·실적 시각적 구분
- 빈 상태·오류·데이터 지연 상태 제공

## 30. 테스트 전략

### 30.1 단위

- 날짜·시간대 변환
- 연결 여유시간
- 위험점수 경계값
- 뉴스 연관도
- KPI 분자·분모
- 경보 병합·재발
- 상태 전이
- 결측값 처리

### 30.2 통합

- 파일 수집부터 첫 화면 생성
- 복수 Container와 복수 Leg 연결
- 전 항차 지연에 따른 연결위험 재계산
- 항만 혼잡과 영향 Shipment 연결
- 뉴스 중복제거와 Shipment 매칭
- 선사 이벤트 중복 수신
- API 장애 시 직전값·신선도 표시
- 조치 승인부터 완료까지
- KPI에서 원본까지 추적

### 30.3 데이터 품질

- 중복 Shipment
- 잘못된 UN/LOCODE
- Leg 순서 누락
- ETA가 ETD보다 빠른 값
- 실제시각이 미래인 값
- 알 수 없는 선사·법인
- 통화·중량 오류
- 예측과 실적 혼재
- 사건기간이 없는 뉴스

### 30.4 화면

- 네 개 필수 첫 화면 패널
- KPI 카드 4개 이상
- TOP 5 항만과 뉴스 각각 5건
- 필터와 드릴다운
- 데스크톱·모바일
- 텍스트 잘림·겹침
- 빈 차트·빈 상태
- 콘솔 오류
- 오프라인 실행
- 외부 URL·CDN 검사

### 30.5 표본 대조

실제 데이터 연계 후 최소 다음 7개를 원본과 대조한다.

1. 환적 예정 화물 수
2. 고위험 화물 수
3. 긴급조치 화물 수
4. 환적항 위험 TOP 5
5. 영향 화물 수
6. 뉴스 연관 화물 수
7. 평균 연결 여유시간

## 31. 수용 기준

### 31.1 기능

- 30초 이내 최우선 위험 환적지를 찾을 수 있다.
- 2회 이내 클릭으로 영향 화물을 확인한다.
- 긴급 법인 화물에 담당자와 기한이 있다.
- 뉴스와 화물의 연관 근거가 표시된다.
- 모든 위험에 원인과 권고 조치가 있다.
- Shipment 참조번호로 상세를 찾을 수 있다.

### 31.2 데이터

- 값, 단위, 기준일과 원천을 추적한다.
- 누락값을 0으로 바꾸지 않는다.
- 합계와 평균을 혼동하지 않는다.
- 예측·추정·실적·예시를 구분한다.
- 실제 데이터 전에는 `DEMO DATA`를 표시한다.

### 31.3 화면

- 필수 네 패널이 첫 화면에 존재한다.
- KPI 카드 4개 이상이다.
- 주요 위험과 다음 행동이 연결된다.
- 1366×768과 390×844에서 깨짐이 없다.
- 콘솔 오류가 없다.
- 오프라인 HTML은 인터넷 없이 실행된다.

## 32. 구현 단계

| 단계 | 작업 | 완료조건 |
|---|---|---|
| 1 | 사용자·업무·위험 확정 | 사용자 시나리오 승인 |
| 2 | 데이터 인벤토리 | 키·단위·기준일·원천 매핑 |
| 3 | 샘플 데이터 | DEMO 표시와 UI 검증 |
| 4 | 공통 데이터 모델 | Shipment·Leg·뉴스 계약 승인 |
| 5 | 위험·연관 엔진 | 경계·설명가능성 테스트 통과 |
| 6 | 첫 화면 | 네 필수 패널 구현 |
| 7 | 워크플로 | 담당·승인·완료 검증 |
| 8 | KPI·ROI | 산식·원천·담당자 확정 |
| 9 | 단일 HTML | 오프라인 검증 |
| 10 | 실제 데이터 연계 | DEMO와 실측 분리 검증 |
| 11 | 시범운영 | 오탐·미탐과 사용자 피드백 |
| 12 | 운영전환 | 임계값·SLA·책임자 승인 |

## 33. 릴리스 게이트

### Gate 1: 데이터

- 데이터 원천과 소유자가 승인됐다.
- Shipment·Leg·항만·뉴스 계약이 확정됐다.
- 결측·오류·격리 기준이 검증됐다.

### Gate 2: 위험·연관

- 위험 규칙과 경계 테스트가 통과했다.
- 뉴스 연관 표본이 담당자에게 검토됐다.
- 오탐·미탐 기록절차가 준비됐다.

### Gate 3: 워크플로·보안

- 담당·승인·완료 흐름이 검증됐다.
- 역할별 접근권한이 승인됐다.
- 자격증명이 화면·로그·HTML에 노출되지 않는다.

### Gate 4: 대시보드

- 네 필수 패널과 다음 행동이 존재한다.
- 수치 표본이 원본과 일치한다.
- 데스크톱·모바일·오프라인 검수를 통과한다.

### Gate 5: 운영

- 장애·지연·복구 절차가 리허설됐다.
- KPI 목표·위험 임계값·SLA가 확정됐다.
- 담당자 교육과 임원 보고가 완료됐다.

## 34. 미확정 사항

| 항목 | 상태 | 확정 방법 |
|---|---|---|
| 실제 물동량 원천 | 산출 대기 | TMS·ERP·법인 파일 조사 |
| 선사 API 우선순위 | 산출 대기 | 최근 12개월 선적 비중 |
| 항만 혼잡 공급자 | 산출 대기 | 정확도·라이선스 평가 |
| 뉴스 공급자 | 산출 대기 | 범위·비용·중복률 평가 |
| 위험 가중치 | 가정값 | 과거 지연 데이터 검증 |
| KPI 목표 | 산출 대기 | 6~12개월 기준선 |
| 긴급조치 SLA | 산출 대기 | 운영 책임자 합의 |
| 비용 승인한도 | 산출 대기 | 결재규정 확인 |
| 데이터 보존기간 | 산출 대기 | 법무·보안 검토 |

## 35. 연계 산출물

| 파일 | 목적 |
|---|---|
| `cross-analysis-map.md` | 데이터 키·단위·기준일·원천·신뢰도 |
| `trade-prd.md` | 비즈니스 PRD |
| `kpi-definition.md` | KPI 산식·목표·경고·담당자 |
| `trade-dashboard.html` | 단일 HTML 대시보드 |
| `kpi-monthly-summary.csv` | 월간 KPI |
| `kpi-measurement-log.md` | 누락·오류·보정·변경이력 |
| `executive-dashboard-script.md` | 5분 임원 보고문 |
| `global-transshipment-risk-dashboard-first-screen.png` | 첫 화면 목업 |

## 36. 최종 체크리스트

- [ ] 글로벌 전체 환적 화물이 범위에 포함되는가
- [ ] 첫 화면 네 필수 패널이 구현됐는가
- [ ] 실제값·예측값·예시값이 구분되는가
- [ ] 물동량 미연계 상태가 `DEMO DATA`로 표시되는가
- [ ] 누락값이 0으로 처리되지 않는가
- [ ] 위험점수와 뉴스 연관도의 근거가 설명되는가
- [ ] 모든 화면 수치가 원본과 산식으로 추적되는가
- [ ] 긴급 화물에 담당자와 기한이 있는가
- [ ] 선사·항만·뉴스 연동 장애가 정상값처럼 보이지 않는가
- [ ] 표본 수치 5개 이상이 원본과 일치하는가
- [ ] ROI의 효과·비용·기간·가정이 공개되는가
- [ ] 데스크톱·모바일 화면 검수를 통과했는가
- [ ] 외부 CDN·폰트·이미지·로컬 절대경로가 0건인가
- [ ] 브라우저 콘솔 오류가 0건인가
- [ ] 인터넷 없이 단일 HTML이 실행되는가

