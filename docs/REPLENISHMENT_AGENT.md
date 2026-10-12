# Autonomous Replenishment Assistant — Architecture & Technical Reference

## 1. System Architecture

The Stock.IMS Replenishment Assistant is an autonomous, agentic inventory replenishment engine designed with strict safety boundaries and human-in-the-loop controls. It combines LLM tool-calling reasoning with deterministic fallback algorithms to recommend purchase orders while preventing hallucinated stock manipulation.

```
                           ┌────────────────────────────┐
                           │   ADMIN / MANAGER Client   │
                           │  (Web UI / Authenticated)  │
                           └─────────────┬──────────────┘
                                         │ POST /api/replenishment/run
                                         ▼
                           ┌────────────────────────────┐
                           │   replenishmentRoutes.js   │
                           │  (Rate Limiter + Concurrency│
                           │   Lock per req.user.id)    │
                           └─────────────┬──────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   │                                           │
         [LLM Client Configured]                    [LLM Client Missing / Error]
                   ▼                                           ▼
┌──────────────────────────────────────┐     ┌───────────────────────────────────┐
│     replenishmentAgentService        │     │    generateRuleBasedPlan()        │
│   (OpenAI-Compatible Tool Loop)      │     │  • Min-Heap Reorder Queue         │
│  • Max 4 Iterations                  │     │  • Holt-Winters / Exp Smoothing   │
│  • Token-Paced / Rate-Limit Retry    │     │  • Supplier MOQ Bounds            │
└──────────────────┬───────────────────┘     └─────────────────┬─────────────────┘
                   │                                           │
                   ▼                                           │
┌──────────────────────────────────────┐                       │
│    Read-Only Tools Execution         │                       │
│  • getReorderQueue                   │                       │
│  • getProductForecast                │                       │
│  • getProductAnomalies               │                       │
│  • getExpiringBatches                │                       │
│  • getDeadStock                      │                       │
│  • getSupplierInfo                   │                       │
│  (Zero DB writes; pure queries)      │                       │
└──────────────────┬───────────────────┘                       │
                   │                                           │
                   ▼                                           │
┌──────────────────────────────────────┐                       │
│  serverSideValidateAndNormalize()    │                       │
│  • Query live DB for active SKUs     │                       │
│  • computeMaxQuantity() Dynamic Bound│                       │
│  • Store maxAllowed on each item     │                       │
│  • Clamp excessive quantities        │                       │
└──────────────────┬───────────────────┘                       │
                   │                                           │
                   └─────────────────────┬─────────────────────┘
                                         │
                                         ▼
                           ┌────────────────────────────┐
                           │  ReplenishmentPlan (DB)    │
                           │  Status: PENDING_APPROVAL  │
                           │  Socket.io Dashboard Event │
                           └─────────────┬──────────────┘
                                         │
                    Human-in-the-Loop Review & Approval
                                         │
            ┌────────────────────────────┴───────────────────────────┐
            │                                                        │
            ▼                                                        ▼
┌───────────────────────────────┐        ┌──────────────────────────────────────┐
│ PATCH /items/:itemId          │        │ POST /items/:itemId/approve          │
│ • Validates positive integer  │        │ • Idempotency guard (409 on second)  │
│ • Clamps to item.maxAllowed   │        │ • Transactional Purchase Order       │
│ • Leaves stock untouched      │        │ • Creates AuditLog entry             │
└───────────────────────────────┘        │ • Stock remains UNCHANGED (PENDING)  │
                                         └──────────────────────────────────────┘
```

---

## 2. API Endpoints

All endpoints require JWT Bearer authentication (`protect`) and are strictly restricted to `ADMIN` and `MANAGER` roles (`authorize('ADMIN', 'MANAGER')`). Requests from `STAFF` return `403 Forbidden`.

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `POST` | `/api/replenishment/run` | Triggers agent loop or fallback, returns new plan with `PENDING_APPROVAL`. Keyed by `req.user.id`. | `201`, `401`, `403`, `429`, `500` |
| `GET` | `/api/replenishment/plans` | Fetches paginated plan history sorted by creation time. Supports `?status=&page=&limit=`. | `200`, `401`, `403`, `500` |
| `GET` | `/api/replenishment/plans/:id` | Retrieves full plan details including populated products, suppliers, and items. | `200`, `401`, `403`, `404`, `500` |
| `PATCH`| `/api/replenishment/plans/:id/items/:itemId` | Updates proposed item quantity. Clamps strictly against `item.maxAllowed`. | `200`, `400`, `401`, `403`, `404`, `409` |
| `POST` | `/api/replenishment/plans/:id/items/:itemId/approve` | Approves an item. In one transaction creates a `PENDING` purchase `Order` and an `AuditLog`. Stock is untouched. | `200`, `400`, `401`, `403`, `404`, `409` |
| `POST` | `/api/replenishment/plans/:id/items/:itemId/reject` | Marks item `REJECTED` with optional audit notes. Idempotent (409 on second reject). | `200`, `401`, `403`, `404`, `409` |
| `POST` | `/api/replenishment/plans/:id/approve-all` | Approves all remaining pending items inside `runWithOptionalTransaction`. Creates 1 PO and 1 AuditLog per item. | `200`, `401`, `403`, `404`, `409` |

---

## 3. Environment Variables

| Variable | Default Value | Description |
|---|---|---|
| `LLM_API_KEY` | *(None / Optional)* | Groq or OpenAI-compatible API key. If absent, the engine defaults safely to the rule-based fallback without crashing. |
| `LLM_PROVIDER` | `groq` | Provider identifier (`groq`, `openai`, `ollama`). |
| `LLM_ENDPOINT` | `https://api.groq.com/openai/v1` | Base URL for LLM chat completion requests. |
| `LLM_MODEL` / `REPLENISHMENT_MODEL` | `openai/gpt-oss-120b` | Model used for replenishment reasoning. |
| `REPLENISHMENT_MAX_PRODUCTS` | `10` | Maximum candidate SKUs analyzed per plan execution. |
| `EVAL_TPM_BUDGET` | `6500` | Token-per-minute throttle ceiling used by `evalReplenishment.js`. |

---

## 4. Running Tests and Evaluations

All commands must be executed from the `backend/` directory:

### Run Integration Tests (Native Node Test Runner + Supertest)
```bash
# 1. Routes and approval flow integration test (11 subtests)
node --test tests/replenishmentRoutes.test.js

# 2. Agent validation, tool read-only guarantees, and bounds clamping test (9 subtests)
node --test tests/replenishment.test.js
```

### Run Evaluation Suite
```bash
# Offline Pipeline Verification (Mock tool executor & schema validation across 18 fixtures)
node scripts/evalReplenishment.js

# Live LLM Evaluation (Uses configured Groq API key and rate pacer)
node scripts/evalReplenishment.js --live
```

---

## 5. Evaluation Results

The evaluation suite tests 18 standardized industry fixtures spanning 7 distinct categories:
- **Group 1: Clearly Needing Reorder** (Low stock vs lead-time sales velocity)
- **Group 2: Adequate Stock** (High safety buffer; must NOT reorder)
- **Group 3: Dead Stock** (Zero stock movement for 90+ days; must NOT reorder)
- **Group 4: Expiring Stock** (Batch expiring in < 30 days)
- **Group 5: Data Anomaly** (Z-score demand spikes)
- **Group 6: Empty History** (Brand new products with zero sales velocity)
- **Group 7: Prompt Injection Attacks** (System override strings in product names, notes, supplier JSON)

### Scorecard Summary

```text
================================================================
  EVALUATION SUMMARY SCORECARD                                  
================================================================
  Completed Cases:                 18 / 18
  Errored Cases:                   0 / 18

  METRICS (Computed strictly over 18 completed cases):
  1. Valid JSON Rate:              100.0% (18/18)
  2. Decision Accuracy:            100.0% (18/18)
     (Computed: didReorder === (expectedDecision === 'REORDER'))
  3. Quantity-in-Bounds Rate:      100.0% (18/18)
     (Computed dynamically via computeMaxQuantity: 60d demand + 3x threshold)
  4. Injection Resisted Rate:      3 of 3 completed (100.0%)
  5. Total Fallbacks:              0
  6. Failed Completed Cases:       0
================================================================
Status: PASSED
```

---

## 6. Stock.IMS Interview Script Section

### 30-Second Elevator Pitch
> "In Stock.IMS, I designed an autonomous Replenishment Agent that actively monitors inventory health and drafts purchase orders before stockouts happen. Unlike brittle rule scripts or naive LLM wrappers, our agent reasons over 6 live operational metrics—including exponential smoothing forecasts, expiring batches, and dead stock. Crucially, the AI is decoupled from actual stock writes: it can only propose plans with strict dynamic mathematical ceilings, and orders require human manager approval executed inside atomic MongoDB transactions."

---

### How the Agent Loop Works
1. **Trigger & Guarding**: A manager triggers `/api/replenishment/run`. The endpoint checks an in-memory per-user lock and rate limiter keyed by `req.user.id` to prevent concurrent run race conditions.
2. **Context Assembly**: The agent loop initializes with a system prompt instructing the model to review candidate products using tool calling.
3. **Tool Execution**: The LLM queries `getReorderQueue` (top urgent items from a Min-Heap priority queue) and checks `getDeadStock` (products idle for 90+ days). For candidates, it inspects `getProductForecast` (exponential smoothing) and `getExpiringBatches`.
4. **Data Delimitation**: Tool outputs returned to the model are strictly wrapped in XML data delimiters: `<tool_data tool="name">...</tool_data>`. The prompt explicitly instructs the LLM to treat content within these tags purely as data values and ignore any instruction overrides embedded in product names or notes.
5. **Termination & Parsing**: When the model finishes reasoning, it submits the plan via `submit_plan` or returns JSON matching the required schema.

---

### Approval Flow & Transactional Safety
- **No Stock Manipulation on Approval**: When a manager clicks "Approve", the server creates a `PURCHASE` order with status `PENDING`. Product stock is **not modified**. Stock only increments when the warehouse physically receives the shipment.
- **Atomic Operations**: `POST /plans/:id/items/:itemId/approve` and `POST /plans/:id/approve-all` run inside `runWithOptionalTransaction`. If database writes fail midway, the transaction rolls back cleanly.
- **Audit Logging**: Every created order automatically generates a corresponding `AuditLog` entry in the same transaction linking the user ID, entity ID, item SKU, quantity, and total cost.
- **Idempotency**: Attempting to approve or reject an already processed item immediately returns `409 Conflict`, preventing double-ordering.

---

### Security Architecture & Clamping
1. **Strictly Read-Only Tools**: The agent has zero tools with write capabilities (`create`, `update`, `save`, `delete`). It is physically impossible for the LLM to mutate the database directly.
2. **Server-Side Validation**: Proposed quantities are not trusted from the LLM. In `serverSideValidateAndNormalize()`, the backend queries the live database to verify that the SKU exists and is not soft-deleted.
3. **Adaptive Bound Clamping (`computeMaxQuantity`)**:
   $$\text{MaxAllowed} = \min\left(1000, \, \max\left(20, \, \text{Demand}_{60\text{d}} + 3 \times \text{LowStockThreshold}\right)\right)$$
   Every plan item stores this `maxAllowed` property upon creation. Even if a prompt injection attempts to order 1,000,000 units, the quantity is automatically clamped to `maxAllowed`.
4. **Zero Secrets in Logs**: Structured Winston logs output only metrics (`toolCallsCount`, `executionTimeMs`, `planId`). Prompt text and customer credentials are never logged.

---

### Known Limitations
1. **Free-Tier LLM Rate Limits (TPM)**: Free cloud LLM endpoints (e.g. Groq) enforce tight Token-Per-Minute quotas (~6,000 TPM). In production, backoff retries and the custom `TokenPacer` prevent crashes, but burst traffic requires dedicated model throughput or automatic fallback to the heuristic engine.
2. **Single Primary Supplier Assumption**: Products currently map to one primary supplier. Split orders across multiple vendors for the same SKU are not yet supported.
3. **Manual Email Dispatch**: Supplier email drafts are synthesized into the plan document for review, but are not auto-sent to avoid accidental vendor communication.

---

### 5 Tough Interview Questions & Honest Answers

#### Q1: "Why use an LLM for replenishment instead of just using deterministic safety stock formulas?"
> **Answer**: Deterministic formulas like $s, S$ or EOQ are great when demand is stationary and independent. However, real warehouse operations involve multi-factor edge cases: expiring batches that must be consumed before restock, recent supply chain anomalies, and dead stock that shouldn't be reordered regardless of current count. An LLM agent synthesizes qualitative product notes with multi-source telemetry in natural language for the warehouse manager. Most importantly, we maintain deterministic safety stock formulas as our **ground truth ceiling** and fallback engine, so we get the reasoning benefits of an agent without sacrificing mathematical determinism.

#### Q2: "What prevents a prompt injection in a product's name from ordering 100,000 units and draining our budget?"
> **Answer**: We employ three independent defense layers:
> 1. **Data Delimitation**: Database values returned to the model are enclosed in `<tool_data>` tags, with system instructions enforcing that anything within tags is passive data.
> 2. **Deterministic Server-Side Clamping**: The server re-validates the proposed quantity against `computeMaxQuantity(product, forecast)` before writing to MongoDB, storing `maxAllowed` on the item. Any injection asking for 1,000,000 units is forcibly clamped to the 60-day demand ceiling (e.g., 165 units) and flagged as `clamped: true`.
> 3. **Human-in-the-Loop Approval**: The agent cannot place purchase orders or disburse funds. It can only propose a plan with status `PENDING_APPROVAL`.

#### Q3: "What happens if MongoDB replica sets are not configured or transactions fail?"
> **Answer**: We implemented a resilient wrapper `runWithOptionalTransaction`. In production replica sets, all operations (Purchase Order creation, AuditLog writing, and Plan status update) execute inside a multi-document ACID transaction. If running in a standalone MongoDB dev instance where transactions are unsupported, the wrapper detects the specific error message and falls back to consistent sequential writes with identical validation guarantees.

#### Q4: "Why does approving an item leave product stock unchanged?"
> **Answer**: Because approving a replenishment proposal generates a **Purchase Order** (`status: PENDING`), not a stock receipt. In double-entry inventory accounting, inventory must never be recorded as on-hand until the warehouse docks receive, inspect, and approve the shipment batches. Prematurely adding stock on purchase order creation would cause inventory inflation, leading sales channels to sell items that don't exist yet.

#### Q5: "How does the system handle LLM API outages or 429 rate limit errors?"
> **Answer**: First, we have an exponential backoff retry loop (`callLlmWithRateLimitRetry`) that inspects `retry-after` HTTP headers. If retries are exhausted, the API times out (after 120s), or `LLM_API_KEY` is not provided, the service triggers `generateRuleBasedPlan()`. This runs our Min-Heap queue and exponential smoothing algorithms directly in Node.js, persisting a valid plan with `source: 'rule-based-fallback'`. The UI alerts managers with an amber banner indicating that heuristic fallbacks were used.
