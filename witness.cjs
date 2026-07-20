#!/usr/bin/env node
'use strict';

/*
 * vigilante.js - observabilidad del flujo autonomo de issues.
 * Cero dependencias de npm: solo fs/path/os/http del nucleo. Se corre con
 * `node vigilante.js`, nada que instalar.
 *
 * Lee los transcripts que Claude Code escribe en disco mientras los agentes
 * trabajan. No corre dentro del ciclo de vida de los agentes ni necesita que
 * ellos reporten nada: el harness ya escribe todo incrementalmente.
 *
 * Uso (sin flags — abre directo la pagina web con roster, log en vivo y
 * tabla por agente; Ctrl-C para salir):
 *
 *   node vigilante.js              puerto libre, elegido por el SO
 *   node vigilante.js 4321         puerto fijo (para tenerlo de bookmark)
 *
 * Los datos viven en <config-dir>/projects/<slug>/. El config dir se
 * autodetecta (recorriendo ~/.claude* y quedandose con el de actividad mas
 * reciente para este proyecto) y se imprime siempre en el encabezado —
 * CLAUDE_CONFIG_DIR solo existe dentro del proceso de Claude Code, asi que un
 * shell normal no la ve. VIGILANTE_CONFIG_DIR (variable de entorno) fuerza
 * uno puntual si la autodeteccion alguna vez elige mal.
 *
 * Notas:
 *   - Si el agente ya termino y Claude Code emitio un <task-notification>
 *     (evento que ya vive en el transcript raiz, sin costo de tokens), la
 *     pagina muestra su resumen en vez de solo la ultima tool. Esto NO cubre
 *     el polling explicito via TaskOutput (ese si consume un turno del
 *     agente que lo llama); solo la notificacion automatica.
 *   - El buscador de sesiones usa el titulo humano (evento ai-title) cuando
 *     existe.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

// --- Precios por millon de tokens -------------------------------------------
// Mismos valores que vigilante.sh. Editar aca cuando cambien. Multiplicadores
// de cache (fijos por diseno de la API): lectura 0.1x input, escritura 1.25x
// (TTL 5m) o 2x (1h).
function sonnetPrice() {
  const introEndsAt = Date.parse('2026-08-31T23:59:59Z');
  return Date.now() <= introEndsAt ? { i: 2.0, o: 10.0 } : { i: 3.0, o: 15.0 };
}

function price(model) {
  if (!model) return { i: 5, o: 25 };
  if (/fable|mythos/.test(model)) return { i: 10, o: 50 };
  if (/opus/.test(model)) return { i: 5, o: 25 };
  if (/sonnet/.test(model)) return sonnetPrice();
  if (/haiku/.test(model)) return { i: 1, o: 5 };
  return { i: 5, o: 25 };
}

function costUsd(model, inp, out, cRead, cw5, cw1) {
  const p = price(model);
  return (
    (inp * p.i + out * p.o + cRead * p.i * 0.1 + cw5 * p.i * 1.25 + cw1 * p.i * 2.0) /
    1_000_000
  );
}

// --- Utilidades basicas ------------------------------------------------------

function die(msg) {
  process.stderr.write(`vigilante: ${msg}\n`);
  process.exit(1);
}

function mtimeOf(p) {
  try {
    return fs.statSync(p).mtimeMs;
  } catch {
    return 0;
  }
}

function readJsonl(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }
  const out = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed));
    } catch {
      // linea parcial (escrita justo en este momento) o corrupta: se ignora
    }
  }
  return out;
}

function slugify(projectDir) {
  return projectDir.replace(/[^a-zA-Z0-9]/g, '-');
}

// --- Resolucion del config dir -----------------------------------------------
// No confiar en $CLAUDE_CONFIG_DIR a secas: la setea un alias dentro del
// proceso de Claude Code, asi que corriendo desde una terminal normal no
// existe. Se juntan candidatos (esa env var si esta seteada, mas todo
// ~/.claude*), se descartan los que no tengan este proyecto, y gana el de
// actividad mas reciente.
function listConfigCandidates(explicitOverride) {
  if (explicitOverride) return [explicitOverride];
  const home = os.homedir();
  const candidates = [];
  if (process.env.CLAUDE_CONFIG_DIR) candidates.push(process.env.CLAUDE_CONFIG_DIR);
  let entries = [];
  try {
    entries = fs.readdirSync(home);
  } catch {
    /* sin home legible: seguimos con lo que haya en CLAUDE_CONFIG_DIR */
  }
  for (const entry of entries) {
    if (!entry.startsWith('.claude')) continue;
    const full = path.join(home, entry);
    try {
      if (fs.statSync(full).isDirectory()) candidates.push(full);
    } catch {
      /* ignore */
    }
  }
  return [...new Set(candidates)];
}

function latestActivity(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return 0;
  }
  let newest = 0;
  for (const entry of entries) {
    if (!entry.endsWith('.jsonl')) continue;
    const m = mtimeOf(path.join(dir, entry));
    if (m > newest) newest = m;
  }
  return newest;
}

function resolveBase(projectDir, configOverride) {
  const slug = slugify(projectDir);
  const candidates = listConfigCandidates(configOverride);
  let best = null;
  let bestM = -1;
  const seen = [];
  for (const c of candidates) {
    const projectsDir = path.join(c, 'projects', slug);
    if (!fs.existsSync(projectsDir)) continue;
    seen.push(c);
    const m = latestActivity(projectsDir);
    if (m > bestM) {
      bestM = m;
      best = c;
    }
  }
  if (!best) {
    die(`no encontre transcripts de ${projectDir} (busque en $CLAUDE_CONFIG_DIR y $HOME/.claude*)`);
  }
  return { configDir: best, base: path.join(best, 'projects', slug), candidateCount: seen.length };
}

function banner(projectDir, configDir, candidateCount) {
  console.log(`  Proyecto: ${projectDir}`);
  if (candidateCount > 1) {
    console.log(`  Config:   ${configDir}  (${candidateCount} candidatos, gana el mas reciente)`);
  } else {
    console.log(`  Config:   ${configDir}`);
  }
}

// --- Sesiones -----------------------------------------------------------------

// Sesiones que tienen subagentes, de la mas reciente a la mas vieja.
function sessionsWithAgents(base) {
  let entries;
  try {
    entries = fs.readdirSync(base, { withFileTypes: true });
  } catch {
    return [];
  }
  const rows = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const subDir = path.join(base, entry.name, 'subagents');
    let subEntries;
    try {
      subEntries = fs.readdirSync(subDir);
    } catch {
      continue;
    }
    if (!subEntries.some((f) => f.endsWith('.meta.json'))) continue;
    rows.push({ id: entry.name, mtime: mtimeOf(subDir) });
  }
  rows.sort((a, b) => b.mtime - a.mtime);
  return rows;
}

// La sesion viva se detecta por el transcript RAIZ, no por el dir subagents:
// el raiz se escribe desde el primer mensaje, mientras que subagents/ no
// existe hasta el primer spawn y deja de moverse apenas termina el ultimo
// agente (desfases de mas de una hora medidos en el original bash). Elegir
// por subagents/ haria que una corrida recien arrancada mostrara la corrida
// ANTERIOR como si fuera la actual.
function latestActiveSession(base) {
  let entries;
  try {
    entries = fs.readdirSync(base);
  } catch {
    return null;
  }
  let best = null;
  let bestM = -1;
  for (const entry of entries) {
    if (!entry.endsWith('.jsonl')) continue;
    const m = mtimeOf(path.join(base, entry));
    if (m > bestM) {
      bestM = m;
      best = entry.slice(0, -'.jsonl'.length);
    }
  }
  return best;
}

function sessionHasAgents(base, id) {
  try {
    return fs.readdirSync(path.join(base, id, 'subagents')).some((f) => f.endsWith('.meta.json'));
  } catch {
    return false;
  }
}

// --- Metricas por agente ------------------------------------------------------

function ctxOf(usage) {
  return (
    (usage.input_tokens || 0) +
    (usage.cache_read_input_tokens || 0) +
    (usage.cache_creation_input_tokens || 0)
  );
}

function shortenModel(raw) {
  return raw ? raw.replace(/^claude-/, '') : '-';
}

function pickToolArg(input, maxLen = 70, projectDir = null) {
  const raw = input.skill
    ? input.args
      ? `${input.skill} ${input.args}`
      : input.skill
    : (input.file_path ?? input.pattern ?? input.command ?? input.description ?? '');
  let text = String(raw);
  if (projectDir) text = text.split(projectDir).join('.');
  return text.replace(/\s+/g, ' ').slice(0, maxLen);
}

// "4:59:22 AM" siempre, sin importar el locale del sistema/navegador — en
// espanol toLocaleTimeString() por default da "4:59:22 a. m.", mas largo y
// justo lo que desbordaba la columna de hora en --web.
function formatTime(ts) {
  if (!ts) return '--:--:--';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '--:--:--';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

// Todos los tool_use de un conjunto de lineas "assistant", con el timestamp
// del mensaje que los contiene (varios tool_use de un mismo turno comparten
// timestamp). Compartido entre analyseAgentTranscript (metricas) y
// extractToolActions (log en vivo de --web) para no repetir el recorrido.
function collectToolUses(assistantLines) {
  const items = [];
  for (const l of assistantLines) {
    const content = (l.message && l.message.content) || [];
    for (const block of content) {
      if (block && block.type === 'tool_use') items.push({ timestamp: l.timestamp, block });
    }
  }
  return items;
}

// Lista ordenada de TODAS las acciones (tool_use) de un transcript de
// subagente, sin recortar tanto como la tabla de --report (pensado para un
// log, no una tabla con columnas fijas).
function extractToolActions(transcriptPath, maxLen = 300, projectDir = null) {
  const assistantLines = readJsonl(transcriptPath).filter((l) => l.type === 'assistant');
  return collectToolUses(assistantLines).map(({ timestamp, block }) => ({
    timestamp,
    name: block.name || '?',
    arg: pickToolArg(block.input || {}, maxLen, projectDir),
  }));
}

// Replica JQ_AGENT de vigilante.sh: deriva metricas de UN transcript de
// subagente (no toca a sus hijos). Turnos != tool calls: un turno es un
// mensaje del modelo (puede no usar tools, o usar varias); es la unidad de
// costo porque cada uno re-lee todo el contexto acumulado.
function analyseAgentTranscript(transcriptPath, projectDir = null) {
  const lines = readJsonl(transcriptPath);
  const assistantLines = lines.filter((l) => l.type === 'assistant');
  const usages = assistantLines.map((l) => (l.message && l.message.usage) || {});
  const allTimestamps = lines.map((l) => l.timestamp).filter(Boolean);

  let model = null;
  for (const l of assistantLines) {
    if (l.message && l.message.model) model = l.message.model;
  }

  let inp = 0;
  let out = 0;
  let cRead = 0;
  let cw5 = 0;
  let cw1 = 0;
  for (const u of usages) {
    inp += u.input_tokens || 0;
    out += u.output_tokens || 0;
    cRead += u.cache_read_input_tokens || 0;
    if (u.cache_creation) {
      cw5 += u.cache_creation.ephemeral_5m_input_tokens || 0;
      cw1 += u.cache_creation.ephemeral_1h_input_tokens || 0;
    } else {
      // Sin desglose por TTL: se imputa todo a 5m (el multiplicador menor).
      cw5 += u.cache_creation_input_tokens || 0;
    }
  }

  const tools = collectToolUses(assistantLines).map((t) => t.block);
  const lastToolBlock = tools[tools.length - 1];
  const lastTool = lastToolBlock ? `${lastToolBlock.name}(${pickToolArg(lastToolBlock.input || {}, 70, projectDir)})` : null;

  let trChars = 0;
  for (const l of lines) {
    if (l.type !== 'user') continue;
    const content = (l.message && l.message.content) || [];
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block && typeof block === 'object' && block.type === 'tool_result') {
        try {
          trChars += JSON.stringify(block.content).length;
        } catch {
          /* ignore */
        }
      }
    }
  }
  const trTok = Math.floor(trChars / 4);
  const ownPct = out + trTok > 0 ? Math.round((100 * out) / (out + trTok)) : 0;

  const ctx0 = usages.length ? ctxOf(usages[0]) : 0;
  const ctxN = usages.length ? ctxOf(usages[usages.length - 1]) : 0;

  let elapsed = 0;
  if (allTimestamps.length > 0) {
    const first = Date.parse(allTimestamps[0]);
    const last = Date.parse(allTimestamps[allTimestamps.length - 1]);
    if (!Number.isNaN(first) && !Number.isNaN(last)) elapsed = Math.round((last - first) / 1000);
  }

  return {
    model: shortenModel(model),
    start: allTimestamps.length ? allTimestamps[0] : null,
    elapsed,
    in: inp,
    out,
    cRead,
    cWrite: cw5 + cw1,
    toolCalls: tools.length,
    lastTool,
    cost: costUsd(model, inp, out, cRead, cw5, cw1),
    turns: assistantLines.length,
    ctx0,
    ctxN,
    ownPct,
    trTok,
  };
}

function collectAgentRows(base, sessionId, projectDir = null) {
  const dir = path.join(base, sessionId, 'subagents');
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const rows = [];
  for (const file of files) {
    if (!file.endsWith('.jsonl')) continue;
    const agentId = file.slice('agent-'.length, -'.jsonl'.length);
    const metaPath = path.join(dir, `agent-${agentId}.meta.json`);
    if (!fs.existsSync(metaPath)) continue;
    let meta = {};
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    } catch {
      /* meta corrupto: seguimos con valores por defecto */
    }
    const metrics = analyseAgentTranscript(path.join(dir, file), projectDir);
    rows.push({
      role: meta.agentType || '?',
      depth: meta.spawnDepth || 1,
      agentId,
      toolUseId: meta.toolUseId || null,
      ...metrics,
    });
  }
  return rows;
}

// --- Extras sobre el bash original -------------------------------------------
// Estos datos ya viven en el transcript RAIZ (no hay que abrir el transcript
// del subagente, que puede ser enorme, para saber si termino y que dijo).

function extractTagContent(xmlLike, tag) {
  const m = xmlLike.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].trim() : null;
}

// Map<agentId, {status, summary, result}> a partir de los <task-notification>
// que Claude Code encola en el transcript raiz cuando un agente en background
// termina. NO cubre el polling explicito via TaskOutput (ese consume un turno
// de quien lo llama); solo la notificacion automatica y gratuita.
function collectNotifications(base, sessionId) {
  const map = new Map();
  for (const l of readJsonl(path.join(base, `${sessionId}.jsonl`))) {
    if (l.type !== 'queue-operation' || l.operation !== 'enqueue') continue;
    const content = l.content || '';
    if (!content.includes('<task-notification>')) continue;
    const taskId = extractTagContent(content, 'task-id');
    if (!taskId) continue;
    map.set(taskId, {
      status: extractTagContent(content, 'status'),
      summary: extractTagContent(content, 'summary'),
      result: extractTagContent(content, 'result'),
    });
  }
  return map;
}

function collectSessionMeta(base, sessionId) {
  let title = null;
  const prLinks = [];
  for (const l of readJsonl(path.join(base, `${sessionId}.jsonl`))) {
    if (l.type === 'ai-title' && l.aiTitle) title = l.aiTitle;
    if (l.type === 'pr-link' && l.prUrl && !prLinks.some((p) => p.prUrl === l.prUrl)) {
      prLinks.push({ prNumber: l.prNumber, prUrl: l.prUrl });
    }
  }
  return { title, prLinks };
}

// --- Pagina web ("--web"): roster + log en vivo, con CSS de verdad --------
// Una sola pagina, sin build, sin dependencias — polling a /api/state cada
// 1.5s. Reusa exactamente el mismo parseo que --report; el servidor solo
// serializa a JSON en vez de imprimir con ANSI.

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderWebHtml(projectDir, configDir, candidateCount) {
  const configLine =
    candidateCount > 1
      ? `${escapeHtml(configDir)}  (${candidateCount} candidatos, gana el mas reciente)`
      : escapeHtml(configDir);
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>vigilante</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; height: 100%;
    background: #0d1117; color: #c9d1d9;
    font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }
  body { display: flex; flex-direction: column; }
  header {
    flex: 0 0 auto;
    padding: 14px 18px;
    border-bottom: 1px solid #21262d;
    background: #10151c;
  }
  .session-search { position: relative; margin-bottom: 12px; }
  .session-search input {
    width: 100%; max-width: 480px; padding: 6px 10px;
    background: #0d1117; border: 1px solid #30363d; border-radius: 6px;
    color: #c9d1d9; font: inherit; font-size: 12px;
  }
  .session-search input:focus { outline: none; border-color: #58a6ff; }
  .session-results {
    display: none; position: absolute; top: calc(100% + 4px); left: 0;
    width: 100%; max-width: 480px; max-height: 280px; overflow-y: auto;
    background: #161b22; border: 1px solid #30363d; border-radius: 6px;
    z-index: 10; box-shadow: 0 8px 24px rgba(0,0,0,.4);
  }
  .session-results.open { display: block; }
  .session-result { padding: 7px 10px; cursor: pointer; font-size: 12px; border-bottom: 1px solid #21262d; }
  .session-result:last-child { border-bottom: none; }
  .session-result:hover { background: #1c2129; }
  .session-result.live { color: #3fb950; font-weight: 600; }
  .session-result .sid { color: #58a6ff; font-weight: 600; margin-right: 6px; }
  .session-result .stitle { color: #c9d1d9; }
  .session-result .smeta { display: block; color: #6e7681; font-size: 11px; margin-top: 1px; }
  header h1 {
    margin: 0 0 6px; font-size: 14px; font-weight: 600; color: #8b949e;
    letter-spacing: .02em;
  }
  header .meta-line { font-size: 12px; color: #6e7681; }
  header .session { font-size: 12px; color: #6e7681; margin: 4px 0 10px; }
  header .session b { color: #c9d1d9; font-weight: 500; }
  .roster { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip {
    display: flex; align-items: center; gap: 6px;
    padding: 5px 10px; border-radius: 999px;
    background: #161b22; border: 1px solid #30363d;
    font-size: 12px; transition: border-color .2s, background .2s, box-shadow .2s;
    cursor: pointer; user-select: none;
  }
  .chip.active { border-color: var(--c); background: color-mix(in srgb, var(--c) 12%, #161b22); }
  .chip.selected { box-shadow: 0 0 0 2px var(--c); }
  .chip .dot {
    width: 7px; height: 7px; border-radius: 50%; background: #30363d; flex: 0 0 auto;
  }
  .chip.active .dot { background: var(--c); box-shadow: 0 0 6px var(--c); animation: pulse 1.4s ease-in-out infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .45; } }
  .chip .role { font-weight: 600; color: var(--c); }
  .chip .meta { color: #6e7681; }
  main {
    flex: 1 1 auto; overflow-y: auto; padding: 10px 18px 24px;
    scroll-behavior: smooth;
  }
  .row {
    display: grid; grid-template-columns: 100px 16px 170px 1fr;
    gap: 10px; align-items: baseline;
    padding: 2px 0; animation: fadein .25s ease-out;
  }
  @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
  .row .time { color: #6e7681; white-space: nowrap; }
  .row .bar { border-left: 3px solid var(--c); height: 1.1em; align-self: center; }
  .row .role { color: var(--c); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .row .role.nested::before { content: '↳ '; color: #6e7681; }
  .row .content {
    min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
    cursor: default;
  }
  .row .tool { color: var(--tc, #8b949e); font-weight: 600; }
  .row .arg { color: #6e7681; }
  .empty { color: #6e7681; padding: 20px 0; }
  footer {
    flex: 0 0 auto; max-height: 220px; overflow-y: auto;
    border-top: 1px solid #21262d; background: #10151c;
  }
  footer table { width: 100%; border-collapse: collapse; font-size: 12px; }
  footer th, footer td { padding: 5px 14px; text-align: left; white-space: nowrap; }
  footer th.num, footer td.num { text-align: right; }
  footer th {
    color: #6e7681; font-weight: 600; letter-spacing: .02em;
    border-bottom: 1px solid #21262d; position: sticky; top: 0; background: #10151c;
  }
  footer td.role { font-weight: 600; }
  footer tr.nested td.role::before { content: '↳ '; color: #6e7681; font-weight: 400; }
</style>
</head>
<body>
  <header>
    <div class="session-search">
      <input type="text" id="session-search-input" placeholder="Buscar sesion (id o titulo)..." autocomplete="off">
      <div class="session-results" id="session-results"></div>
    </div>
    <h1>vigilante</h1>
    <div class="meta-line">Proyecto: ${escapeHtml(projectDir)}</div>
    <div class="meta-line">Config:   ${configLine}</div>
    <div class="session" id="session">esperando sesion...</div>
    <div class="roster" id="roster"></div>
  </header>
  <main id="log"><div class="empty">esperando acciones...</div></main>
  <footer>
    <table>
      <thead>
        <tr>
          <th>ROL</th><th class="num">TURNOS</th><th class="num">TOOLS</th>
          <th class="num">TOKENS ESCRITOS</th><th class="num">TOKENS LEIDOS</th>
          <th class="num">CACHE READS</th><th class="num">CACHE WRITES</th>
        </tr>
      </thead>
      <tbody id="agents-body"></tbody>
    </table>
  </footer>
<script>
const TOOL_COLORS = {
  Read: '#58a6ff', Glob: '#58a6ff', Grep: '#58a6ff', ToolSearch: '#58a6ff',
  Write: '#3fb950', Edit: '#3fb950', NotebookEdit: '#3fb950',
  Bash: '#d29922', Agent: '#bc8cff', WebFetch: '#79c0ff', WebSearch: '#79c0ff',
};
function hashHue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % 360;
}
function agentColor(agentId) { return 'hsl(' + hashHue(agentId) + ', 65%, 60%)'; }
function fmtDur(s) {
  s = s || 0;
  if (s >= 3600) return Math.floor(s/3600) + 'h' + String(Math.floor((s%3600)/60)).padStart(2,'0') + 'm';
  if (s >= 60) return Math.floor(s/60) + 'm' + String(s%60).padStart(2,'0') + 's';
  return s + 's';
}
function fmtTok(n) {
  n = n || 0;
  if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n/1000).toFixed(1) + 'k';
  return String(n);
}
// Formato fijo "4:59:22 AM": toLocaleTimeString() sin locale explicito usa el
// del navegador, y en espanol da "4:59:22 a. m." — mas largo, desbordaba la
// columna y forzaba el wrap a dos lineas.
function fmtTime(ts) {
  if (!ts) return '--:--:--';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '--:--:--';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let currentSessionId = null;
let pinnedSessionId = null; // null = seguir la sesion activa automaticamente
let renderedCount = 0;
let filterRole = null; // null = sin filtro; si no, solo se ve ese rol en el log

function toggleFilter(role) {
  filterRole = filterRole === role ? null : role;
  document.querySelectorAll('#roster .chip').forEach((chip) => {
    chip.classList.toggle('selected', chip.dataset.role === filterRole);
  });
  document.querySelectorAll('#log .row').forEach((row) => {
    row.style.display = !filterRole || row.dataset.role === filterRole ? '' : 'none';
  });
}

function renderRoster(roster) {
  const el = document.getElementById('roster');
  el.innerHTML = '';
  for (const info of roster) {
    const chip = document.createElement('div');
    chip.className = 'chip' + (info.active ? ' active' : '') + (info.role === filterRole ? ' selected' : '');
    chip.dataset.role = info.role;
    chip.style.setProperty('--c', agentColor(info.role));
    chip.innerHTML = '<span class="dot"></span><span class="role">' + esc(info.role) +
      '</span><span class="meta">[' + info.count + 'x] (' + fmtDur(info.totalElapsed) + ')</span>';
    chip.onclick = () => toggleFilter(info.role);
    el.appendChild(chip);
  }
}

function renderNewActions(actions) {
  const log = document.getElementById('log');
  if (renderedCount === 0) log.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (let i = renderedCount; i < actions.length; i++) {
    const a = actions[i];
    const color = agentColor(a.agentId);
    const row = document.createElement('div');
    row.className = 'row';
    row.dataset.role = a.role;
    if (filterRole && a.role !== filterRole) row.style.display = 'none';
    row.innerHTML =
      '<span class="time">' + fmtTime(a.timestamp) + '</span>' +
      '<span class="bar" style="--c:' + color + '"></span>' +
      '<span class="role' + (a.depth === 2 ? ' nested' : '') + '" style="--c:' + color + '">' + esc(a.role) + '</span>' +
      '<span class="content" title="' + esc(a.name + '(' + a.arg + ')') + '">' +
      '<span class="tool" style="--tc:' + (TOOL_COLORS[a.name] || '#8b949e') + '">' + esc(a.name) + '</span>' +
      '(<span class="arg">' + esc(a.arg) + '</span>)</span>';
    frag.appendChild(row);
  }
  log.appendChild(frag);
  renderedCount = actions.length;
  const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 120;
  if (nearBottom) log.scrollTop = log.scrollHeight;
}

function renderAgentsTable(agents) {
  const tbody = document.getElementById('agents-body');
  tbody.innerHTML = '';
  for (const a of agents) {
    const tr = document.createElement('tr');
    if (a.depth === 2) tr.className = 'nested';
    const roleLabel = a.count > 1 ? a.role + ' [' + a.count + 'x]' : a.role;
    tr.innerHTML =
      '<td class="role">' + esc(roleLabel) + '</td>' +
      '<td class="num">' + a.turns + '</td>' +
      '<td class="num">' + a.toolCalls + '</td>' +
      '<td class="num">' + fmtTok(a.written) + '</td>' +
      '<td class="num">' + fmtTok(a.read) + '</td>' +
      '<td class="num">' + fmtTok(a.cacheReads) + '</td>' +
      '<td class="num">' + fmtTok(a.cacheWrites) + '</td>';
    tbody.appendChild(tr);
  }
}

// --- Buscador de sesiones -----------------------------------------------
let allSessions = [];

async function loadSessions() {
  try {
    const res = await fetch('/api/sessions');
    allSessions = await res.json();
    renderSessionResults(document.getElementById('session-search-input').value);
  } catch (e) {
    /* si falla, el buscador simplemente queda con la ultima lista conocida */
  }
}

function renderSessionResults(query) {
  const box = document.getElementById('session-results');
  const q = (query || '').toLowerCase();
  const matches = allSessions
    .filter((s) => !q || s.id.toLowerCase().includes(q) || (s.title || '').toLowerCase().includes(q))
    .slice(0, 25);

  box.innerHTML = '';
  const live = document.createElement('div');
  live.className = 'session-result live';
  live.textContent = '● Seguir la sesion activa';
  live.onclick = () => selectSession(null);
  box.appendChild(live);

  for (const s of matches) {
    const el = document.createElement('div');
    el.className = 'session-result';
    const start = s.start ? new Date(s.start).toLocaleString('en-US') : '-';
    el.innerHTML =
      '<span class="sid">' + esc(s.id.slice(0, 8)) + '</span>' +
      '<span class="stitle">' + esc(s.title || s.id) + '</span>' +
      '<span class="smeta">' + start + ' &middot; ' + s.count + ' agentes &middot; ' + esc(s.roles) + '</span>';
    el.onclick = () => selectSession(s.id);
    box.appendChild(el);
  }
}

function selectSession(id) {
  pinnedSessionId = id;
  currentSessionId = null; // fuerza que poll() trate esto como sesion nueva
  renderedCount = 0;
  const input = document.getElementById('session-search-input');
  input.value = '';
  document.getElementById('session-results').classList.remove('open');
  input.blur();
}

document.getElementById('session-search-input').addEventListener('input', (e) => {
  renderSessionResults(e.target.value);
  document.getElementById('session-results').classList.add('open');
});
document.getElementById('session-search-input').addEventListener('focus', (e) => {
  renderSessionResults(e.target.value);
  document.getElementById('session-results').classList.add('open');
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.session-search')) document.getElementById('session-results').classList.remove('open');
});

loadSessions();
setInterval(loadSessions, 10000);

async function poll() {
  try {
    const url = pinnedSessionId ? '/api/state?sessionId=' + encodeURIComponent(pinnedSessionId) : '/api/state';
    const res = await fetch(url);
    const data = await res.json();
    if (data.sessionId !== currentSessionId) {
      document.getElementById('session').innerHTML = data.sessionId
        ? 'Sesion: <b>' + esc(data.sessionId) + '</b>' + (pinnedSessionId ? ' (fijada)' : '')
        : 'esperando actividad...';
      currentSessionId = data.sessionId;
      filterRole = null;
      renderedCount = 0;
    }
    renderRoster(data.roster);
    renderAgentsTable(data.agents);
    renderNewActions(data.actions);
  } catch (e) {
    document.getElementById('session').textContent = 'sin conexion con el servidor...';
  }
  setTimeout(poll, 1500);
}
poll();
</script>
</body>
</html>
`;
}


// Lista de sesiones con agentes (misma logica que --list) para el buscador
// de sesiones viejas en la pagina web.
function computeSessionList(base, projectDir) {
  const out = [];
  for (const { id: sess } of sessionsWithAgents(base)) {
    const rows = collectAgentRows(base, sess, projectDir);
    if (!rows.length) continue;
    const meta = collectSessionMeta(base, sess);
    const roleCounts = new Map();
    for (const r of rows) roleCounts.set(r.role, (roleCounts.get(r.role) || 0) + 1);
    const roles = [...roleCounts.entries()].map(([role, n]) => (n > 1 ? `${role} x${n}` : role)).join(', ');
    const starts = rows.map((r) => r.start).filter(Boolean).sort();
    out.push({
      id: sess,
      title: meta.title || null,
      start: starts.length ? starts[0] : null,
      count: rows.length,
      roles,
    });
  }
  return out;
}

function computeWebState(base, pinned, projectDir) {
  const sessionId = pinned || latestActiveSession(base);
  if (!sessionId || !sessionHasAgents(base, sessionId)) {
    return { sessionId: sessionId || null, roster: [], agents: [], actions: [] };
  }
  const dir = path.join(base, sessionId, 'subagents');
  const now = Date.now();
  const rows = collectAgentRows(base, sessionId, projectDir);
  const roleById = new Map(rows.map((r) => [r.agentId, { role: r.role, depth: r.depth }]));
  const notifications = collectNotifications(base, sessionId);

  const rosterMap = new Map();
  const agentMap = new Map();
  for (const row of rows) {
    const mt = mtimeOf(path.join(dir, `agent-${row.agentId}.jsonl`));
    const note = notifications.get(row.agentId);
    const isActive = !(note && note.status === 'completed') && now - mt < 20000;
    const isCompleted = Boolean(note && note.status === 'completed');

    const entry = rosterMap.get(row.role) || { role: row.role, count: 0, totalElapsed: 0, active: false };
    entry.count += 1;
    entry.totalElapsed += row.elapsed;
    entry.active = entry.active || isActive;
    rosterMap.set(row.role, entry);

    // Una fila por rol unico (no por instancia): suma turnos/tools/tiempo/
    // tokens de todas sus invocaciones. ACTIVO si alguna instancia lo esta;
    // HECHO solo si TODAS terminaron; si no, '-' (corriendo, sin notificacion
    // aun).
    const agentEntry = agentMap.get(row.role) || {
      role: row.role,
      depth: row.depth,
      model: row.model,
      count: 0,
      totalElapsed: 0,
      turns: 0,
      toolCalls: 0,
      written: 0,
      read: 0,
      cacheReads: 0,
      cacheWrites: 0,
      hasActive: false,
      allCompleted: true,
    };
    agentEntry.depth = Math.min(agentEntry.depth, row.depth);
    agentEntry.count += 1;
    agentEntry.totalElapsed += row.elapsed;
    agentEntry.turns += row.turns;
    agentEntry.toolCalls += row.toolCalls;
    agentEntry.written += row.out;
    agentEntry.read += row.in;
    agentEntry.cacheReads += row.cRead;
    agentEntry.cacheWrites += row.cWrite;
    agentEntry.hasActive = agentEntry.hasActive || isActive;
    agentEntry.allCompleted = agentEntry.allCompleted && isCompleted;
    agentMap.set(row.role, agentEntry);
  }
  const roster = [...rosterMap.values()].sort((a, b) => a.role.localeCompare(b.role));
  const agents = [...agentMap.values()]
    .map((e) => ({
      role: e.role,
      depth: e.depth,
      model: e.model,
      count: e.count,
      elapsed: e.totalElapsed,
      turns: e.turns,
      toolCalls: e.toolCalls,
      written: e.written,
      read: e.read,
      cacheReads: e.cacheReads,
      cacheWrites: e.cacheWrites,
      status: e.hasActive ? 'ACTIVO' : e.allCompleted ? 'HECHO' : '-',
    }))
    .sort((a, b) => a.depth - b.depth || a.role.localeCompare(b.role));

  let files = [];
  try {
    files = fs.readdirSync(dir);
  } catch {
    files = [];
  }
  const actions = [];
  for (const file of files) {
    if (!file.endsWith('.jsonl')) continue;
    const agentId = file.slice('agent-'.length, -'.jsonl'.length);
    const info = roleById.get(agentId) || { role: agentId, depth: 1 };
    for (const action of extractToolActions(path.join(dir, file), 300, projectDir)) {
      actions.push({ ...action, agentId, role: info.role, depth: info.depth });
    }
  }
  actions.sort((a, b) => (Date.parse(a.timestamp) || 0) - (Date.parse(b.timestamp) || 0));

  return { sessionId, roster, agents, actions };
}

function cmdWeb(projectDir, configDir, candidateCount, base, pinned, port) {
  const html = renderWebHtml(projectDir, configDir, candidateCount);
  const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }
    const parsedUrl = new URL(req.url, 'http://localhost');
    if (parsedUrl.pathname === '/api/state') {
      const requested = parsedUrl.searchParams.get('sessionId') || pinned;
      let body;
      try {
        body = JSON.stringify(computeWebState(base, requested, projectDir));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(body);
      return;
    }
    if (parsedUrl.pathname === '/api/sessions') {
      let body;
      try {
        body = JSON.stringify(computeSessionList(base, projectDir));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(body);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
  });

  server.listen(port || 0, '127.0.0.1', () => {
    const actualPort = server.address().port;
    console.log('  vigilante --web');
    console.log(`  Abri http://localhost:${actualPort} en tu navegador`);
    console.log('  (ctrl-c para salir)');
  });

  process.on('SIGINT', () => {
    server.close();
    process.exit(0);
  });
}

// --- CLI -----------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const port = args[0] ? parseInt(args[0], 10) : 0;
  if (args[0] && Number.isNaN(port)) die(`puerto invalido: ${args[0]}`);

  const projectDir = process.env.VIGILANTE_PROJECT || process.cwd();
  // Sin flags: el config dir se autodetecta solo. Si alguna vez hiciera
  // falta forzar uno puntual, VIGILANTE_CONFIG_DIR (variable de entorno, no
  // flag) sigue funcionando como escape hatch silencioso.
  const { configDir, base, candidateCount } = resolveBase(projectDir, process.env.VIGILANTE_CONFIG_DIR || null);
  cmdWeb(projectDir, configDir, candidateCount, base, null, port);
}

main();
