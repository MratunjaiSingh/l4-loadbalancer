/**
 * collector.hpp
 * Path: src/metrics/collector.hpp
 *
 * Thread-safe metrics collector using atomics.
 * Call record_*() from hot path (connection handler).
 * Call snapshot() from the WebSocket push thread every 500ms.
 */

#pragma once
#include <atomic>
#include <vector>
#include <string>
#include <mutex>
#include <chrono>

namespace lb {

struct BackendSnapshot {
    std::string addr;
    bool        alive;
    uint64_t    total_requests;
    uint32_t    active_connections;
    double      avg_latency_ms;
};

struct MetricsSnapshot {
    uint64_t    total_connections;
    uint64_t    bytes_in;
    uint64_t    bytes_out;
    uint32_t    requests_per_second;
    std::string algorithm;
    std::vector<BackendSnapshot> backends;
};

// ── Per-backend stats (one per BackendServer) ─────────────────────────────────
struct BackendMetrics {
    std::string addr;
    std::atomic<bool>     alive{true};
    std::atomic<uint64_t> total_req{0};
    std::atomic<uint32_t> active_conn{0};
    std::atomic<uint64_t> latency_sum_us{0};  // sum of latencies in microseconds
    std::atomic<uint64_t> latency_count{0};

    // Called when a connection is accepted and routed to this backend
    void on_request_start() {
        ++total_req;
        ++active_conn;
    }

    // Called when the connection closes
    void on_request_end(std::chrono::microseconds latency) {
        if (active_conn > 0) --active_conn;
        latency_sum_us += static_cast<uint64_t>(latency.count());
        ++latency_count;
    }

    double avg_latency_ms() const {
        const auto count = latency_count.load();
        if (count == 0) return 0.0;
        return static_cast<double>(latency_sum_us.load()) / count / 1000.0;
    }
};

// ── Global metrics collector (singleton) ─────────────────────────────────────
class MetricsCollector {
public:
    static MetricsCollector& instance() {
        static MetricsCollector inst;
        return inst;
    }

    // ── Record ────────────────────────────────────────────────────────────────
    void record_connection()                  { ++total_connections_; }
    void record_bytes_in(uint64_t n)          { bytes_in_ += n; }
    void record_bytes_out(uint64_t n)         { bytes_out_ += n; }
    void record_request()                     { ++sec_counter_; }

    // ── Configure algorithm name (call from balancer) ─────────────────────────
    void set_algorithm(std::string name) {
        std::lock_guard lock(algo_mtx_);
        algorithm_ = std::move(name);
    }

    // ── Register backends ─────────────────────────────────────────────────────
    // Call once at startup for each backend server.
    BackendMetrics& register_backend(const std::string& addr) {
        std::lock_guard lock(backends_mtx_);
        backends_.emplace_back(std::make_unique<BackendMetrics>());
        backends_.back()->addr = addr;
        return *backends_.back();
    }

    // ── Snapshot (called from WS push loop, every 500ms) ─────────────────────
    MetricsSnapshot snapshot() {
        MetricsSnapshot snap;
        snap.total_connections = total_connections_.load();
        snap.bytes_in          = bytes_in_.load();
        snap.bytes_out         = bytes_out_.load();

        // RPS: swap counter, divide by 0.5s interval
        const uint64_t cnt = sec_counter_.exchange(0);
        snap.requests_per_second = static_cast<uint32_t>(cnt * 2); // per 500ms -> per 1s

        { std::lock_guard lock(algo_mtx_);  snap.algorithm = algorithm_; }

        {
            std::lock_guard lock(backends_mtx_);
            for (const auto& b : backends_) {
                snap.backends.push_back({
                    b->addr,
                    b->alive.load(),
                    b->total_req.load(),
                    b->active_conn.load(),
                    b->avg_latency_ms(),
                });
            }
        }
        return snap;
    }

private:
    MetricsCollector() = default;

    std::atomic<uint64_t> total_connections_{0};
    std::atomic<uint64_t> bytes_in_{0};
    std::atomic<uint64_t> bytes_out_{0};
    std::atomic<uint64_t> sec_counter_{0};

    std::string algorithm_{"round_robin"};
    std::mutex  algo_mtx_;

    std::vector<std::unique_ptr<BackendMetrics>> backends_;
    std::mutex backends_mtx_;
};

} // namespace lb
