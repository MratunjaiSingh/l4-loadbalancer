/**
 * ws_server.cpp
 * Path: src/metrics/ws_server.cpp
 *
 * Sends this JSON to every connected dashboard client every 500ms:
 *
 * {
 *   "connections": 142,
 *   "bytes_in": 8240192,
 *   "bytes_out": 9182304,
 *   "rps": 47,
 *   "algorithm": "round_robin",
 *   "backends": [
 *     {
 *       "addr": "10.0.0.1:3000",
 *       "alive": true,
 *       "conn": 47,
 *       "req": 312,
 *       "latency_ms": 12
 *     }
 *   ]
 * }
 *
 * Dependencies (vcpkg):
 *   uwebsockets, nlohmann-json, spdlog
 */

#include "ws_server.hpp"
#include <App.h>           // uWebSockets
#include <nlohmann/json.hpp>
#include <spdlog/spdlog.h>
#include <chrono>
#include <set>
#include <mutex>

using json = nlohmann::json;
using namespace std::chrono_literals;

namespace lb {

// ── Per-socket user data (empty for now, extend for auth etc.) ────────────────
struct WsUserData {};

WsMetricsServer::WsMetricsServer(MetricsCollector& collector, uint16_t port)
    : collector_(collector), port_(port) {}

WsMetricsServer::~WsMetricsServer() { stop(); }

void WsMetricsServer::start() {
    running_ = true;
    thread_ = std::thread([this] {
        std::set<uWS::WebSocket<false, true, WsUserData>*> clients;
        std::mutex clients_mtx;

        uWS::App()
            .ws<WsUserData>("/metrics", {
                // ── Connection opened ─────────────────────────────────────
                .open = [&](auto* ws) {
                    std::lock_guard lock(clients_mtx);
                    clients.insert(ws);
                    spdlog::info("[ws] dashboard client connected (total: {})", clients.size());
                },
                // ── Connection closed ─────────────────────────────────────
                .close = [&](auto* ws, int /*code*/, std::string_view /*msg*/) {
                    std::lock_guard lock(clients_mtx);
                    clients.erase(ws);
                    spdlog::info("[ws] dashboard client disconnected (total: {})", clients.size());
                },
                // ── Ignore incoming messages ──────────────────────────────
                .message = [](auto* /*ws*/, std::string_view, uWS::OpCode) {},
            })
            .listen(port_, [this](auto* token) {
                if (token) {
                    spdlog::info("[ws] metrics server listening on :{}", port_);
                } else {
                    spdlog::error("[ws] failed to bind port {}", port_);
                    running_ = false;
                }
            })
            // ── Push loop: broadcast metrics every 500ms ──────────────────
            .addTimeout(500, [&](uWS::Loop* loop) -> bool {
                if (!running_) return false; // stop the loop

                const std::string frame = build_json_frame();
                std::lock_guard lock(clients_mtx);
                for (auto* ws : clients) {
                    ws->send(frame, uWS::OpCode::TEXT);
                }
                return true; // reschedule
            })
            .run();
    });
}

void WsMetricsServer::stop() {
    running_ = false;
    if (thread_.joinable()) thread_.join();
}

// ── Build the JSON payload ─────────────────────────────────────────────────────
std::string WsMetricsServer::build_json_frame() const {
    const auto snap = collector_.snapshot(); // MetricsCollector::Snapshot

    json backends = json::array();
    for (const auto& b : snap.backends) {
        backends.push_back({
            {"addr",       b.addr},
            {"alive",      b.alive},
            {"conn",       b.active_connections},
            {"req",        b.total_requests},
            {"latency_ms", b.avg_latency_ms},
        });
    }

    json frame = {
        {"connections", snap.total_connections},
        {"bytes_in",    snap.bytes_in},
        {"bytes_out",   snap.bytes_out},
        {"rps",         snap.requests_per_second},
        {"algorithm",   snap.algorithm},
        {"backends",    backends},
    };

    return frame.dump();
}

} // namespace lb
