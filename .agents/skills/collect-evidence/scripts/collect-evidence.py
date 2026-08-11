#!/usr/bin/env python3
"""Collect the raw evidence for one Claude Code session into the repo.

Copies the root transcript and every subagent transcript out of the Claude
config dir (which is disposable) into `.claude/`, then derives the session
report from them.

Usage: python3 .claude/skills/collect-evidence/scripts/collect-evidence.py <session-id> [--config-dir DIR]

Outputs:
  .claude/transcripts/<id>.jsonl                  root transcript (verbatim)
  .claude/docs/sessions/<id>/raw/root.jsonl       same, alongside its subagents
  .claude/docs/sessions/<id>/raw/subagents/*      subagent transcripts + meta
  .claude/docs/sessions/<id>/report.json          derived report
  .claude/session-report/<id>.json                derived report (flat variant)
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import shutil
import sys
from collections import defaultdict

# Price per 1M tokens. Cache read is 0.1x input, cache write 1.25x (5m) / 2x (1h).
PRICING = {
    "opus-4-8": {"input": 5.0, "output": 25.0},
    "sonnet-5": {"input": 2.0, "output": 10.0},
    "haiku-4-5": {"input": 1.0, "output": 5.0},
    "fable-5": {"input": 2.0, "output": 10.0},
}
DEFAULT_PRICE = PRICING["sonnet-5"]


def short_model(raw: str) -> str:
    """claude-opus-4-8-20260115 -> opus-4-8"""
    if not raw:
        return "unknown"
    name = raw.replace("claude-", "")
    for known in PRICING:
        if name.startswith(known):
            return known
    return name


def cost_usd(model: str, inp: int, out: int, c_read: int, c_5m: int, c_1h: int) -> float:
    p = PRICING.get(model, DEFAULT_PRICE)
    return (
        inp * p["input"]
        + out * p["output"]
        + c_read * p["input"] * 0.1
        + c_5m * p["input"] * 1.25
        + c_1h * p["input"] * 2.0
    ) / 1_000_000


def result_text(block: dict) -> str:
    content = block.get("content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(i.get("text", "") for i in content if isinstance(i, dict))
    return ""


def analyse(path: str) -> dict | None:
    """Derive one agent's metrics from its transcript."""
    inp = out = c_read = c_5m = c_1h = 0
    turns = tool_calls = 0
    model = ""
    first_ts = last_ts = None
    ctx_first = ctx_last = 0
    last_tool = None
    comp = defaultdict(int)

    for line in open(path, encoding="utf-8"):
        line = line.strip()
        if not line:
            continue
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue

        ts = entry.get("timestamp")
        if ts:
            first_ts = first_ts or ts
            last_ts = ts

        msg = entry.get("message") or {}
        role = msg.get("role")

        if role == "assistant":
            usage = msg.get("usage") or {}
            if usage:
                turns += 1
                model = model or short_model(msg.get("model", ""))
                creation = usage.get("cache_creation") or {}
                m5 = creation.get("ephemeral_5m_input_tokens", 0)
                m1 = creation.get("ephemeral_1h_input_tokens", 0)
                if not creation:
                    m5 = usage.get("cache_creation_input_tokens", 0)
                inp += usage.get("input_tokens", 0)
                out += usage.get("output_tokens", 0)
                c_read += usage.get("cache_read_input_tokens", 0)
                c_5m += m5
                c_1h += m1
                # Context = everything re-sent on this request; paid every turn.
                ctx = (
                    usage.get("input_tokens", 0)
                    + usage.get("cache_read_input_tokens", 0)
                    + m5
                    + m1
                )
                ctx_first = ctx_first or ctx
                ctx_last = ctx

            for block in msg.get("content") or []:
                if not isinstance(block, dict):
                    continue
                kind = block.get("type")
                if kind == "text":
                    comp["prose"] += len(block.get("text", ""))
                elif kind == "thinking":
                    comp["thinking"] += len(block.get("thinking", ""))
                elif kind == "tool_use":
                    tool_calls += 1
                    params = block.get("input") or {}
                    comp["toolUseParams"] += len(json.dumps(params))
                    arg = (
                        params.get("command")
                        or params.get("file_path")
                        or params.get("pattern")
                        or params.get("subagent_type")
                        or params.get("skill")
                        or ""
                    )
                    last_tool = {
                        "name": block.get("name", "?"),
                        "arg": " ".join(str(arg).split())[:70],
                    }

        elif role == "user":
            for block in msg.get("content") or []:
                if isinstance(block, str):
                    comp["injected"] += len(block)
                elif isinstance(block, dict):
                    if block.get("type") == "tool_result":
                        comp["toolResults"] += len(result_text(block))
                    elif block.get("type") == "text":
                        comp["injected"] += len(block.get("text", ""))

    if not turns:
        return None

    total_chars = sum(comp.values()) or 1
    elapsed = 0
    if first_ts and last_ts:
        from datetime import datetime

        def parse(t: str) -> datetime:
            return datetime.fromisoformat(t.replace("Z", "+00:00"))

        elapsed = round((parse(last_ts) - parse(first_ts)).total_seconds())

    return {
        "model": model or "unknown",
        "startedAt": first_ts,
        "elapsedSeconds": elapsed,
        "tokens": {
            "input": inp,
            "output": out,
            "cacheRead": c_read,
            "cacheWrite": c_5m + c_1h,
            "cacheWrite5m": c_5m,
            "cacheWrite1h": c_1h,
        },
        "toolCalls": tool_calls,
        "lastTool": last_tool,
        "costUsd": round(cost_usd(model, inp, out, c_read, c_5m, c_1h), 4),
        "turns": turns,
        "context": {
            "first": ctx_first,
            "last": ctx_last,
            "toolResultTokensApprox": comp["toolResults"] // 4,
        },
        # Share of the agent's own written output that is prose, i.e. narration.
        # NOT the same as the old `ownContentPct`, which silently lumped prose
        # together with tool_use arguments and read ~10x too high.
        "composition": {
            "prosePct": round(100 * comp["prose"] / total_chars),
            "toolUseParamsPct": round(100 * comp["toolUseParams"] / total_chars),
            "toolResultsPct": round(100 * comp["toolResults"] / total_chars),
            "injectedPct": round(100 * comp["injected"] / total_chars),
            "thinkingPct": round(100 * comp["thinking"] / total_chars),
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("session_id")
    ap.add_argument("--config-dir", default=None)
    args = ap.parse_args()
    sid = args.session_id

    repo = os.path.realpath(
        os.path.join(os.path.dirname(os.path.realpath(__file__)), "..", "..", "..", "..")
    )
    slug = "-" + repo.strip("/").replace("/", "-")

    # The config dir is set by an alias, so it is absent from a plain shell.
    # Autodetect and always print the choice: ~/.claude is stale on this box.
    candidates = (
        [args.config_dir]
        if args.config_dir
        else sorted(glob.glob(os.path.expanduser("~/.claude*")))
    )
    src_dir = None
    for cand in candidates:
        probe = os.path.join(cand, "projects", slug, f"{sid}.jsonl")
        if os.path.exists(probe):
            src_dir = cand
            break
    if not src_dir:
        print(f"ERROR: no transcript for session {sid} in: {', '.join(candidates)}", file=sys.stderr)
        print(f"       looked for projects/{slug}/{sid}.jsonl", file=sys.stderr)
        return 1

    print(f"config dir : {src_dir}")
    print(f"project    : {repo}")
    print(f"session    : {sid}")

    src_root = os.path.join(src_dir, "projects", slug, f"{sid}.jsonl")
    src_subs = os.path.join(src_dir, "projects", slug, sid, "subagents")

    out_session = os.path.join(repo, ".claude", "docs", "sessions", sid)
    out_raw_subs = os.path.join(out_session, "raw", "subagents")
    os.makedirs(out_raw_subs, exist_ok=True)
    os.makedirs(os.path.join(repo, ".claude", "transcripts"), exist_ok=True)
    os.makedirs(os.path.join(repo, ".claude", "session-report"), exist_ok=True)

    shutil.copy2(src_root, os.path.join(repo, ".claude", "transcripts", f"{sid}.jsonl"))
    shutil.copy2(src_root, os.path.join(out_session, "raw", "root.jsonl"))

    agents = []
    for meta_path in sorted(glob.glob(os.path.join(src_subs, "*.meta.json"))):
        tr_path = meta_path.replace(".meta.json", ".jsonl")
        if not os.path.exists(tr_path):
            continue
        shutil.copy2(meta_path, out_raw_subs)
        shutil.copy2(tr_path, out_raw_subs)

        meta = json.load(open(meta_path, encoding="utf-8"))
        metrics = analyse(tr_path)
        if not metrics:
            continue
        agent_id = os.path.basename(tr_path)[len("agent-") : -len(".jsonl")]
        agents.append(
            {
                "role": meta.get("agentType", "unknown"),
                "depth": meta.get("spawnDepth", 1),
                "agentId": agent_id,
                "toolUseId": meta.get("toolUseId"),
                **metrics,
                "parentAgentId": meta.get("parentAgentId", "ROOT"),
            }
        )

    agents.sort(key=lambda a: (a["depth"], a["startedAt"] or ""))

    from datetime import datetime, timezone

    generated = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    totals = {
        "agentCount": len(agents),
        "turns": sum(a["turns"] for a in agents),
        "outputTokens": sum(a["tokens"]["output"] for a in agents),
        "cacheTokens": sum(a["tokens"]["cacheRead"] + a["tokens"]["cacheWrite"] for a in agents),
        "costUsd": round(sum(a["costUsd"] for a in agents), 4),
    }

    report = {
        "session": sid,
        "project": repo,
        "generatedAt": generated,
        "agents": agents,
        "totals": totals,
    }
    with open(os.path.join(out_session, "report.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2)
        fh.write("\n")

    flat = {
        "sessionId": sid,
        "project": repo,
        "configDir": src_dir,
        "generatedAt": generated,
        "agents": [
            {
                "role": a["role"],
                "depth": a["depth"],
                "agentId": a["agentId"],
                "toolUseId": a["toolUseId"],
                "model": a["model"],
                "start": a["startedAt"],
                "elapsedSeconds": a["elapsedSeconds"],
                "inputTokens": a["tokens"]["input"],
                "outputTokens": a["tokens"]["output"],
                "cacheReadTokens": a["tokens"]["cacheRead"],
                "cacheWriteTokens": a["tokens"]["cacheWrite"],
                "toolCalls": a["toolCalls"],
                "lastTool": f"{a['lastTool']['name']}({a['lastTool']['arg']})" if a["lastTool"] else None,
                "costUsd": a["costUsd"],
                "turns": a["turns"],
                "contextStart": a["context"]["first"],
                "contextEnd": a["context"]["last"],
                "toolResultTokensApprox": a["context"]["toolResultTokensApprox"],
                "composition": a["composition"],
                "parent": a["parentAgentId"],
            }
            for a in agents
        ],
        "totals": totals,
        "notes": {
            "context": "tokens del request al primer turno -> al ultimo; se paga entero en cada turno, driver del costo",
            "composition": "% de chars del contexto por origen. prosePct es SOLO texto narrado por el agente; el viejo ownContentPct sumaba prosa + argumentos de tool_use y leia ~10x alto (ver .claude/docs/who-killed-the-tokens.md, hallazgo 1)",
            "cache": "lectura 0.1x input, escritura 1.25x (5m) o 2x (1h)",
        },
    }
    with open(os.path.join(repo, ".claude", "session-report", f"{sid}.json"), "w", encoding="utf-8") as fh:
        json.dump(flat, fh, indent=2)
        fh.write("\n")

    print(f"\nagents     : {len(agents)}")
    for a in agents:
        print(
            f"  {'  ' * (a['depth'] - 1)}{a['role']:<14} {a['model']:<10} "
            f"${a['costUsd']:>7.3f}  turns={a['turns']:<4} prose={a['composition']['prosePct']}%"
        )
    print(f"\ntotal cost : ${totals['costUsd']}")
    print(f"written    : .claude/transcripts/{sid}.jsonl")
    print(f"             .claude/docs/sessions/{sid}/")
    print(f"             .claude/session-report/{sid}.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
