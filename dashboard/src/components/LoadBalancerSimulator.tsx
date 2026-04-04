import { useEffect, useRef, useState, useCallback } from "react";

interface Backend {
  addr: string;
  alive: boolean;
  conn: number;
  req: number;
  latency_ms: number;
}

interface MetricsFrame {
  connections: number;
  bytes_in: number;
  bytes_out: number;
  rps: number;
  algorithm: string;
  backends: Backend[];
}

interface Packet {
  id: number;
  srvIdx: number;
  color: string;
  phase: "to_lb" | "to_srv" | "back";
  progress: number;
  speed: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  size: number;
  alpha: number;
  slow: boolean;
}

interface LogEntry {
  time: string;
  msg: string;
  type: "ok" | "err" | "warn" | "info";
}

type Scenario = "normal" | "crash" | "overload" | "rr_uneven" | "recovery" | "burst";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

const ALGO_LABELS: Record<string, string> = {
  round_robin: "Round Robin",
  weighted: "Weighted",
  least_conn: "Least Connections",
  random: "Random",
};

interface ScenarioMeta {
  label: string;
  mood: "info" | "warn" | "danger" | "success";
  title: string;
  what: string;
  why: string;
  algo: string;
  algoReason: string;
}

const SCENARIO_META: Record<Scenario, ScenarioMeta> = {
  normal: {
    label: "Normal traffic",
    mood: "info",
    title: "Round Robin is active — equal distribution in action",
    what: "All 3 servers are healthy. Every incoming TCP request is assigned to the next server in sequence: SRV 1 → SRV 2 → SRV 3 → SRV 1 → ...",
    why: "Round Robin works best when all servers have equal capacity and similar response times. Each server gets exactly 33% of traffic — no server is overloaded.",
    algo: "Round Robin",
    algoReason: "Chosen because all backends are equally capable. Simple, fair, and zero overhead.",
  },
  crash: {
    label: "Server crash",
    mood: "danger",
    title: "Server 2 DOWN — auto-failover triggered",
    what: "Server 2 stopped responding. Health checker detected failure via TCP probe timeout. Load balancer immediately removed it from the active pool.",
    why: "Without health checking, 33% of requests would hit a dead server causing errors. Auto-failover redistributes traffic to SRV 1 and SRV 3 — users see zero downtime.",
    algo: "Round Robin (2 backends)",
    algoReason: "Same algorithm, fewer backends. Traffic now split 50/50 between SRV 1 and SRV 3 automatically.",
  },
  overload: {
    label: "Overload problem",
    mood: "warn",
    title: "Server 1 overloaded — Round Robin's weakness exposed",
    what: "Server 1 is responding slowly (850ms latency) but Round Robin keeps assigning it the same number of requests as fast servers.",
    why: "Round Robin is blind to server health and load. It treats a slow server the same as a fast one. Result: requests pile up on SRV 1 while SRV 2 & 3 are idle. Least Connections algorithm would solve this.",
    algo: "Round Robin (problem)",
    algoReason: "This is WHY Least Connections exists — it routes to the server with fewest active connections, skipping overloaded ones.",
  },
  rr_uneven: {
    label: "RR uneven load",
    mood: "warn",
    title: "Round Robin fails with unequal job sizes",
    what: "Server 3 is handling heavy compute jobs (large file processing, DB queries). Round Robin still sends it the same number of requests as lighter servers.",
    why: "Round Robin counts requests, not work. SRV 3 gets 1 heavy job (takes 2s) while SRV 1 & 2 get 10 light jobs (takes 100ms each). Queue builds up on SRV 3. Weighted RR or Least Connections fixes this.",
    algo: "Round Robin (limitation)",
    algoReason: "Weighted Round Robin assigns fewer turns to slower/heavier servers. Least Connections naturally routes away from busy ones.",
  },
  recovery: {
    label: "Server recovery",
    mood: "success",
    title: "Server 2 recovered — graceful re-entry to pool",
    what: "Server 2 restarted and passed health check (TCP connect succeeded). Load balancer gradually adds it back — marked as RECOVERING first, then ALIVE.",
    why: "Immediate full traffic restore after crash risks overwhelming a just-restarted server. Gradual recovery lets SRV 2 warm up. Health checks run every 3s to confirm stability before full traffic.",
    algo: "Round Robin (3 backends restored)",
    algoReason: "All 3 servers active again — traffic returns to equal 33% distribution automatically.",
  },
  burst: {
    label: "Traffic burst",
    mood: "warn",
    title: "5× traffic spike — Least Connections takes over",
    what: "Sudden traffic surge detected. Algorithm switched from Round Robin to Least Connections. Each new request goes to the server with fewest active connections.",
    why: "During bursts, some servers finish requests faster than others — Round Robin would pile up on slow ones. Least Connections dynamically routes to the least busy server, naturally load-balancing based on real capacity.",
    algo: "Least Connections",
    algoReason: "Optimal for burst traffic — adapts in real-time. Server that finishes first gets the next request, maximizing throughput.",
  },
};

const WS_URL = (import.meta as any).env?.VITE_WS_URL ?? "ws://localhost:9001/metrics";

function nowStr(): string {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => n.toString().padStart(2, "0")).join(":");
}

export default function LoadBalancerSimulator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const packetsRef = useRef<Packet[]>([]);
  const serversRef = useRef<Array<{ req: number; conn: number; alive: boolean; slow: boolean; recovering: boolean }>>([]);
  const frameRef = useRef(0);
  const rrIdxRef = useRef(0);
  const animIdRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const pkIdRef = useRef(0);
  const speedRef = useRef(5);

  const [scenario, setScenario] = useState<Scenario>("normal");
  // const [metrics, setMetrics] = useState<MetricsFrame | null>(null);
  const [_metrics, setMetrics] = useState<MetricsFrame | null>(null); 
  const [wsStatus, setWsStatus] = useState<"connecting" | "live" | "demo">("demo");
  const [totalReq, setTotalReq] = useState(0);
  const [dropped, setDropped] = useState(0);
  const [rps, setRps] = useState(0);
  const [speed, setSpeed] = useState(5); 
  const [logs, setLogs] = useState<LogEntry[]>([
    { time: nowStr(), msg: "Load balancer started on :8080 — Round Robin active", type: "ok" },
    { time: nowStr(), msg: "3 backends registered, TCP health checks every 3s", type: "info" },
  ]);
  const [backendStats, setBackendStats] = useState([
    { label: "Server 1", req: 0, conn: 0, alive: true, slow: false, recovering: false, color: COLORS[0] },
    { label: "Server 2", req: 0, conn: 0, alive: true, slow: false, recovering: false, color: COLORS[1] },
    { label: "Server 3", req: 0, conn: 0, alive: true, slow: false, recovering: false, color: COLORS[2] },
  ]);
  const [algo, setAlgo] = useState("round_robin");
  const [running, setRunning] = useState(true);
  const runningRef = useRef(true);
  const [insightOpen, setInsightOpen] = useState(false);

  const addLog = useCallback((msg: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [{ time: nowStr(), msg, type }, ...prev].slice(0, 12));
  }, []);

  useEffect(() => {
    setWsStatus("connecting");
    let ws: WebSocket;
    try {
      ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onopen = () => { setWsStatus("live"); addLog(`Connected to C++ backend — live data streaming`, "ok"); };
      ws.onmessage = (e) => {
        try {
          const frame: MetricsFrame = JSON.parse(e.data);
          setMetrics(frame);
          setAlgo(frame.algorithm);
          setBackendStats((prev) =>
            frame.backends.map((b, i) => ({
              label: `Server ${i + 1}`,
              req: b.req, conn: b.conn, alive: b.alive,
              slow: b.latency_ms > 500,
              recovering: !b.alive && prev[i]?.recovering,
              color: COLORS[i % COLORS.length],
            }))
          );
          setTotalReq(frame.connections);
          setRps(frame.rps);
        } catch {}
      };
      ws.onerror = () => { setWsStatus("demo"); addLog("C++ backend offline — running interactive demo", "warn"); };
      ws.onclose = () => { setWsStatus("demo"); };
    } catch { setWsStatus("demo"); }
    return () => { wsRef.current?.close(); };
  }, []);

  useEffect(() => {
    serversRef.current = backendStats.map((s) => ({
      req: s.req, conn: s.conn, alive: s.alive, slow: s.slow, recovering: s.recovering,
    }));
  }, [backendStats]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d")!;

    function resize() {
      const W = wrap!.clientWidth, H = wrap!.clientHeight;
      canvas!.width = W * devicePixelRatio; canvas!.height = H * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const getW = () => wrap!.clientWidth;
    const getH = () => wrap!.clientHeight;
    const cX = () => getW() * 0.10;
    const cY = () => getH() * 0.50;
    const lbX = () => getW() * 0.44;
    const lbY = () => getH() * 0.50;
    const srvPos = (i: number, total: number) => {
      const sp = Math.min((getH() - 40) / total, 78);
      const startY = getH() / 2 - ((total - 1) * sp) / 2;
      return { x: getW() * 0.82, y: startY + i * sp };
    };

    function roundRect(x: number, y: number, w: number, h: number, r: number, fill?: string, stroke?: string, sw = 1.5) {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.stroke(); }
    }

    function drawNode(x: number, y: number, line1: string, line2: string, borderColor: string, alive = true, pulse = false) {
      const dark = window.matchMedia("(prefers-color-scheme:dark)").matches;
      const nodeBg = dark ? "#1a1a18" : "#ffffff";
      const textC = dark ? "rgba(255,255,255,0.82)" : "rgba(15,15,15,0.85)";
      ctx.globalAlpha = alive ? 1 : 0.28;
      const p = pulse ? 0.5 + 0.5 * Math.sin(frameRef.current * 0.09) : 1;
      roundRect(x - 56, y - 22, 112, 44, 10, nodeBg, borderColor, pulse ? 1 + p * 0.6 : 1.5);
      ctx.fillStyle = textC; ctx.textAlign = "center";
      ctx.font = "500 12px monospace"; ctx.fillText(line1, x, y - (line2 ? 5 : 0));
      if (line2) { ctx.font = "11px monospace"; ctx.fillStyle = borderColor; ctx.fillText(line2, x, y + 10); }
      ctx.globalAlpha = 1;
    }

    function loop() {
      const W = getW(), H = getH();
      ctx.clearRect(0, 0, W, H);
      const dark = window.matchMedia("(prefers-color-scheme:dark)").matches;
      const lineC = dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.25)";
      const srvs = serversRef.current;
      const total = srvs.length;

      ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
      srvs.forEach((s, i) => {
        const p = srvPos(i, total);
        ctx.strokeStyle = !s.alive ? "rgba(239,68,68,0.5)" : s.slow ? "rgba(245,158,11,0.55)" : lineC;
        ctx.globalAlpha = s.alive ? 1 : 0.4;
        ctx.beginPath(); ctx.moveTo(lbX() + 56, lbY()); ctx.lineTo(p.x - 56, p.y); ctx.stroke();
        ctx.globalAlpha = 1;
      });
      ctx.beginPath(); ctx.strokeStyle = lineC;
      ctx.moveTo(cX() + 56, cY()); ctx.lineTo(lbX() - 56, lbY()); ctx.stroke();
      ctx.setLineDash([]);

      drawNode(cX(), cY(), "CLIENTS", "", "#3B82F6", true, false);
      drawNode(lbX(), lbY(), "LOAD", "BALANCER", "#8B5CF6", true, scenario === "burst");
      srvs.forEach((s, i) => {
        const p = srvPos(i, total);
        const col = !s.alive ? "#EF4444" : s.slow ? "#F59E0B" : s.recovering ? "#10B981" : COLORS[i % COLORS.length];
        const sublabel = !s.alive ? "DOWN" : s.slow ? "SLOW" : s.recovering ? "RECOVERING" : `${s.req} req`;
        drawNode(p.x, p.y, `SRV ${i + 1}`, sublabel, col, s.alive || s.recovering, s.slow);
      });

      const spd = speedRef.current / 5;
      packetsRef.current = packetsRef.current.filter((pk) => {
        pk.progress += pk.speed * spd;
        if (pk.progress >= 1) {
          if (pk.phase === "to_lb") {
            const p = srvPos(pk.srvIdx, srvs.length);
            pk.phase = "to_srv"; pk.progress = 0;
            pk.x = lbX(); pk.y = lbY(); pk.tx = p.x; pk.ty = p.y;
            pk.speed = pk.slow ? 0.005 + Math.random() * 0.003 : 0.020 + Math.random() * 0.010;
            return true;
          }
          if (pk.phase === "to_srv") {
            pk.phase = "back"; pk.progress = 0;
            pk.x = pk.tx; pk.y = pk.ty; pk.tx = lbX(); pk.ty = lbY();
            pk.speed = 0.028 + Math.random() * 0.010; pk.size = 3.5; pk.alpha = 0.5;
            return true;
          }
          if (pk.phase === "back") {
            if (serversRef.current[pk.srvIdx])
              serversRef.current[pk.srvIdx].conn = Math.max(0, serversRef.current[pk.srvIdx].conn - 1);
            return false;
          }
          return false;
        }
        const t = pk.progress;
        const arc = (pk.phase === "back" ? -1 : 1) * 20 * Math.sin(Math.PI * t);
        const ex = pk.x + (pk.tx - pk.x) * t, ey = pk.y + (pk.ty - pk.y) * t;
        const dx = pk.tx - pk.x, dy = pk.ty - pk.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
        const fx = ex + (-dy / len) * arc, fy = ey + (dx / len) * arc;
        ctx.beginPath(); ctx.arc(fx, fy, pk.size, 0, Math.PI * 2);
        ctx.fillStyle = pk.color; ctx.globalAlpha = pk.alpha; ctx.fill(); ctx.globalAlpha = 1;
        return true;
      });

      frameRef.current++;
      animIdRef.current = requestAnimationFrame(loop);
    }

    animIdRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animIdRef.current); ro.disconnect(); };
  }, [scenario]);

  useEffect(() => {
    if (wsStatus === "live") return;

    let lastSecCount = 0;
    const secInterval = setInterval(() => {
      setRps(lastSecCount); lastSecCount = 0;
      setBackendStats((prev) =>
        prev.map((s, i) => ({
          ...s,
          req: serversRef.current[i]?.req ?? s.req,
          conn: serversRef.current[i]?.conn ?? s.conn,
          alive: serversRef.current[i]?.alive ?? s.alive,
          slow: serversRef.current[i]?.slow ?? s.slow,
          recovering: serversRef.current[i]?.recovering ?? s.recovering,
        }))
      );
    }, 1000);

    function spawnPacket() {
      if (!runningRef.current) return;
      const srvs = serversRef.current;
      const alive = srvs.map((s, i) => ({ s, i })).filter(({ s }) => s.alive && !s.recovering);
      if (!alive.length) { setDropped((d) => d + 1); addLog("No healthy backends — connection refused!", "err"); return; }

      let pick: { s: typeof srvs[0]; i: number };
      if (scenario === "burst") pick = alive.reduce((a, b) => (a.s.conn <= b.s.conn ? a : b));
      else { pick = alive[rrIdxRef.current % alive.length]; rrIdxRef.current++; }

      pick.s.req++; pick.s.conn++; lastSecCount++;
      setTotalReq((n) => n + 1);

      const canvas = canvasRef.current!;
      const W = canvas.width / devicePixelRatio, H = canvas.height / devicePixelRatio;

      packetsRef.current.push({
        id: pkIdRef.current++,
        srvIdx: pick.i, color: COLORS[pick.i % COLORS.length],
        phase: "to_lb", progress: 0,
        x: W * 0.10, y: H * 0.50, tx: W * 0.44, ty: H * 0.50,
        speed: 0.022 + Math.random() * 0.010,
        size: 5, alpha: 0.9, slow: pick.s.slow,
      });
    }

    function scheduleSpawn() {
      const spd = speedRef.current;
      const delay = Math.max(20, 320 - spd * 30) + Math.random() * 20;
      spawnTimerRef.current = window.setTimeout(() => {
        spawnPacket();
        scheduleSpawn();
      }, delay);
    }
    scheduleSpawn();

    return () => { clearTimeout(spawnTimerRef.current); clearInterval(secInterval); };
  }, [wsStatus, scenario, addLog]);

  const applyScenario = useCallback((sc: Scenario) => {
    setScenario(sc);
    rrIdxRef.current = 0;
    setBackendStats((prev) => {
      const next = prev.map((s) => ({ ...s, slow: false, recovering: false, alive: true }));
      serversRef.current = next.map((s) => ({ req: s.req, conn: s.conn, alive: true, slow: false, recovering: false }));

      if (sc === "crash") {
        next[1].alive = false; serversRef.current[1].alive = false;
        addLog("HEALTH CHECK FAILED — Server 2 not responding to TCP probe", "err");
        addLog("AUTO-FAILOVER — Removing SRV 2 from pool, redistributing to SRV 1 & SRV 3", "warn");
      }
      if (sc === "recovery") {
        next[1].recovering = true; serversRef.current[1].recovering = true;
        addLog("HEALTH CHECK PASSED — Server 2 responding to TCP probe", "ok");
        addLog("GRADUAL RE-ENTRY — SRV 2 added back, monitoring for stability", "info");
        setTimeout(() => {
          serversRef.current[1].recovering = false;
          setBackendStats((p) => p.map((s, i) => i === 1 ? { ...s, recovering: false } : s));
          addLog("SERVER 2 FULLY ACTIVE — Traffic restored to equal 3-way distribution", "ok");
        }, 3500);
      }
      if (sc === "overload") {
        next[0].slow = true; serversRef.current[0].slow = true;
        addLog("LATENCY SPIKE — Server 1 response time: 850ms (threshold: 200ms)", "warn");
        addLog("RR LIMITATION — Round Robin still routing to SRV 1 despite overload", "warn");
      }
      if (sc === "rr_uneven") {
        next[2].slow = true; serversRef.current[2].slow = true;
        addLog("QUEUE BUILDUP — Server 3 processing heavy jobs, backlog forming", "warn");
        addLog("RR BLIND SPOT — Equal turns ≠ equal load when job sizes vary", "warn");
      }
      if (sc === "burst") {
        addLog("TRAFFIC BURST — 5x spike detected, switching to Least Connections", "warn");
        addLog("ALGO CHANGE — Least Conn routes to server with fewest active connections", "info");
        for (let i = 0; i < 18; i++) {
          setTimeout(() => {
            const canvas = canvasRef.current!;
            const W = canvas.width / devicePixelRatio, H = canvas.height / devicePixelRatio;
            const srvs = serversRef.current;
            const alive = srvs.map((s, idx) => ({ s, i: idx })).filter(({ s }) => s.alive);
            if (!alive.length) return;
            const pick = alive.reduce((a, b) => (a.s.conn <= b.s.conn ? a : b));
            pick.s.req++; pick.s.conn++; setTotalReq((n) => n + 1);
            packetsRef.current.push({ id: pkIdRef.current++, srvIdx: pick.i, color: COLORS[pick.i % COLORS.length], phase: "to_lb", progress: 0, x: W * 0.10, y: H * 0.50, tx: W * 0.44, ty: H * 0.50, speed: 0.025 + Math.random() * 0.010, size: 5, alpha: 0.9, slow: false });
          }, i * 35);
        }
      }
      if (sc === "normal") {
        addLog("NORMAL MODE — Round Robin active, equal distribution across 3 backends", "ok");
        addLog("SRV 1 → SRV 2 → SRV 3 → SRV 1 ... (cyclic assignment)", "info");
      }
      return next;
    });
  }, [addLog]);

  const scMeta = SCENARIO_META[scenario];
  const maxReq = Math.max(...backendStats.map((s) => s.req), 1);

  const handleSpeedChange = (val: number) => {
    speedRef.current = val;
    setSpeed(val);
  };

  const toggleRunning = () => {
    runningRef.current = !runningRef.current;
    setRunning(runningRef.current);
    if (runningRef.current) addLog("Traffic RESUMED", "ok");
    else addLog("Traffic PAUSED — no new connections accepted", "warn");
  };

  const moodColors = {
    info: { border: "#3B82F620", bg: "#3B82F608", text: "#60A5FA", accent: "#3B82F6" },
    warn: { border: "#F59E0B20", bg: "#F59E0B08", text: "#FBBF24", accent: "#F59E0B" },
    danger: { border: "#EF444420", bg: "#EF444408", text: "#F87171", accent: "#EF4444" },
    success: { border: "#10B98120", bg: "#10B98108", text: "#34D399", accent: "#10B981" },
  }[scMeta.mood];

  return (
    <div style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", background: "var(--color-background-primary)", borderRadius: "16px", border: "0.5px solid var(--color-border-tertiary)", padding: "20px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-text-primary)" }}>L4 Load Balancer</div>
          <div style={{ fontSize: "12px", color: "var(--color-text-tertiary)", marginTop: "2px" }}>
            {wsStatus === "live" ? "● live data" : wsStatus === "connecting" ? "◌ connecting..." : "◎ demo mode"}
            &nbsp;·&nbsp;{ALGO_LABELS[algo] ?? algo}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { label: "Requests", val: totalReq.toLocaleString() },
            { label: "Dropped", val: dropped.toString(), danger: dropped > 0 },
            { label: "Req/sec", val: rps.toString() },
          ].map((s) => (
            <div key={s.label} style={{ background: "var(--color-background-secondary)", borderRadius: "8px", padding: "6px 14px", textAlign: "center", minWidth: "80px" }}>
              <div style={{ fontSize: "10px", color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
              <div style={{ fontSize: "18px", fontWeight: 500, color: (s as any).danger ? "var(--color-text-danger)" : "var(--color-text-primary)", marginTop: "2px" }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scenario buttons */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
        {(Object.keys(SCENARIO_META) as Scenario[]).map((sc) => {
          const m = SCENARIO_META[sc];
          const active = scenario === sc;
          const moodBorder = { info: "#3B82F6", warn: "#F59E0B", danger: "#EF4444", success: "#10B981" }[m.mood];
          return (
            <button key={sc} onClick={() => applyScenario(sc)} style={{ padding: "6px 14px", fontSize: "12px", border: `1px solid ${active ? moodBorder : "var(--color-border-primary)"}`, borderRadius: "8px", background: active ? moodBorder + "18" : "transparent", color: active ? moodBorder : "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit", fontWeight: active ? 500 : 400 }}>
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Speed Control */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px", background: "var(--color-background-secondary)", borderRadius: "8px", padding: "10px 14px", flexWrap: "wrap" }}>
        <button onClick={toggleRunning} style={{ padding: "5px 14px", fontSize: "12px", border: `0.5px solid ${running ? "#10B981" : "#EF4444"}`, borderRadius: "6px", background: running ? "#10B98118" : "#EF444418", color: running ? "#10B981" : "#EF4444", cursor: "pointer", fontFamily: "inherit" }}>
          {running ? "⏸ Pause" : "▶ Resume"}
        </button>
        <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>Traffic speed:</span>
        <span style={{ fontSize: "12px", color: "#EF4444" }}>Slow</span>
        <input type="range" min={1} max={10} value={speed} onChange={(e) => handleSpeedChange(Number(e.target.value))} style={{ flex: 1, minWidth: "100px", accentColor: "#8B5CF6" }} />
        <span style={{ fontSize: "12px", color: "#10B981" }}>Fast</span>
        <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-text-primary)", minWidth: "28px" }}>{speed}x</span>
      </div>

      {/* Collapsible Insight Panel */}
      <div style={{ borderRadius: "12px", border: `1px solid ${moodColors.border}`, background: moodColors.bg, marginBottom: "14px", overflow: "hidden" }}>
        {/* Title bar - always visible, clickable */}
        <div
          onClick={() => setInsightOpen((o) => !o)}
          style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", userSelect: "none", borderBottom: insightOpen ? `1px solid ${moodColors.border}` : "none" }}
        >
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: moodColors.accent, display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontSize: "14px", fontWeight: 600, color: moodColors.text, flex: 1 }}>{scMeta.title}</span>
          <span style={{ fontSize: "13px", color: moodColors.accent, marginLeft: "auto", transition: "transform 0.2s", display: "inline-block", transform: insightOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
        </div>

        {/* Expandable content */}
        {insightOpen && (
          <>
            {/* What is happening */}
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${moodColors.border}` }}>
              <div style={{ fontSize: "11px", color: moodColors.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px", fontWeight: 600 }}>What is happening</div>
              <div style={{ fontSize: "13px", color: "var(--color-text-primary)", lineHeight: "1.7" }}>{scMeta.what}</div>
            </div>
            {/* Why */}
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${moodColors.border}` }}>
              <div style={{ fontSize: "11px", color: moodColors.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px", fontWeight: 600 }}>Why this matters</div>
              <div style={{ fontSize: "13px", color: "var(--color-text-secondary)", lineHeight: "1.7" }}>{scMeta.why}</div>
            </div>
            {/* Algorithm */}
            <div style={{ padding: "12px 16px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "11px", color: moodColors.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px", fontWeight: 600 }}>Active algorithm</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)" }}>{scMeta.algo}</div>
              </div>
              <div style={{ flex: 3 }}>
                <div style={{ fontSize: "11px", color: moodColors.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px", fontWeight: 600 }}>Algorithm reason</div>
                <div style={{ fontSize: "13px", color: "var(--color-text-secondary)", lineHeight: "1.6" }}>{scMeta.algoReason}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Canvas */}
      <div ref={wrapRef} style={{ position: "relative", width: "100%", height: "260px", background: "var(--color-background-secondary)", borderRadius: "12px", border: "0.5px solid var(--color-border-tertiary)", overflow: "hidden", marginBottom: "12px" }}>
        <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
      </div>

      {/* Server rows */}
      <div style={{ display: "grid", gap: "8px", marginBottom: "12px" }}>
        {backendStats.map((s, i) => {
          const barW = Math.round((s.req / maxReq) * 100);
          const pct = Math.round((s.req / Math.max(totalReq, 1)) * 100);
          const dotColor = !s.alive ? "#EF4444" : s.slow ? "#F59E0B" : s.recovering ? "#3B82F6" : "#10B981";
          const badge = !s.alive ? "DOWN" : s.slow ? "SLOW" : s.recovering ? "RECOVERING" : "ALIVE";
          const badgeColor = !s.alive ? "#EF4444" : s.slow ? "#F59E0B" : s.recovering ? "#3B82F6" : "#10B981";
          const barColor = !s.alive ? "#EF444440" : s.slow ? "#F59E0B" : s.recovering ? "#3B82F6" : s.color;
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "100px 1fr 64px 50px 100px", alignItems: "center", gap: "10px", background: "var(--color-background-primary)", border: `0.5px solid ${s.slow ? "#F59E0B30" : !s.alive ? "#EF444430" : "var(--color-border-tertiary)"}`, borderRadius: "8px", padding: "10px 14px", opacity: s.alive ? 1 : 0.5 }}>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "7px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: dotColor, flexShrink: 0, display: "inline-block" }} />
                {s.label}
              </div>
              <div style={{ height: "6px", background: "var(--color-border-tertiary)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${barW}%`, background: barColor, borderRadius: "3px", transition: "width .5s ease" }} />
              </div>
              <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", textAlign: "right" }}>{s.req} req</div>
              <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", textAlign: "right" }}>{pct}%</div>
              <div><span style={{ fontSize: "11px", padding: "3px 9px", borderRadius: "6px", background: badgeColor + "18", color: badgeColor, fontWeight: 500 }}>{badge}</span></div>
            </div>
          );
        })}
      </div>

      {/* Event Log - BIGGER */}
      <div>
        <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px", fontWeight: 600 }}>Event log</div>
        <div style={{ background: "var(--color-background-secondary)", borderRadius: "8px", padding: "10px 14px", maxHeight: "140px", overflowY: "auto" }}>
          {logs.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "4px 0", borderBottom: i < logs.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
              <span style={{ fontSize: "11px", color: "var(--color-text-tertiary)", flexShrink: 0, marginTop: "2px" }}>{l.time}</span>
              <span style={{ fontSize: "13px", lineHeight: "1.5", color: l.type === "err" ? "#F87171" : l.type === "ok" ? "#34D399" : l.type === "warn" ? "#FBBF24" : "var(--color-text-secondary)" }}>
                {l.msg}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
} 