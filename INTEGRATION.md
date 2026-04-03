# LoadBalancerSimulator — Integration Guide

## File locations

```
l4-loadbalancer/
├── src/metrics/
│   ├── collector.hpp       ← copy from this guide
│   ├── ws_server.hpp       ← copy from this guide
│   └── ws_server.cpp       ← copy from this guide
└── dashboard/
    └── src/components/
        └── LoadBalancerSimulator.tsx  ← copy from this guide
```

---

## Step 1 — Add to React dashboard

### Install dependencies
```bash
cd dashboard
npm install
```

### Add to your main dashboard page
```tsx
// dashboard/src/App.tsx  (or Dashboard.tsx)
import LoadBalancerSimulator from "./components/LoadBalancerSimulator";

export default function App() {
  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px" }}>
      <LoadBalancerSimulator />
    </div>
  );
}
```

### Set WebSocket URL in .env
```bash
# dashboard/.env
VITE_WS_URL=ws://localhost:9001/metrics

# Production (Fly.io)
# VITE_WS_URL=wss://your-app.fly.dev/metrics
```

---

## Step 2 — Add vcpkg dependencies

```json
// vcpkg.json — add these if not already present
{
  "dependencies": [
    "boost-asio",
    "uwebsockets",
    "nlohmann-json",
    "spdlog",
    "yaml-cpp",
    "prometheus-cpp",
    "cli11",
    "catch2"
  ]
}
```

---

## Step 3 — Hook into C++ backend

### In main.cpp
```cpp
#include "metrics/collector.hpp"
#include "metrics/ws_server.hpp"

int main() {
    auto& metrics = lb::MetricsCollector::instance();

    // Register backends at startup
    auto& b1 = metrics.register_backend("10.0.0.1:3000");
    auto& b2 = metrics.register_backend("10.0.0.2:3000");
    auto& b3 = metrics.register_backend("10.0.0.3:3000");

    metrics.set_algorithm("round_robin");

    // Start WebSocket push server (port 9001)
    lb::WsMetricsServer ws_server(metrics, 9001);
    ws_server.start();

    // ... rest of your load balancer startup
}
```

### In your connection proxy (hot path)
```cpp
// When a connection is accepted and routed to backend i:
auto start_time = std::chrono::steady_clock::now();
backend_metrics[i].on_request_start();
metrics.record_connection();
metrics.record_request();

// After connection closes:
auto latency = std::chrono::duration_cast<std::chrono::microseconds>(
    std::chrono::steady_clock::now() - start_time
);
backend_metrics[i].on_request_end(latency);
metrics.record_bytes_in(bytes_read);
metrics.record_bytes_out(bytes_written);
```

---

## Step 4 — CMakeLists.txt additions

```cmake
# Find uWebSockets
find_package(unofficial-uwebsockets CONFIG REQUIRED)

# Link to your lb target
target_link_libraries(l4lb PRIVATE
    unofficial::uwebsockets::uwebsockets
    nlohmann_json::nlohmann_json
    spdlog::spdlog
)
```

---

## Step 5 — Fly.io WebSocket support

```toml
# fly.toml — add WS port
[[services.ports]]
  port = 9001
  handlers = ["http"]   # Fly proxies WS over HTTP
```

And update `.env` in dashboard:
```
VITE_WS_URL=wss://your-app.fly.dev/metrics
```

---

## Demo mode (no C++ backend)

The React component **automatically falls back to demo mode** if the WebSocket
isn't available. So recruiters can see the simulation working even without
running your C++ backend locally.

The top-left indicator shows:
- `● live data` — connected to C++ backend
- `◌ connecting...` — trying to connect
- `◎ demo mode` — simulated data (no backend needed)
