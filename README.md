# future_ai — AI Trajectory Simulator

An interactive, browser-based scenario explorer for thinking through possible AI infrastructure, economics, capability, and deployment trajectories from 2026 to 2050.

> **Not a forecast.** This is a transparent, bounded scenario model. It supports comparisons between optimistic, baseline, pessimistic, and custom assumptions; it does not predict AGI dates or provide a basis for operational, investment, safety, or regulatory decisions.

Try it here: https://zedcade.github.io/future-ai/

## Overview

The simulator makes assumptions explicit and shows their consequences across linked charts. It is designed for questions such as:

- What follows if AI-compute growth decelerates toward a long-run floor?
- How much infrastructure, capital expenditure, electricity, cooling water, and packaging capacity would different scaling paths imply?
- How do task-horizon assumptions affect an illustrative benchmark-saturation curve?
- What happens to relative inference cost when demand, efficiency, and price trends diverge?

The application runs entirely in the browser. It has no backend, no account requirement, and no API key requirement.

Every data point — anchors, model constants, slider ranges, scenario presets, milestones, reference tables, and card text — lives in one JSON dataset that can be exported, edited, and re-imported. See [Data and curation](#data-and-curation).

## Dashboard

| Panel | What it shows | Modeling status |
|---|---|---|
| Live data anchors | Sourced calibration values with links, units, and sources | Curatable data |
| Compute stock | Total AI computing capacity, indexed to 2026 = 1x | Scenario model |
| Frontier training-run compute | Compute used by the largest single frontier training run | Separate scenario model |
| AI chip packaging capacity | Advanced-packaging / CoWoS-class capacity, in thousand wafers/month | Scenario model |
| Hyperscaler capex | Annual AI-infrastructure capex and cumulative spend | Scenario model |
| Capex by region | Illustrative U.S., EU, China, and rest-of-world allocation of total capex | Derived allocation |
| Private AI investment | Private capital invested into AI companies, distinct from capex | Scenario model |
| Task-horizon capability | Human-equivalent task length an AI can reliably complete | Scenario model |
| Benchmark saturation | Illustrative 0–100% capability proxy based on task horizon | Derived proxy |
| Open-weight vs. closed frontier | Open-weight training-compute path lagged behind the closed frontier | Derived proxy |
| Tokens vs. cost | Token-demand index, unit-cost index, projected USD cost per 1M tokens, and relative inference-spend index | Mixed scenario / derived model |
| Electricity demand | AI-compute electricity demand, in TWh/year | Derived from compute and efficiency |
| Data-center water use | Cooling-water use, in billion litres/year | Derived from energy and WUE |
| Parallel task capacity | Concurrent task capacity under a fixed per-task cost assumption | Direct compute proxy |
| Inference efficiency | Throughput-per-dollar proxy, derived from inverse token cost | Derived proxy |
| Supervision burden | Residual-review proxy derived from benchmark saturation | Derived proxy |
| Hardware & physical limits | Qualitative constraints on compute growth | Reference table |
| Projected task-horizon milestones | Year each human-equivalent task length is first reached | Derived from task horizon |
| Expert forecast dispersion | Named external AGI-timeline forecasts, for calibration | Reference table |

## Scenarios

The simulator provides three coherent presets plus an editable custom scenario.

| Scenario | Interpretation |
|---|---|
| **Optimistic** | Faster infrastructure growth, sustained scaling, stronger efficiency improvement, faster task-horizon gains, later node-scaling constraint, lower cooling-water intensity |
| **Baseline** | Current measured trends with decaying growth rates, moderate efficiency gains, and bounded infrastructure/economic ceilings |
| **Pessimistic** | Earlier constraints, slower scaling and investment, lower ceilings, slower task-horizon progress, and weaker water-efficiency gains |
| **Custom** | Any scenario created by moving one or more sliders; preset curves remain visible for comparison |

The preset values are part of the dataset (`scenarios`), so they can be curated or replaced by import. The built-in presets can always be restored.

## Data anchors

The default 2026 values are calibration anchors, not precise forecasts. The application identifies the source families used for calibration, including Epoch AI, Stanford HAI AI Index, METR, IEA, and semiconductor-industry reporting.

| Anchor id | Anchor | Default value | Used by the model |
|---|---|---:|:---:|
| `compute_growth` | AI chip-stock compute growth | ~3.4x/year (doubling ~6.8 months) | reference |
| `capex_2026` | Hyperscaler capex | ~$770B | yes |
| `enterprise_ai_adoption` | Enterprise AI adoption | 88% | reference |
| `data_center_electricity_2030` | Data-center electricity, all global data centers, 2030 | ~945 TWh | reference |
| `metr_doubling` | METR task-horizon doubling time | ~7 months | reference |
| `train_flop_2026` | Largest frontier training run | ~1e26 FLOP | yes |
| `chip_capacity_2026` | Advanced packaging capacity | ~130K wafers/month | yes |
| `private_investment_2026` | Private AI investment | ~$400B/year | yes |
| `energy_2026` | AI electricity demand (AI only; separate from all-data-center electricity) | 260 TWh/year | yes |
| `token_cost_2026` | Blended token cost, illustrative API-equivalent reference price | $2.00 / 1M tokens | yes |
| `task_horizon_2026` | Frontier task horizon | ~50 minutes | yes |
| `open_weight_lag` | Open-weight lag behind the closed frontier | ~4 months | reference |

"Reference" anchors are displayed and used in card text but do not feed a formula directly; the matching sliders carry the model value. All anchors can be curated or overridden through JSON.

## Mathematical model

All major projections use growth that decelerates, saturates, or both. Bounded curves are still assumptions; a ceiling is not evidence that the ceiling itself is likely. The fixed constants below (mature growth rates, half-saturation horizon, floors, ceilings) are stored in the dataset under `model.constants` and can be changed by import.

### Compute stock and training compute

Compute stock and frontier training-run compute use a time-varying growth rate that decays from an initial annual multiplier toward a long-run multiplier:

$$
g_t = \ln(G_f) + [\ln(G_0) - \ln(G_f)] e^{-kt}
$$

$$
X_t = X_{t-1} \exp(g_t)
$$

where:

- $G_0$ is the initial annual growth multiplier
- $G_f$ is the long-run annual growth floor
- $k = \ln(2) / T_{1/2}$
- $T_{1/2}$ is the growth-rate half-life in years

This retains multiplicative growth while gradually reducing the initial rate as capital, power, manufacturing, data, and economic constraints become more relevant. For compute stock, $G_0$ is additionally boosted by an adjustable capex→compute coupling.

### Capex and private investment

Capex and private AI investment begin from their 2026 anchors. Their annual growth rates decay toward a mature-industry growth rate (default 9%/year), then output is bounded by a scenario-specific ceiling.

$$
r_t = r_{\infty} + (r_0 - r_{\infty}) e^{-\lambda t}
$$

$$
C_t = C_{t-1}(1+r_t)
$$

where $r_0$ is the initial annual growth rate, $r_{\infty}$ is the mature annual growth rate, and $\lambda$ controls the speed of deceleration.

### Bounded saturation

Metrics with assigned ceilings are transformed so they approach, rather than exceed, scenario ceilings. The intended properties are:

$$
f(x_0) = x_0
$$

$$
\lim_{x \to \infty} f(x) = C
$$

where $x_0$ is the known 2026 anchor and $C$ is the scenario ceiling.

Ceilings represent practical assumptions about capital, grid build-out, siting, manufacturing, supply chains, policy, data, and economic returns. They are not physical laws.

### Task-horizon capability

Task horizon is the human-expert time required for a task that an AI can reliably complete. It is not AI wall-clock runtime, uninterrupted autonomous uptime, or a measure of physical-world execution.

$$
H_t = H_{t-1} \times 2^{12/d_t}
$$

where $H_0$ is the `task_horizon_2026` anchor and $d_t$ is the number of months per doubling. The doubling time can drift over time to represent acceleration or deceleration (never below a minimum doubling time), and the resulting horizon is bounded by a long-run ceiling.

### Benchmark saturation

The benchmark panel maps task horizon to an illustrative, benchmark-like 0–100% score:

$$
B(H) = 100 \times \frac{H}{H + H_{50}}
$$

where $H_{50}$ is the half-saturation horizon (default 41 minutes): the task horizon at which the illustrative score reaches 50%.

This is not a forecast for any named benchmark, an intelligence metric, or a validated mapping from task length to economic value. It exists to display diminishing returns and benchmark saturation under the selected assumptions.

### Electricity demand

Electricity demand is derived from compute stock divided by an assumed annual improvement in compute-per-watt efficiency:

$$
E_t \propto \frac{C_t}{(1+e)^t}
$$

where $C_t$ is the compute-stock index and $e$ is annual efficiency improvement. The path starts at the `energy_2026` anchor, is bounded by an AI-electricity ceiling, and is displayed in TWh/year.

The model does not separately represent utilization, training/inference mix, regional grid constraints, transmission, construction delays, electricity prices, or data-center load factors.

### Water consumption

Water use is calculated from electricity demand and water-use intensity:

$$
W_t = E_t \times WUE_t
$$

where $E_t$ is measured in TWh/year and $WUE_t$ is measured in litres/kWh. The result is numerically expressed in **billion litres/year**, because one TWh equals one billion kWh.

Water-use intensity improves over time according to the selected water-efficiency assumption and is subject to a minimum value.

### Token economics

Token demand grows from a 2026 index of 1x and approaches a scenario-specific ceiling. Unit cost declines with assumed efficiency improvements:

$$
\text{CostIndex}_t = \frac{1}{(1+m\,e)^t}
$$

where $e$ is the perf-per-watt efficiency gain and $m$ is the adjustable "cost decline vs efficiency" multiplier (default 1.3). Multiplying the cost index by the `token_cost_2026` anchor gives the projected USD cost per 1M tokens shown in the tooltip.

The combined curve is a relative inference-spend index:

$$
\text{RelativeInferenceSpend}_t = \text{TokenDemandIndex}_t \times \text{UnitCostIndex}_t
$$

It is **not** a dollar forecast because the model does not include a measured, global 2026 token-volume baseline.

### Regional capex

The regional panel allocates total capex using editable U.S., China, and EU shares, each with its own drift per decade. Rest of world is the remainder:

$$
s_{RoW,t} = 1 - s_{US,t} - s_{CN,t} - s_{EU,t}
$$

Negative shares are prevented. If the named shares would exceed 100% combined, they are rescaled so all regional allocations reconcile to total capex.

### Open-weight lag

Open-weight frontier compute is represented as a lagged version of the closed-frontier training-compute trajectory. Lag is expressed in months and can widen or narrow through time.

This is a simplified accessibility-gap proxy. It does not model model quality, training data, licensing, distillation, alignment, inference efficiency, or product availability.

### Derived proxies

Some panels are intentionally derived from other model outputs rather than independently forecast:

- **Parallel task capacity** tracks compute stock under a fixed cost-per-task assumption
- **Inference efficiency / throughput per dollar** is the inverse of the unit token-cost index
- **Supervision burden** is calculated as residual review need:

$$
S_t = \max(100 - B_t, S_{floor})
$$

The supervision series is not a human-factors study. It intentionally excludes real-world approvals, experiments, physical-world latency, external feedback loops, legal accountability, governance, and sector-specific deployment restrictions.

## Data and curation

### One dataset

All built-in data is a JSON block inside `index.html` (`<script id="fai-default-data">`). The same schema (`schema_version: 2`) is used for the downloadable template, exports, imports, and the curated file.

| Section | Contents |
|---|---|
| `model` | anchor year, horizon length, model constants, outlook notice |
| `anchors` | sourced data points: value, unit, display format and text, source, source URL, observed date |
| `history_series` | the historical metrics that can be imported and which chart each extends |
| `historical` | sparse `{"year": value}` observations before the anchor year |
| `sliders` | range, step, label, tooltip, and display format for every slider |
| `scenarios` | Optimistic / Baseline / Pessimistic presets |
| `milestones` | task-horizon milestones and confidence bands |
| `tables` | hardware-limits and expert-forecast tables |
| `cards` | card titles, tooltips, and subtitles |
| `refresh_sources` | where the refresh button looks for curated data |
| `current_params` | slider values (exports only) |

Text fields accept tokens that stay in sync with the data: `{anchor_year}`, `{anchor_year+N}`, `{end_year}`, `{anchor:<id>}` (formatted anchor value), and `{param:<slider id>}` (live slider value).

### JSON import and export

- **Download template** gives the complete default dataset with example history.
- **Export current state** saves the full active dataset plus current slider values. Re-importing it reproduces the exact same curves.
- **Import** merges a file into the active data. Every section and key is optional; omitted keys keep their current value, objects merge, and arrays replace. Invalid values (non-numbers, negative anchors, unknown series, broken slider ranges) are skipped with a warning.
- **Restore built-in default data** discards every import and approved refresh. The built-in defaults themselves are never modified: changes are stored in browser local storage as a minimal patch on top of them.

Only historical values before 2026 (the anchor year) are used as history; later years in a file are ignored with a warning.

Supported historical fields:

```text
compute_relative
capex_usd_billion
energy_twh
benchmark_pct
horizon_minutes
token_relative
cost_relative
token_cost_usd_per_million
train_flop_relative
chip_capacity_kwafers
private_investment_usd_billion
capex_usd_billion_us
capex_usd_billion_china
capex_usd_billion_eu
water_billion_liters
```

Minimal example (any subset of the schema works):

```json
{
  "schema_version": 2,
  "anchors": {
    "capex_2026": { "value": 820, "source": "Epoch AI capex tracking", "observed_at": "2026-06-01" }
  },
  "historical": {
    "compute_relative": { "2022": 0.29, "2024": 0.62 },
    "energy_twh": { "2022": 70, "2024": 140 }
  },
  "scenarios": {
    "baseline": { "params": { "computeG": 3.3 } }
  }
}
```

Legacy files still import: `schema_version: 1` files with `anchors_override` / `scenario_params`, and plain arrays of metric rows (`[{ "id", "metric", "value", "unit", "source", "sourceUrl", "observedAt" }]`).

### Curated refresh

`data/curated_metrics.json` is a curated overlay in the same schema. The refresh button (⟳) reads it, lists every value that differs from the active data, and applies only the rows you approve. Unit mismatches start unchecked, and changes above 50% are flagged.

The refresh button needs the page to be served over http(s) — it works on GitHub Pages and on a local server, but not when `index.html` is opened directly from disk. Use **Import** in that case.

### Editing the built-in defaults

Edit the JSON block in `index.html`, then regenerate the template so both stay identical:

```bash
node tools/sync_template.mjs
```

## Features

- Optimistic, baseline, pessimistic, and custom scenarios
- Editable sliders for compute, capex, task horizon, token economics, energy, hardware, training compute, open-weight lag, packaging, investment, regional allocation, and water use
- Linked charts with optimistic, baseline, pessimistic, and custom curves
- Log-scaled panels for multiplicative trends
- Year-level hover tooltips on charts, including tap-and-drag on touch screens
- Adjustable chart display range
- Full-dataset JSON import, template download, state export, and one-click restore of built-in defaults
- Curated data refresh with per-change human review
- Historical observation overlays before 2026
- PNG export of the whole dashboard
- Draggable dashboard cards and persistent layout
- Collapsible cards
- Green, amber, and white CRT-inspired display modes
- Optional soft and strong scanline overlays
- Responsive layout for desktop, tablet, and phone
- In-browser operation with no build step or backend

The application persists imported/curated data, dashboard layout, collapsed cards, legend visibility, display theme, and scanline preference in browser local storage.

## Limitations

This is a scenario explorer, not a calibrated forecasting system. It omits or simplifies:

- Reliability distributions, tail risks, and correlated failure modes
- Training versus inference allocation of compute and power
- Data availability, data quality, and synthetic-data effects
- Memory bandwidth, networking, utilization, latency, and orchestration overhead
- Semiconductor yields, supply shocks, export controls, and vendor concentration
- Grid interconnection queues, permitting, construction schedules, power prices, and regional constraints
- Demand elasticity, model substitution, provider margins, and pricing strategy
- Physical experimentation, human feedback, workflow approvals, and external-world latency
- Governance, liability, IP, security, and sector-specific regulatory requirements
- The distinction between benchmark performance, autonomous execution, and economically useful work

Treat every output as an answer to: **“What would follow if these assumptions held?”** It is not an answer to: **“What will happen?”**

## Run locally

No build process, package manager, backend, or API key is required.

1. Clone or download the repository
2. Open `index.html` in a modern browser
3. Select a preset or move sliders to create a custom scenario
4. Use the import/export control to load historical data or save the active configuration

To use the curated refresh button locally, serve the folder over http instead (for example VS Code Live Server, or `python -m http.server`) and open `http://localhost:<port>/`.

## Project files

| File | Purpose |
|---|---|
| `index.html` | The application, including the built-in default dataset |
| `assumptions_graph.js` | Refresh pipeline: fetch sources → extract → diff → human review → apply |
| `data/curated_metrics.json` | Curated overlay read by the refresh button |
| `future_ai_import_template.json` | Full dataset template, generated from `index.html` |
| `tools/sync_template.mjs` | Regenerates the template after editing the defaults |

## Roadmap: live data

Refresh currently reads only the curated file in this repository. Live sources (for example Epoch AI's CSV datasets) are listed in `refresh_sources` but disabled, because browsers block cross-origin requests (CORS) to them. A browser-only app also cannot keep numbers current on its own: a local LLM's knowledge stops at its training cutoff, and API keys must not be shipped to the page.

The intended next step is a small companion service that:

1. researches each anchor with an LLM that has a web-search tool, returning figures with citations
2. keeps any API key server-side
3. writes results in this dataset schema, optionally on a schedule
4. is added to `refresh_sources` as a same-origin URL with `enabled: true`

The existing diff → human review → apply pipeline stays unchanged. A validation step that flags missing citations or implausible jumps before review would fit into `assumptions_graph.js`.

## License

Released under the repository's MIT License.
