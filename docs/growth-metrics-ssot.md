# Growth metrics — single source of truth

This document is the **normative semantics SSOT** for **operator growth metrics**: cross-surface correlation, conversion, retention, and related KPIs backed by `funnel_event` and `usage_counter` data.

**Executable SQL mirrors** live under `website/src/lib/growthMetrics*.ts` and **must match** the fenced `sql` blocks below after whitespace normalization — enforced by `website/__tests__/growthMetricsSqlParity.test.ts`.

**HTTP ingestion, attribution field shapes, max lengths, and `schema_version` for beacons** are defined only in [`docs/funnel-observability-ssot.md`](funnel-observability-ssot.md). This document references **`funnel_anon_id`** as a join key only; it does **not** redefine attribution schema.

**Metric roles:**

| Id | Audience | Purpose |
|----|----------|---------|
| `Retention_ActiveReserveDays_ge2_Rolling28dUtc` | Operator | Rolling 28-day retention on `reserve_allowed` |
| `AccountGauge_DistinctReserveUtcDays_CurrentMonth` | Account UX | Current UTC calendar month activity (see Account API); **not** labeled “retention” in UI |

---

## Funnel metadata reference (read-only)

- **`funnel_anon_id`:** pseudonymous correlation id on anonymous `funnel_event` rows (surface + product-activation). Semantics: [`docs/funnel-observability-ssot.md`](funnel-observability-ssot.md).

---

### TimeToFirstVerifyOutcome_Seconds

**Question:** For one `funnel_anon_id`, how many seconds from first `acquisition_landed` to first `verify_outcome`?

**Parameters:** `$1` = `funnel_anon_id` (UUID text).

```sql
SELECT (
  EXTRACT(EPOCH FROM (
    (SELECT MIN(created_at) FROM funnel_event fe2 WHERE fe2.event = 'verify_outcome' AND fe2.metadata->>'funnel_anon_id' = $1)
    -
    (SELECT MIN(created_at) FROM funnel_event fe1 WHERE fe1.event = 'acquisition_landed' AND fe1.metadata->>'funnel_anon_id' = $1)
  ))
)::int AS seconds
```

---

### CrossSurface_ConversionRate_AcquisitionToVerifyOutcome_Rolling7dUtc

**Window:** rolling **7** UTC days from `now() AT TIME ZONE 'UTC'`.

**Denominator `D`:** distinct `funnel_anon_id` with ≥1 `acquisition_landed` in window (non-null id).

**Numerator `N`:** distinct ids from `D` with ≥1 `verify_outcome` in window.

**Value:** `N / NULLIF(D, 0)` as float.

```sql
WITH w AS (
  SELECT (now() AT TIME ZONE 'UTC') AS now_utc
),
acq AS (
  SELECT DISTINCT metadata->>'funnel_anon_id' AS fid
  FROM funnel_event, w
  WHERE event = 'acquisition_landed'
    AND metadata->>'funnel_anon_id' IS NOT NULL
    AND metadata->>'funnel_anon_id' <> ''
    AND created_at >= w.now_utc - interval '7 days'
),
outc AS (
  SELECT DISTINCT metadata->>'funnel_anon_id' AS fid
  FROM funnel_event, w
  WHERE event = 'verify_outcome'
    AND metadata->>'funnel_anon_id' IS NOT NULL
    AND metadata->>'funnel_anon_id' <> ''
    AND created_at >= w.now_utc - interval '7 days'
)
SELECT
  (SELECT COUNT(*)::int FROM acq) AS d,
  (SELECT COUNT(*)::int FROM acq INNER JOIN outc ON acq.fid = outc.fid) AS n,
  (SELECT COUNT(*)::float FROM acq INNER JOIN outc ON acq.fid = outc.fid) / NULLIF((SELECT COUNT(*)::float FROM acq), 0) AS rate
```

---

### Retention_ActiveReserveDays_ge2_Rolling28dUtc

**Window:** rolling **28** UTC days.

**Denominator:** distinct `user_id` with ≥1 `reserve_allowed` in window.

**Numerator:** distinct `user_id` in denominator with ≥2 distinct UTC calendar dates of `reserve_allowed` in window.

**Value:** `numerator / NULLIF(denominator, 0)`.

```sql
WITH w AS (
  SELECT (now() AT TIME ZONE 'UTC') AS t
),
denom AS (
  SELECT DISTINCT fe.user_id
  FROM funnel_event fe
  CROSS JOIN w
  WHERE fe.event = 'reserve_allowed'
    AND fe.user_id IS NOT NULL
    AND fe.created_at >= w.t - interval '28 days'
),
num AS (
  SELECT d.user_id
  FROM denom d
  INNER JOIN funnel_event e ON e.user_id = d.user_id AND e.event = 'reserve_allowed'
  CROSS JOIN w
  WHERE e.created_at >= w.t - interval '28 days'
  GROUP BY d.user_id
  HAVING COUNT(DISTINCT (e.created_at AT TIME ZONE 'UTC')::date) >= 2
)
SELECT
  (SELECT COUNT(*)::int FROM num) AS numerator,
  (SELECT COUNT(*)::int FROM denom) AS denominator,
  (SELECT COUNT(*)::float FROM num) / NULLIF((SELECT COUNT(*)::float FROM denom), 0) AS rate
```

---

## Validation (release gate)

`npm run validate-commercial` runs website Vitest including SQL parity and growth doc boundary tests.
