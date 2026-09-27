/* assumptions_graph.js — curated-data refresh graph for the future_ai simulator.
 *
 * The graph is data-agnostic: sources come from the dataset's `refresh_sources`, and the host page
 * supplies normalize (payload -> dataset patch), merge, diff and onReview (human checkpoint).
 *
 *   fetch_sources -> extract_metrics -> diff_against_current -> human_review -> done
 *                                                           \-> done (no differences)
 *
 * Remote sources (e.g. Epoch CSVs) are usually blocked by browser CORS; keep them disabled in data or
 * point their url at a same-origin proxy / agent endpoint that returns the same payload shape.
 */

class AgentGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.conditional = new Map();
    this.entry = null;
    this.maxSteps = 20;
  }
  addNode(name, fn) { this.nodes.set(name, fn); return this; }
  setEntry(name) { this.entry = name; return this; }
  addEdge(from, to) { this.edges.set(from, to); return this; }
  addConditionalEdges(from, router, map) { this.conditional.set(from, { router, map }); return this; }
  async invoke(initialState, hooks = {}) {
    let state = { ...initialState };
    let node = this.entry;
    const trail = [];
    for (let step = 0; node && node !== "END"; step++) {
      if (step >= this.maxSteps) throw new Error("Graph exceeded its safety step limit");
      if (hooks.onNodeStart) await hooks.onNodeStart(node, state);
      const fn = this.nodes.get(node);
      if (!fn) throw new Error(`Unknown graph node: ${node}`);
      const update = await fn(state);
      state = { ...state, ...update };
      trail.push({ node, status: state.status, at: new Date().toISOString() });
      if (hooks.onNodeEnd) await hooks.onNodeEnd(node, state);
      const branch = this.conditional.get(node);
      node = branch ? branch.map[await branch.router(state)] : this.edges.get(node) || "END";
    }
    return { ...state, auditTrail: trail };
  }
}

function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { cache: "no-store", ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function fetchJson(url) {
  const response = await fetchWithTimeout(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

async function fetchText(url) {
  const response = await fetchWithTimeout(url, { headers: { Accept: "text/csv,text/plain,*/*" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.text();
}

function csvToRows(text) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const parseLine = line => {
    const out = []; let cell = ""; let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i], n = line[i + 1];
      if (c === '"' && quoted && n === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = !quoted;
      else if (c === "," && !quoted) { out.push(cell); cell = ""; }
      else cell += c;
    }
    out.push(cell);
    return out;
  };
  const headers = parseLine(lines[0]).map(x => x.trim());
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] || "").trim()]));
  });
}

const num = value => {
  const n = Number(String(value).replace(/,/g, "").replace(/[~$%]/g, ""));
  return Number.isFinite(n) ? n : null;
};

function firstField(rows, candidates) {
  const first = rows[0] || {};
  return candidates.find(key => Object.prototype.hasOwnProperty.call(first, key));
}

const today = () => new Date().toISOString().slice(0, 10);

/* Each source type: how to fetch it and how to turn the payload into something the host's normalize()
 * accepts (a dataset patch object, or an array of curated metric rows {id, metric, value, unit, ...}).
 * Epoch can revise column labels; the alias lists keep the parsers tolerant. */
const SOURCE_TYPES = {
  dataset_json: { fetch: fetchJson, parse: raw => raw },
  epoch_models_csv: {
    fetch: fetchText,
    parse: (text, source) => {
      const rows = csvToRows(text);
      const dateKey = firstField(rows, ["Publication date", "publication_date", "Date", "date"]);
      const computeKey = firstField(rows, ["Training compute (FLOP)", "training_compute", "Training compute", "training compute"]);
      if (!computeKey) throw new Error("no training-compute column found");
      const valid = rows.filter(row => num(row[computeKey]) !== null);
      valid.sort((a, b) => new Date(b[dateKey] || 0) - new Date(a[dateKey] || 0));
      const row = valid[0];
      return row ? [{
        id: "train_flop_2026", metric: "Frontier training-run compute",
        value: num(row[computeKey]), unit: "FLOP", source: "Epoch AI Models",
        sourceUrl: source.url, observedAt: row[dateKey] || today()
      }] : [];
    }
  },
  epoch_data_centers_csv: {
    fetch: fetchText,
    parse: (text, source) => {
      const rows = csvToRows(text);
      const powerKey = firstField(rows, ["IT power (MW)", "IT Power (MW)", "it_power_mw", "IT power"]);
      const computeKey = firstField(rows, ["Compute (H100-eq)", "H100 equivalents", "compute_h100_equivalents", "H100-equivalents"]);
      const sum = key => rows.reduce((s, row) => s + (num(row[key]) || 0), 0);
      const base = { source: "Epoch AI Data Centers", sourceUrl: source.url, observedAt: today() };
      return [
        powerKey && { id: "epoch_mapped_dc_power", metric: "Mapped AI data-center IT power", value: sum(powerKey), unit: "MW", ...base },
        computeKey && { id: "epoch_mapped_dc_compute", metric: "Mapped AI data-center compute", value: sum(computeKey), unit: "H100_equivalent", ...base }
      ].filter(Boolean);
    }
  }
};

function buildGraph(options) {
  const { normalize, merge, diff } = options;
  const graph = new AgentGraph();

  graph.addNode("fetch_sources", async () => {
    const sources = (options.sources || []).filter(s => s && s.enabled !== false && s.url && SOURCE_TYPES[s.type]);
    if (!sources.length) throw new Error("No enabled refresh_sources in the dataset");
    const settled = await Promise.all(sources.map(async source => {
      try { return { source, raw: await SOURCE_TYPES[source.type].fetch(source.url) }; }
      catch (error) { return { source, error: error.name === "TypeError" ? `${error.message} (network/CORS)` : error.message }; }
    }));
    return {
      fetched: settled.filter(x => !x.error).map(x => ({ id: x.source.id, type: x.source.type, raw: x.raw, source: x.source })),
      sourceErrors: settled.filter(x => x.error).map(x => ({ id: x.source.id, error: x.error })),
      status: "sources_fetched"
    };
  });

  graph.addNode("extract_metrics", async state => {
    const errors = [...state.sourceErrors];
    let patch = {};
    for (const item of state.fetched) {
      try { patch = merge(patch, normalize(SOURCE_TYPES[item.type].parse(item.raw, item.source))); }
      catch (error) { errors.push({ id: item.id, error: error.message }); }
    }
    return { extractedPatch: patch, sourceErrors: errors, status: "metrics_extracted" };
  });

  graph.addNode("diff_against_current", async state => ({
    diffs: diff(state.current, state.extractedPatch),
    status: "diffed"
  }));

  graph.addConditionalEdges("diff_against_current", state => state.diffs.length ? "review" : "done", { review: "human_review", done: "done" });

  graph.addNode("human_review", async state => ({
    approvedChanges: options.onReview ? await options.onReview(state.diffs, state) : [],
    status: "reviewed"
  }));
  graph.addNode("done", async state => ({ status: state.approvedChanges?.length ? "approved" : "no_changes" }));

  graph.setEntry("fetch_sources")
    .addEdge("fetch_sources", "extract_metrics")
    .addEdge("extract_metrics", "diff_against_current")
    .addEdge("human_review", "done")
    .addEdge("done", "END");

  return graph;
}

/* current: the active dataset. options: { sources, normalize, merge, diff, onReview, onNodeStart, onNodeEnd } */
export async function runAssumptionsRefresh(current, options = {}) {
  for (const fn of ["normalize", "merge", "diff"]) {
    if (typeof options[fn] !== "function") throw new Error(`runAssumptionsRefresh: options.${fn} is required`);
  }
  return buildGraph(options).invoke({
    current,
    fetched: [],
    sourceErrors: [],
    extractedPatch: {},
    diffs: [],
    approvedChanges: []
  }, {
    onNodeStart: options.onNodeStart,
    onNodeEnd: options.onNodeEnd
  });
}

export { AgentGraph, buildGraph, SOURCE_TYPES };

// Expose globally for the inline script; apiVersion lets the page detect a stale cached copy.
runAssumptionsRefresh.apiVersion = 2;
window.runAssumptionsRefresh = runAssumptionsRefresh;
