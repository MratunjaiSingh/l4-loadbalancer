// /**
//  * LoadBalancerSimulator.tsx
//  * 
//  * Drop into: dashboard/src/components/LoadBalancerSimulator.tsx
//  * 
//  * Real WebSocket connection to C++ backend:
//  *   ws://localhost:9001/metrics
//  * 
//  * C++ backend must send JSON every 500ms:
//  * {
//  *   "connections": 142,
//  *   "bytes_in": 8240192,
//  *   "bytes_out": 9182304,
//  *   "rps": 47,
//  *   "algorithm": "round_robin",
//  *   "backends": [
//  *     { "addr": "10.0.0.1:3000", "alive": true, "conn": 47, "req": 312, "latency_ms": 12 }
//  *   ]
//  * }
//  */

// import { useEffect, useRef, useState, useCallback } from "react";

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface Backend {
//   addr: string;
//   alive: boolean;
//   conn: number;
//   req: number;
//   latency_ms: number;
// }

// interface MetricsFrame {
//   connections: number;
//   bytes_in: number;
//   bytes_out: number;
//   rps: number;
//   algorithm: string;
//   backends: Backend[];
// }

// interface Packet {
//   id: number;
//   srvIdx: number;
//   color: string;
//   phase: "to_lb" | "to_srv" | "back";
//   progress: number;
//   speed: number;
//   x: number;
//   y: number;
//   tx: number;
//   ty: number;
//   size: number;
//   alpha: number;
//   slow: boolean;
// }

// interface LogEntry {
//   time: string;
//   msg: string;
//   type: "ok" | "err" | "warn" | "info";
// }

// type Scenario = "normal" | "crash" | "overload" | "rr_uneven" | "recovery" | "burst";

// // ─── Constants ────────────────────────────────────────────────────────────────

// const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

// const ALGO_LABELS: Record<string, string> = {
//   round_robin: "Round Robin",
//   weighted: "Weighted",
//   least_conn: "Least Conn",
//   random: "Random",
// };

// const SCENARIO_META: Record<
//   Scenario,
//   { label: string; mood: "info" | "warn" | "danger" | "success"; text: string; btn: string }
// > = {
//   normal: {
//     label: "Normal traffic",
//     mood: "info",
//     btn: "bg-blue-500/10 text-blue-400 border-blue-500/30",
//     text: "Normal traffic — load balancer distributing requests evenly across all healthy servers via Round Robin.",
//   },
//   crash: {
//     label: "Server crash",
//     mood: "danger",
//     btn: "bg-red-500/10 text-red-400 border-red-500/30",
//     text: "Server 2 crashed! Health check detects failure → load balancer auto-reroutes all traffic to surviving servers. Zero manual intervention.",
//   },
//   overload: {
//     label: "Overload problem",
//     mood: "warn",
//     btn: "bg-amber-500/10 text-amber-400 border-amber-500/30",
//     text: "Server 1 is overloaded (850ms latency). Round Robin keeps sending it traffic equally — this is why Least Connections beats RR under uneven load.",
//   },
//   rr_uneven: {
//     label: "RR uneven load",
//     mood: "warn",
//     btn: "bg-amber-500/10 text-amber-400 border-amber-500/30",
//     text: "Round Robin assigns turns equally — but Server 3 handles heavier jobs. Queue builds up. Weighted Round Robin or Least Connections solves this.",
//   },
//   recovery: {
//     label: "Server recovery",
//     mood: "success",
//     btn: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
//     text: "Server 2 is back online. Health check passes → added back to pool gradually. Traffic redistributes without any downtime.",
//   },
//   burst: {
//     label: "Traffic burst",
//     mood: "warn",
//     btn: "bg-amber-500/10 text-amber-400 border-amber-500/30",
//     text: "5× traffic spike! Least Connections algorithm active — new requests go to least busy server. No single backend gets overwhelmed.",
//   },
// };

// const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:9001/metrics";

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// function fmtBytes(b: number): string {
//   if (b >= 1_000_000) return (b / 1_000_000).toFixed(1) + " MB";
//   if (b >= 1_000) return (b / 1_000).toFixed(1) + " KB";
//   return b + " B";
// }

// function now(): string {
//   const d = new Date();
//   return [d.getHours(), d.getMinutes(), d.getSeconds()]
//     .map((n) => n.toString().padStart(2, "0"))
//     .join(":");
// }

// // ─── Component ────────────────────────────────────────────────────────────────

// export default function LoadBalancerSimulator() {
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const wrapRef = useRef<HTMLDivElement>(null);
//   const wsRef = useRef<WebSocket | null>(null);
//   const packetsRef = useRef<Packet[]>([]);
//   const serversRef = useRef<
//     Array<{ req: number; conn: number; alive: boolean; slow: boolean; recovering: boolean }>
//   >([]);
//   const frameRef = useRef(0);
//   const rrIdxRef = useRef(0);
//   const animIdRef = useRef(0);
//   const spawnTimerRef = useRef(0);
//   const pkIdRef = useRef(0);

//   const [scenario, setScenario] = useState<Scenario>("normal");
//   const [metrics, setMetrics] = useState<MetricsFrame | null>(null);
//   const [wsStatus, setWsStatus] = useState<"connecting" | "live" | "demo">("demo");
//   const [totalReq, setTotalReq] = useState(0);
//   const [dropped, setDropped] = useState(0);
//   const [rps, setRps] = useState(0);
//   const [logs, setLogs] = useState<LogEntry[]>([
//     { time: now(), msg: "Load balancer started on :8080", type: "ok" },
//     { time: now(), msg: "3 backends registered, health checks active", type: "info" },
//   ]);
//   const [backendStats, setBackendStats] = useState([
//     { label: "Server 1", req: 0, conn: 0, alive: true, slow: false, recovering: false, color: COLORS[0] },
//     { label: "Server 2", req: 0, conn: 0, alive: true, slow: false, recovering: false, color: COLORS[1] },
//     { label: "Server 3", req: 0, conn: 0, alive: true, slow: false, recovering: false, color: COLORS[2] },
//   ]);
//   const [algo, setAlgo] = useState("round_robin");

//   const addLog = useCallback((msg: string, type: LogEntry["type"] = "info") => {
//     setLogs((prev) => [{ time: now(), msg, type }, ...prev].slice(0, 15));
//   }, []);

//   // ── WebSocket connection ─────────────────────────────────────────────────────
//   useEffect(() => {
//     setWsStatus("connecting");
//     let ws: WebSocket;
//     try {
//       ws = new WebSocket(WS_URL);
//       wsRef.current = ws;

//       ws.onopen = () => {
//         setWsStatus("live");
//         addLog(`Connected to ${WS_URL}`, "ok");
//       };

//       ws.onmessage = (e) => {
//         try {
//           const frame: MetricsFrame = JSON.parse(e.data);
//           setMetrics(frame);
//           setAlgo(frame.algorithm);
//           // Sync backend stats from real data
//           setBackendStats((prev) =>
//             frame.backends.map((b, i) => ({
//               label: `Server ${i + 1}`,
//               req: b.req,
//               conn: b.conn,
//               alive: b.alive,
//               slow: b.latency_ms > 500,
//               recovering: !b.alive && prev[i]?.recovering,
//               color: COLORS[i % COLORS.length],
//             }))
//           );
//           setTotalReq(frame.connections);
//           setRps(frame.rps);
//         } catch {}
//       };

//       ws.onerror = () => {
//         setWsStatus("demo");
//         addLog("WebSocket unavailable — running demo mode", "warn");
//       };

//       ws.onclose = () => {
//         if (wsStatus === "live") {
//           setWsStatus("demo");
//           addLog("WebSocket disconnected — switched to demo mode", "warn");
//         }
//       };
//     } catch {
//       setWsStatus("demo");
//     }

//     return () => {
//       wsRef.current?.close();
//     };
//   }, []); // eslint-disable-line

//   // ── Sync serversRef from backendStats ────────────────────────────────────────
//   useEffect(() => {
//     serversRef.current = backendStats.map((s) => ({
//       req: s.req,
//       conn: s.conn,
//       alive: s.alive,
//       slow: s.slow,
//       recovering: s.recovering,
//     }));
//   }, [backendStats]);

//   // ── Canvas drawing ───────────────────────────────────────────────────────────
//   useEffect(() => {
//     const canvas = canvasRef.current;
//     const wrap = wrapRef.current;
//     if (!canvas || !wrap) return;
//     const ctx = canvas.getContext("2d")!;

//     function resize() {
//       const W = wrap!.clientWidth;
//       const H = wrap!.clientHeight;
//       canvas!.width = W * devicePixelRatio;
//       canvas!.height = H * devicePixelRatio;
//       ctx.scale(devicePixelRatio, devicePixelRatio);
//     }
//     resize();
//     const ro = new ResizeObserver(resize);
//     ro.observe(wrap);

//     function getW() { return wrap!.clientWidth; }
//     function getH() { return wrap!.clientHeight; }
//     const cX = () => getW() * 0.10;
//     const cY = () => getH() * 0.50;
//     const lbX = () => getW() * 0.44;
//     const lbY = () => getH() * 0.50;
//     const srvPos = (i: number, total: number) => {
//       const sp = Math.min((getH() - 40) / total, 78);
//       const startY = getH() / 2 - ((total - 1) * sp) / 2;
//       return { x: getW() * 0.82, y: startY + i * sp };
//     };

//     function roundRect(
//       x: number, y: number, w: number, h: number, r: number,
//       fill?: string, stroke?: string, sw = 1.5
//     ) {
//       ctx.beginPath();
//       ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
//       ctx.quadraticCurveTo(x + w, y, x + w, y + r);
//       ctx.lineTo(x + w, y + h - r);
//       ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
//       ctx.lineTo(x + r, y + h);
//       ctx.quadraticCurveTo(x, y + h, x, y + h - r);
//       ctx.lineTo(x, y + r);
//       ctx.quadraticCurveTo(x, y, x + r, y);
//       ctx.closePath();
//       if (fill) { ctx.fillStyle = fill; ctx.fill(); }
//       if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.stroke(); }
//     }

//     function drawNode(
//       x: number, y: number, line1: string, line2: string,
//       borderColor: string, alive = true, pulse = false
//     ) {
//       const dark = window.matchMedia("(prefers-color-scheme:dark)").matches;
//       const nodeBg = dark ? "#1a1a18" : "#ffffff";
//       const textC = dark ? "rgba(255,255,255,0.82)" : "rgba(15,15,15,0.85)";
//       ctx.globalAlpha = alive ? 1 : 0.28;
//       const p = pulse ? 0.5 + 0.5 * Math.sin(frameRef.current * 0.09) : 1;
//       roundRect(x - 56, y - 22, 112, 44, 10, nodeBg, borderColor, pulse ? 1 + p * 0.6 : 1.5);
//       ctx.fillStyle = textC;
//       ctx.textAlign = "center";
//       ctx.font = "500 12px 'JetBrains Mono', monospace";
//       ctx.fillText(line1, x, y - (line2 ? 5 : 0));
//       if (line2) {
//         ctx.font = "11px 'JetBrains Mono', monospace";
//         ctx.fillStyle = borderColor;
//         ctx.fillText(line2, x, y + 10);
//       }
//       ctx.globalAlpha = 1;
//     }

//     function loop() {
//       const W = getW();
//       const H = getH();
//       ctx.clearRect(0, 0, W, H);
//       const dark = window.matchMedia("(prefers-color-scheme:dark)").matches;
//       const lineC = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
//       const srvs = serversRef.current;
//       const total = srvs.length;

//       // Draw connector lines
//       ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
//       srvs.forEach((s, i) => {
//         const p = srvPos(i, total);
//         ctx.strokeStyle = !s.alive ? "rgba(239,68,68,0.2)" : s.slow ? "rgba(245,158,11,0.3)" : lineC;
//         ctx.globalAlpha = s.alive ? 1 : 0.25;
//         ctx.beginPath(); ctx.moveTo(lbX() + 56, lbY()); ctx.lineTo(p.x - 56, p.y); ctx.stroke();
//         ctx.globalAlpha = 1;
//       });
//       ctx.beginPath(); ctx.strokeStyle = lineC;
//       ctx.moveTo(cX() + 56, cY()); ctx.lineTo(lbX() - 56, lbY()); ctx.stroke();
//       ctx.setLineDash([]);

//       // Nodes
//       drawNode(cX(), cY(), "CLIENTS", "", "#3B82F6", true, false);
//       const lbPulse = scenario === "burst";
//       drawNode(lbX(), lbY(), "LOAD", "BALANCER", "#8B5CF6", true, lbPulse);
//       srvs.forEach((s, i) => {
//         const p = srvPos(i, total);
//         const col = !s.alive ? "#EF4444" : s.slow ? "#F59E0B" : s.recovering ? "#10B981" : COLORS[i % COLORS.length];
//         const sublabel = !s.alive ? "DOWN" : s.slow ? "SLOW" : s.recovering ? "RECOVERING" : `${s.req} req`;
//         drawNode(p.x, p.y, `SRV ${i + 1}`, sublabel, col, s.alive || s.recovering, s.slow);
//       });

//       // Packets
//       packetsRef.current = packetsRef.current.filter((pk) => {
//         pk.progress += pk.speed;
//         if (pk.progress >= 1) {
//           if (pk.phase === "to_lb") {
//             const p = srvPos(pk.srvIdx, srvs.length);
//             pk.phase = "to_srv"; pk.progress = 0;
//             pk.x = lbX(); pk.y = lbY(); pk.tx = p.x; pk.ty = p.y;
//             pk.speed = pk.slow ? 0.005 + Math.random() * 0.003 : 0.020 + Math.random() * 0.010;
//             return true;
//           }
//           if (pk.phase === "to_srv") {
//             pk.phase = "back"; pk.progress = 0;
//             pk.x = pk.tx; pk.y = pk.ty;
//             pk.tx = lbX(); pk.ty = lbY();
//             pk.speed = 0.028 + Math.random() * 0.010;
//             pk.size = 3.5; pk.alpha = 0.5;
//             return true;
//           }
//           if (pk.phase === "back") {
//             if (serversRef.current[pk.srvIdx]) {
//               serversRef.current[pk.srvIdx].conn = Math.max(0, serversRef.current[pk.srvIdx].conn - 1);
//             }
//             return false;
//           }
//           return false;
//         }
//         const t = pk.progress;
//         const arc = (pk.phase === "back" ? -1 : 1) * 20 * Math.sin(Math.PI * t);
//         const ex = pk.x + (pk.tx - pk.x) * t;
//         const ey = pk.y + (pk.ty - pk.y) * t;
//         const dx = pk.tx - pk.x; const dy = pk.ty - pk.y;
//         const len = Math.sqrt(dx * dx + dy * dy) || 1;
//         const fx = ex + (-dy / len) * arc;
//         const fy = ey + (dx / len) * arc;
//         ctx.beginPath();
//         ctx.arc(fx, fy, pk.size, 0, Math.PI * 2);
//         ctx.fillStyle = pk.color;
//         ctx.globalAlpha = pk.alpha;
//         ctx.fill();
//         ctx.globalAlpha = 1;
//         return true;
//       });

//       frameRef.current++;
//       animIdRef.current = requestAnimationFrame(loop);
//     }

//     animIdRef.current = requestAnimationFrame(loop);
//     return () => {
//       cancelAnimationFrame(animIdRef.current);
//       ro.disconnect();
//     };
//   }, [scenario]);

//   // ── Demo spawn loop ──────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (wsStatus === "live") return; // real data drives display

//     let lastSecCount = 0;
//     const secInterval = setInterval(() => {
//       setRps(lastSecCount);
//       lastSecCount = 0;
//       // sync backendStats from serversRef
//       setBackendStats((prev) =>
//         prev.map((s, i) => ({
//           ...s,
//           req: serversRef.current[i]?.req ?? s.req,
//           conn: serversRef.current[i]?.conn ?? s.conn,
//           alive: serversRef.current[i]?.alive ?? s.alive,
//           slow: serversRef.current[i]?.slow ?? s.slow,
//           recovering: serversRef.current[i]?.recovering ?? s.recovering,
//         }))
//       );
//     }, 1000);

//     function spawnPacket() {
//       const srvs = serversRef.current;
//       const alive = srvs.map((s, i) => ({ s, i })).filter(({ s }) => s.alive && !s.recovering);
//       if (!alive.length) {
//         setDropped((d) => d + 1);
//         addLog("ERROR: No healthy servers — packet dropped!", "err");
//         return;
//       }

//       let pick: { s: typeof srvs[0]; i: number };
//       if (scenario === "burst") {
//         pick = alive.reduce((a, b) => (a.s.conn <= b.s.conn ? a : b));
//       } else {
//         pick = alive[rrIdxRef.current % alive.length];
//         rrIdxRef.current++;
//       }

//       pick.s.req++;
//       pick.s.conn++;
//       lastSecCount++;
//       setTotalReq((n) => n + 1);

//       const canvas = canvasRef.current!;
//       const W = canvas.width / devicePixelRatio;
//       const H = canvas.height / devicePixelRatio;
//       const cX = W * 0.10;
//       const cY = H * 0.50;
//       const lbX = W * 0.44;
//       const lbY = H * 0.50;

//       packetsRef.current.push({
//         id: pkIdRef.current++,
//         srvIdx: pick.i,
//         color: COLORS[pick.i % COLORS.length],
//         phase: "to_lb",
//         progress: 0,
//         x: cX, y: cY, tx: lbX, ty: lbY,
//         speed: 0.022 + Math.random() * 0.010,
//         size: 5, alpha: 0.9,
//         slow: pick.s.slow,
//       });
//     }

//     function scheduleSpawn() {
//       const delay = 65 + Math.random() * 45;
//       spawnTimerRef.current = window.setTimeout(() => {
//         spawnPacket();
//         scheduleSpawn();
//       }, delay);
//     }
//     scheduleSpawn();

//     return () => {
//       clearTimeout(spawnTimerRef.current);
//       clearInterval(secInterval);
//     };
//   }, [wsStatus, scenario, addLog]);

//   // ── Scenario handler ─────────────────────────────────────────────────────────
//   const applyScenario = useCallback(
//     (sc: Scenario) => {
//       setScenario(sc);
//       rrIdxRef.current = 0;

//       setBackendStats((prev) => {
//         const next = prev.map((s) => ({ ...s, slow: false, recovering: false }));
//         serversRef.current = next.map((s) => ({
//           req: s.req, conn: s.conn, alive: s.alive,
//           slow: false, recovering: false,
//         }));

//         if (sc === "crash") {
//           if (next[1].alive) {
//             next[1].alive = false;
//             serversRef.current[1].alive = false;
//             addLog("CRITICAL: Server 2 health check failed — marking DOWN", "err");
//           }
//         }
//         if (sc === "recovery") {
//           next.forEach((s, i) => {
//             s.alive = true;
//             serversRef.current[i].alive = true;
//           });
//           next[1].recovering = true;
//           serversRef.current[1].recovering = true;
//           addLog("INFO: Server 2 health check passed — adding back to pool", "ok");
//           setTimeout(() => {
//             serversRef.current[1].recovering = false;
//             setBackendStats((p) => p.map((s, i) => (i === 1 ? { ...s, recovering: false } : s)));
//             addLog("INFO: Server 2 fully active", "ok");
//           }, 3500);
//         }
//         if (sc === "overload") {
//           next[0].slow = true;
//           serversRef.current[0].slow = true;
//           addLog("WARN: Server 1 latency spiked to 850ms — still receiving RR traffic", "warn");
//         }
//         if (sc === "rr_uneven") {
//           next[2].slow = true;
//           serversRef.current[2].slow = true;
//           addLog("WARN: Server 3 processing heavy jobs — queue building", "warn");
//         }
//         if (sc === "burst") {
//           addLog("INFO: Traffic burst — switching to Least Connections", "ok");
//           for (let i = 0; i < 18; i++) {
//             setTimeout(() => {
//               const canvas = canvasRef.current!;
//               const W = canvas.width / devicePixelRatio;
//               const H = canvas.height / devicePixelRatio;
//               const srvs = serversRef.current;
//               const alive = srvs.map((s, idx) => ({ s, i: idx })).filter(({ s }) => s.alive);
//               if (!alive.length) return;
//               const pick = alive.reduce((a, b) => (a.s.conn <= b.s.conn ? a : b));
//               pick.s.req++;
//               pick.s.conn++;
//               setTotalReq((n) => n + 1);
//               packetsRef.current.push({
//                 id: pkIdRef.current++,
//                 srvIdx: pick.i,
//                 color: COLORS[pick.i % COLORS.length],
//                 phase: "to_lb", progress: 0,
//                 x: W * 0.10, y: H * 0.50, tx: W * 0.44, ty: H * 0.50,
//                 speed: 0.025 + Math.random() * 0.010,
//                 size: 5, alpha: 0.9, slow: false,
//               });
//             }, i * 35);
//           }
//         }
//         return next;
//       });
//     },
//     [addLog]
//   );

//   // ── UI ───────────────────────────────────────────────────────────────────────
//   const maxReq = Math.max(...backendStats.map((s) => s.req), 1);
//   const sc = SCENARIO_META[scenario];

//   // const moodBg: Record<string, string> = {
//   //   info: "bg-blue-500/8 border-blue-500/20 text-blue-400",
//   //   warn: "bg-amber-500/8 border-amber-500/20 text-amber-400",
//   //   danger: "bg-red-500/8 border-red-500/20 text-red-400",
//   //   success: "bg-emerald-500/8 border-emerald-500/20 text-emerald-400",
//   // };

//   return (
//     <div
//       style={{
//         fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
//         background: "var(--color-background-primary)",
//         borderRadius: "16px",
//         border: "0.5px solid var(--color-border-tertiary)",
//         padding: "20px",
//       }}
//     >
//       {/* Header */}
//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
//         <div>
//           <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>
//             L4 Load Balancer
//           </div>
//           <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)", marginTop: "2px" }}>
//             {wsStatus === "live" ? "● live data" : wsStatus === "connecting" ? "◌ connecting..." : "◎ demo mode"}
//             &nbsp;·&nbsp;{ALGO_LABELS[algo] ?? algo}
//           </div>
//         </div>
//         <div style={{ display: "flex", gap: "8px" }}>
//           {[
//             { label: "Requests", val: totalReq.toLocaleString() },
//             { label: "Dropped", val: dropped.toString(), danger: dropped > 0 },
//             { label: "Req/sec", val: rps.toString() },
//             ...(metrics ? [{ label: "Bytes in", val: fmtBytes(metrics.bytes_in) }] : []),
//           ].map((s) => (
//             <div
//               key={s.label}
//               style={{
//                 background: "var(--color-background-secondary)",
//                 borderRadius: "8px",
//                 padding: "6px 12px",
//                 textAlign: "center",
//                 minWidth: "72px",
//               }}
//             >
//               <div style={{ fontSize: "10px", color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
//                 {s.label}
//               </div>
//               <div style={{ fontSize: "16px", fontWeight: 500, color: s.danger ? "var(--color-text-danger)" : "var(--color-text-primary)", marginTop: "2px" }}>
//                 {s.val}
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Scenario buttons */}
//       <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
//         {(Object.keys(SCENARIO_META) as Scenario[]).map((sc) => {
//           const m = SCENARIO_META[sc];
//           const active = scenario === sc;
//           const moodBorder = { info: "#3B82F6", warn: "#F59E0B", danger: "#EF4444", success: "#10B981" }[m.mood];
//           return (
//             <button
//               key={sc}
//               onClick={() => applyScenario(sc)}
//               style={{
//                 padding: "5px 12px",
//                 fontSize: "11px",
//                 border: `0.5px solid ${active ? moodBorder : "var(--color-border-secondary)"}`,
//                 borderRadius: "8px",
//                 background: active ? moodBorder + "18" : "transparent",
//                 color: active ? moodBorder : "var(--color-text-secondary)",
//                 cursor: "pointer",
//                 transition: "all .15s",
//                 fontFamily: "inherit",
//               }}
//             >
//               {m.label}
//             </button>
//           );
//         })}
//       </div>

//       {/* Story box */}
//       <div
//         style={{
//           padding: "10px 14px",
//           marginBottom: "12px",
//           fontSize: "12px",
//           lineHeight: "1.6",
//           borderRadius: "8px",
//           border: `0.5px solid`,
//           borderColor: { info: "#3B82F620", warn: "#F59E0B20", danger: "#EF444420", success: "#10B98120" }[sc.mood],
//           background: { info: "#3B82F608", warn: "#F59E0B08", danger: "#EF444408", success: "#10B98108" }[sc.mood],
//           color: { info: "#60A5FA", warn: "#FBBF24", danger: "#F87171", success: "#34D399" }[sc.mood],
//           transition: "all .3s",
//         }}
//       >
//         {sc.text}
//       </div>

//       {/* Canvas */}
//       <div
//         ref={wrapRef}
//         style={{
//           position: "relative",
//           width: "100%",
//           height: "260px",
//           background: "var(--color-background-secondary)",
//           borderRadius: "12px",
//           border: "0.5px solid var(--color-border-tertiary)",
//           overflow: "hidden",
//           marginBottom: "10px",
//         }}
//       >
//         <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
//       </div>

//       {/* Server rows */}
//       <div style={{ display: "grid", gap: "6px", marginBottom: "10px" }}>
//         {backendStats.map((s, i) => {
//           const barW = Math.round((s.req / maxReq) * 100);
//           const pct = Math.round((s.req / Math.max(totalReq, 1)) * 100);
//           const dotColor = !s.alive ? "#EF4444" : s.slow ? "#F59E0B" : s.recovering ? "#3B82F6" : "#10B981";
//           const badge = !s.alive ? "DOWN" : s.slow ? "SLOW" : s.recovering ? "RECOVERING" : "ALIVE";
//           const badgeColor = !s.alive ? "#EF4444" : s.slow ? "#F59E0B" : s.recovering ? "#3B82F6" : "#10B981";
//           const barColor = !s.alive ? "#EF444440" : s.slow ? "#F59E0B" : s.recovering ? "#3B82F6" : s.color;
//           return (
//             <div
//               key={i}
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "90px 1fr 56px 44px 88px",
//                 alignItems: "center",
//                 gap: "10px",
//                 background: "var(--color-background-primary)",
//                 border: `0.5px solid ${s.slow ? "#F59E0B30" : !s.alive ? "#EF444430" : "var(--color-border-tertiary)"}`,
//                 borderRadius: "8px",
//                 padding: "7px 12px",
//                 opacity: s.alive ? 1 : 0.5,
//                 transition: "all .3s",
//               }}
//             >
//               <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
//                 <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: dotColor, flexShrink: 0, display: "inline-block" }} />
//                 {s.label}
//               </div>
//               <div style={{ height: "5px", background: "var(--color-border-tertiary)", borderRadius: "3px", overflow: "hidden" }}>
//                 <div style={{ height: "100%", width: `${barW}%`, background: barColor, borderRadius: "3px", transition: "width .5s ease" }} />
//               </div>
//               <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", textAlign: "right" }}>{s.req} req</div>
//               <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", textAlign: "right" }}>{pct}%</div>
//               <div>
//                 <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "6px", background: badgeColor + "18", color: badgeColor }}>
//                   {badge}
//                 </span>
//               </div>
//             </div>
//           );
//         })}
//       </div>

//       {/* Log */}
//       <div
//         style={{
//           fontFamily: "'JetBrains Mono', monospace",
//           fontSize: "11px",
//           lineHeight: "1.8",
//           color: "var(--color-text-tertiary)",
//           maxHeight: "80px",
//           overflowY: "auto",
//           background: "var(--color-background-secondary)",
//           borderRadius: "8px",
//           padding: "8px 12px",
//         }}
//       >
//         {logs.map((l, i) => (
//           <div
//             key={i}
//             style={{ color: l.type === "err" ? "#F87171" : l.type === "ok" ? "#34D399" : l.type === "warn" ? "#FBBF24" : "var(--color-text-tertiary)" }}
//           >
//             [{l.time}] {l.msg}
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

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
  least_conn: "Least Conn",
  random: "Random",
};

const SCENARIO_META: Record<Scenario, { label: string; mood: "info" | "warn" | "danger" | "success"; text: string }> = {
  normal: { label: "Normal traffic", mood: "info", text: "Normal traffic — load balancer distributing requests evenly across all healthy servers via Round Robin." },
  crash: { label: "Server crash", mood: "danger", text: "Server 2 crashed! Health check detects failure → load balancer auto-reroutes all traffic to surviving servers." },
  overload: { label: "Overload problem", mood: "warn", text: "Server 1 is overloaded (850ms latency). Round Robin keeps sending it traffic equally — this is why Least Connections beats RR under uneven load." },
  rr_uneven: { label: "RR uneven load", mood: "warn", text: "Round Robin assigns turns equally — but Server 3 handles heavier jobs. Queue builds up. Weighted Round Robin or Least Connections solves this." },
  recovery: { label: "Server recovery", mood: "success", text: "Server 2 is back online. Health check passes → added back to pool gradually. Traffic redistributes without any downtime." },
  burst: { label: "Traffic burst", mood: "warn", text: "5× traffic spike! Least Connections algorithm active — new requests go to least busy server. No single backend gets overwhelmed." },
};

const WS_URL = (import.meta as any).env?.VITE_WS_URL ?? "ws://localhost:9001/metrics";

function fmtBytes(b: number): string {
  if (b >= 1_000_000) return (b / 1_000_000).toFixed(1) + " MB";
  if (b >= 1_000) return (b / 1_000).toFixed(1) + " KB";
  return b + " B";
}

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
  const speedRef = useRef(5); // 1-10

  const [scenario, setScenario] = useState<Scenario>("normal");
  const [metrics, setMetrics] = useState<MetricsFrame | null>(null);
  const [wsStatus, setWsStatus] = useState<"connecting" | "live" | "demo">("demo");
  const [totalReq, setTotalReq] = useState(0);
  const [dropped, setDropped] = useState(0);
  const [rps, setRps] = useState(0);
  const [speed, setSpeed] = useState(5);
  const [logs, setLogs] = useState<LogEntry[]>([
    { time: nowStr(), msg: "Load balancer started on :8080", type: "ok" },
    { time: nowStr(), msg: "3 backends registered, health checks active", type: "info" },
  ]);
  const [backendStats, setBackendStats] = useState([
    { label: "Server 1", req: 0, conn: 0, alive: true, slow: false, recovering: false, color: COLORS[0] },
    { label: "Server 2", req: 0, conn: 0, alive: true, slow: false, recovering: false, color: COLORS[1] },
    { label: "Server 3", req: 0, conn: 0, alive: true, slow: false, recovering: false, color: COLORS[2] },
  ]);
  const [algo, setAlgo] = useState("round_robin");
  const [running, setRunning] = useState(true);
  const runningRef = useRef(true);

  const addLog = useCallback((msg: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [{ time: nowStr(), msg, type }, ...prev].slice(0, 15));
  }, []);

  // WebSocket
  useEffect(() => {
    setWsStatus("connecting");
    let ws: WebSocket;
    try {
      ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onopen = () => { setWsStatus("live"); addLog(`Connected to ${WS_URL}`, "ok"); };
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
      ws.onerror = () => { setWsStatus("demo"); addLog("WebSocket unavailable — demo mode", "warn"); };
      ws.onclose = () => { setWsStatus("demo"); };
    } catch { setWsStatus("demo"); }
    return () => { wsRef.current?.close(); };
  }, []);

  // Sync serversRef
  useEffect(() => {
    serversRef.current = backendStats.map((s) => ({
      req: s.req, conn: s.conn, alive: s.alive, slow: s.slow, recovering: s.recovering,
    }));
  }, [backendStats]);

  // Canvas
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
      const lineC = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
      const srvs = serversRef.current;
      const total = srvs.length;

      ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
      srvs.forEach((s, i) => {
        const p = srvPos(i, total);
        ctx.strokeStyle = !s.alive ? "rgba(239,68,68,0.2)" : s.slow ? "rgba(245,158,11,0.3)" : lineC;
        ctx.globalAlpha = s.alive ? 1 : 0.25;
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

      // Speed multiplier for packets
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

  // Demo spawn loop
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
      if (!alive.length) { setDropped((d) => d + 1); addLog("ERROR: No healthy servers — packet dropped!", "err"); return; }

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
      // Speed: 1 = very slow (300ms), 10 = very fast (20ms)
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
      const next = prev.map((s) => ({ ...s, slow: false, recovering: false }));
      serversRef.current = next.map((s) => ({ req: s.req, conn: s.conn, alive: s.alive, slow: false, recovering: false }));
      if (sc === "crash") {
        if (next[1].alive) { next[1].alive = false; serversRef.current[1].alive = false; addLog("CRITICAL: Server 2 health check failed — marking DOWN", "err"); }
      }
      if (sc === "recovery") {
        next.forEach((s, i) => { s.alive = true; serversRef.current[i].alive = true; });
        next[1].recovering = true; serversRef.current[1].recovering = true;
        addLog("INFO: Server 2 health check passed — adding back to pool", "ok");
        setTimeout(() => { serversRef.current[1].recovering = false; setBackendStats((p) => p.map((s, i) => i === 1 ? { ...s, recovering: false } : s)); addLog("INFO: Server 2 fully active", "ok"); }, 3500);
      }
      if (sc === "overload") { next[0].slow = true; serversRef.current[0].slow = true; addLog("WARN: Server 1 latency spiked to 850ms", "warn"); }
      if (sc === "rr_uneven") { next[2].slow = true; serversRef.current[2].slow = true; addLog("WARN: Server 3 processing heavy jobs — queue building", "warn"); }
      if (sc === "burst") {
        addLog("INFO: Traffic burst — switching to Least Connections", "ok");
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
      return next;
    });
  }, [addLog]);

  const sc = SCENARIO_META[scenario];
  const maxReq = Math.max(...backendStats.map((s) => s.req), 1);

 const handleSpeedChange = (val: number) => {
    speedRef.current = val;
    setSpeed(val);
  }; 

  const toggleRunning = () => {
    runningRef.current = !runningRef.current;
    setRunning(runningRef.current);
    if (runningRef.current) addLog("INFO: Traffic resumed", "ok");
    else addLog("INFO: Traffic paused", "warn");
  };

  return (
    <div style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", background: "var(--color-background-primary)", borderRadius: "16px", border: "0.5px solid var(--color-border-tertiary)", padding: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text-primary)" }}>L4 Load Balancer</div>
          <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)", marginTop: "2px" }}>
            {wsStatus === "live" ? "● live data" : wsStatus === "connecting" ? "◌ connecting..." : "◎ demo mode"}
            &nbsp;·&nbsp;{ALGO_LABELS[algo] ?? algo}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { label: "Requests", val: totalReq.toLocaleString() },
            { label: "Dropped", val: dropped.toString(), danger: dropped > 0 },
            { label: "Req/sec", val: rps.toString() },
            ...(metrics ? [{ label: "Bytes in", val: fmtBytes(metrics.bytes_in) }] : []),
          ].map((s) => (
            <div key={s.label} style={{ background: "var(--color-background-secondary)", borderRadius: "8px", padding: "6px 12px", textAlign: "center", minWidth: "72px" }}>
              <div style={{ fontSize: "10px", color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
              <div style={{ fontSize: "16px", fontWeight: 500, color: (s as any).danger ? "var(--color-text-danger)" : "var(--color-text-primary)", marginTop: "2px" }}>{s.val}</div>
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
            <button key={sc} onClick={() => applyScenario(sc)} style={{ padding: "5px 12px", fontSize: "11px", border: `0.5px solid ${active ? moodBorder : "var(--color-border-secondary)"}`, borderRadius: "8px", background: active ? moodBorder + "18" : "transparent", color: active ? moodBorder : "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Speed Control */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", background: "var(--color-background-secondary)", borderRadius: "8px", padding: "10px 14px", flexWrap: "wrap" }}>
        <button onClick={toggleRunning} style={{ padding: "4px 12px", fontSize: "11px", border: `0.5px solid ${running ? "#10B981" : "#EF4444"}`, borderRadius: "6px", background: running ? "#10B98118" : "#EF444418", color: running ? "#10B981" : "#EF4444", cursor: "pointer", fontFamily: "inherit" }}>
          {running ? "⏸ Pause" : "▶ Resume"}
        </button>
        <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>Speed:</span>
        <span style={{ fontSize: "11px", color: "#EF4444" }}>Slow</span>
        <input type="range" min={1} max={10} value={speed} onChange={(e) => handleSpeedChange(Number(e.target.value))} style={{ flex: 1, minWidth: "100px", accentColor: "#8B5CF6" }} />
        <span style={{ fontSize: "11px", color: "#10B981" }}>Fast</span>
        <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)", minWidth: "24px" }}>{speed}x</span>
      </div>

      {/* Story box */}
      <div style={{ padding: "10px 14px", marginBottom: "12px", fontSize: "12px", lineHeight: "1.6", borderRadius: "8px", border: "0.5px solid", borderColor: { info: "#3B82F620", warn: "#F59E0B20", danger: "#EF444420", success: "#10B98120" }[sc.mood], background: { info: "#3B82F608", warn: "#F59E0B08", danger: "#EF444408", success: "#10B98108" }[sc.mood], color: { info: "#60A5FA", warn: "#FBBF24", danger: "#F87171", success: "#34D399" }[sc.mood] }}>
        {sc.text}
      </div>

      {/* Canvas */}
      <div ref={wrapRef} style={{ position: "relative", width: "100%", height: "260px", background: "var(--color-background-secondary)", borderRadius: "12px", border: "0.5px solid var(--color-border-tertiary)", overflow: "hidden", marginBottom: "10px" }}>
        <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
      </div>

      {/* Server rows */}
      <div style={{ display: "grid", gap: "6px", marginBottom: "10px" }}>
        {backendStats.map((s, i) => {
          const barW = Math.round((s.req / maxReq) * 100);
          const pct = Math.round((s.req / Math.max(totalReq, 1)) * 100);
          const dotColor = !s.alive ? "#EF4444" : s.slow ? "#F59E0B" : s.recovering ? "#3B82F6" : "#10B981";
          const badge = !s.alive ? "DOWN" : s.slow ? "SLOW" : s.recovering ? "RECOVERING" : "ALIVE";
          const badgeColor = !s.alive ? "#EF4444" : s.slow ? "#F59E0B" : s.recovering ? "#3B82F6" : "#10B981";
          const barColor = !s.alive ? "#EF444440" : s.slow ? "#F59E0B" : s.recovering ? "#3B82F6" : s.color;
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "90px 1fr 56px 44px 88px", alignItems: "center", gap: "10px", background: "var(--color-background-primary)", border: `0.5px solid ${s.slow ? "#F59E0B30" : !s.alive ? "#EF444430" : "var(--color-border-tertiary)"}`, borderRadius: "8px", padding: "7px 12px", opacity: s.alive ? 1 : 0.5 }}>
              <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: dotColor, flexShrink: 0, display: "inline-block" }} />
                {s.label}
              </div>
              <div style={{ height: "5px", background: "var(--color-border-tertiary)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${barW}%`, background: barColor, borderRadius: "3px", transition: "width .5s ease" }} />
              </div>
              <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", textAlign: "right" }}>{s.req} req</div>
              <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", textAlign: "right" }}>{pct}%</div>
              <div><span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "6px", background: badgeColor + "18", color: badgeColor }}>{badge}</span></div>
            </div>
          );
        })}
      </div>

      {/* Log */}
      <div style={{ fontFamily: "monospace", fontSize: "11px", lineHeight: "1.8", color: "var(--color-text-tertiary)", maxHeight: "80px", overflowY: "auto", background: "var(--color-background-secondary)", borderRadius: "8px", padding: "8px 12px" }}>
        {logs.map((l, i) => (
          <div key={i} style={{ color: l.type === "err" ? "#F87171" : l.type === "ok" ? "#34D399" : l.type === "warn" ? "#FBBF24" : "var(--color-text-tertiary)" }}>
            [{l.time}] {l.msg}
          </div>
        ))}
      </div>
    </div>
  );
} 