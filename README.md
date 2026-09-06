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

## Dashboard

| Panel | What it shows | Modeling status |
|---|---|---|
| Compute stock | Total AI computing capacity, indexed to 2026 = 1x | Scenario model |
| Frontier training-run compute | Compute used by the largest single frontier training run | Separate scenario model |
| AI chip packaging capacity | Advanced-packaging / CoWoS-class capacity, in thousand wafers/month | Scenario model |
| Hyperscaler capex | Annual AI-infrastructure capex and cumulative spend | Scenario model |
| Capex by region | Illustrative U.S., China, and rest-of-world allocation of total capex | Derived allocation |
| Private AI investment | Private capital invested into AI companies, distinct from capex | Scenario model |
| Task-horizon capability | Human-equivalent task length an AI can reliably complete | Scenario model |
| Benchmark saturation | Illustrative 0–100% capability proxy based on task horizon | Derived proxy |
| Open-weight vs. closed frontier | Open-weight training-compute path lagged behind the closed frontier | Derived proxy |
| Tokens vs. cost | Token-demand index, unit-cost index, and relative inference-cost index | Mixed scenario / derived model |
| Electricity demand | AI-compute electricity demand, in TWh/year | Derived from compute and efficiency |
| Data-center water use | Cooling-water use, in billion litres/year | Derived from energy and WUE |
| Parallel task capacity | Concurrent task capacity under a fixed per-task cost assumption | Direct compute proxy |
| Inference efficiency | Throughput-per-dollar proxy, derived from inverse token cost | Derived proxy |
| Supervision burden | Residual-review proxy derived from benchmark saturation | Derived proxy |

## Scenarios

The simulator provides three coherent presets plus an editable custom scenario.

| Scenario | Interpretation |
|---|---|
| **Optimistic** | Faster infrastructure growth, sustained scaling, stronger efficiency improvement, faster task-horizon gains, later node-scaling constraint, lower cooling-water intensity |
| **Baseline** | Current measured trends with decaying growth rates, moderate efficiency gains, and bounded infrastructure/economic ceilings |
| **Pessimistic** | Earlier constraints, slower scaling and investment, lower ceilings, slower task-horizon progress, and weaker water-efficiency gains |
| **Custom** | Any scenario created by moving one or more sliders; preset curves remain visible for comparison |

## Data anchors

The default 2026 values are calibration anchors, not precise forecasts. The application identifies the source families used for calibration, including Epoch AI, Stanford HAI AI Index, METR, IEA, and semiconductor-industry reporting.

| Anchor | Default value | Notes |
|---|---:|---|
| AI chip-stock compute growth | ~3.3–3.4x/year | Current measured growth-rate reference |
| Hyperscaler capex | ~$770B | Major-hyperscaler infrastructure spending anchor |
| AI electricity demand | 260 TWh/year | AI-compute calibration anchor; separate from all-data-center electricity |
| Blended token cost | $2.00 / 1M tokens | Illustrative blended API-equivalent reference price |
| Largest frontier training run | ~1e26 FLOP | Frontier training-compute anchor |
| Advanced packaging capacity | ~130K wafers/month | CoWoS-class / comparable advanced-packaging anchor |
| Private AI investment | ~$400B/year | Private capital into AI companies, separate from capex |

All anchors can be overridden in an imported JSON configuration.

## Mathematical model

All major projections use growth that decelerates, saturates, or both. Bounded curves are still assumptions; a ceiling is not evidence that the ceiling itself is likely.

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

This retains multiplicative growth while gradually reducing the initial rate as capital, power, manufacturing, data, and economic constraints become more relevant.

### Capex and private investment

Capex and private AI investment begin from their 2026 anchors. Their annual growth rates decay toward a mature-industry growth rate, then output is bounded by a scenario-specific ceiling.

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

where $d_t$ is the number of months per doubling. The doubling time can drift over time to represent acceleration or deceleration, and the resulting horizon is bounded by a long-run ceiling.

### Benchmark saturation

The benchmark panel maps task horizon to an illustrative, benchmark-like 0–100% score:

$$
B(H) = 100 \times \frac{H}{H + H_{50}}
$$

where $H_{50}$ is the half-saturation horizon: the task horizon at which the illustrative score reaches 50%.

This is not a forecast for any named benchmark, an intelligence metric, or a validated mapping from task length to economic value. It exists to display diminishing returns and benchmark saturation under the selected assumptions.

### Electricity demand

Electricity demand is derived from compute stock divided by an assumed annual improvement in compute-per-watt efficiency:

$$
E_t \propto \frac{C_t}{(1+e)^t}
$$

where $C_t$ is the compute-stock index and $e$ is annual efficiency improvement. The resulting energy path is bounded by an AI-electricity ceiling and displayed in TWh/year.

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
\text{CostIndex}_t = \frac{1}{(1+1.3e)^t}
$$

The combined curve is a relative inference-cost index:

$$
\text{RelativeInferenceCost}_t = \text{TokenDemandIndex}_t \times \text{UnitCostIndex}_t
$$

It is **not** a dollar forecast because the model does not include a measured, global 2026 token-volume baseline.

### Regional capex

The regional panel allocates total capex using editable U.S. and China shares. Rest of world is the remainder:

$$
s_{RoW,t} = 1 - s_{US,t} - s_{CN,t}
$$

Negative shares are prevented. If the U.S. and China shares would exceed 100% combined, they are rescaled so all regional allocations reconcile to total capex.

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

## JSON import and export

The simulator supports sparse historical data import and export in JSON. Imported pre-2026 observations extend the chart history; scenario parameters and anchors can be exported for reproducibility.

### Supported historical fields

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
water_billion_liters
```

### Example configuration

```json
{
  "schema_version": 1,
  "description": "Example AI Trajectory Simulator configuration",
  "anchors_override": {
    "capex_2026_usd_billion": 770,
    "energy_2026_twh": 260,
    "token_cost_usd_per_million": 2.0,
    "train_flop_2026": 1e26,
    "chip_capacity_kwafers_2026": 130,
    "private_investment_2026_usd_billion": 400
  },
  "historical": {
    "compute_relative": {
      "2022": 0.29,
      "2024": 0.62
    },
    "capex_usd_billion": {
      "2022": 180,
      "2024": 330
    },
    "energy_twh": {
      "2022": 70,
      "2024": 140
    }
  }
}
```

Exports include the active custom sliders, imported historical observations, and anchor overrides. The application also persists imported data, dashboard layout, collapsed cards, display theme, and scanline preference in browser local storage.

## Features

- Optimistic, baseline, pessimistic, and custom scenarios
- Editable sliders for compute, capex, task horizon, token economics, energy, hardware, training compute, open-weight lag, packaging, investment, regional allocation, and water use
- Linked charts with optimistic, baseline, pessimistic, and custom curves
- Log-scaled panels for multiplicative trends
- Year-level hover tooltips
- JSON data import, template download, and state export
- Historical observation overlays before 2026
- Draggable dashboard cards and persistent layout
- Collapsible cards
- Green, amber, and white CRT-inspired display modes
- Optional soft and strong scanline overlays
- In-browser operation with no build step or backend

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

No build process, package manager, server, backend, or API key is required.

1. Clone or download the repository
2. Open the simulator HTML file in a modern browser
3. Select a preset or move sliders to create a custom scenario
4. Use the import/export control to load historical data or save the active configuration

## License

Released under the repository's MIT License.
