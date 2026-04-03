/**
 * ws_server.hpp
 * Path: src/metrics/ws_server.hpp
 *
 * WebSocket server that pushes live metrics to the React dashboard every 500ms.
 * Uses uWebSockets (included via vcpkg).
 *
 * Usage in main.cpp:
 *   auto& collector = MetricsCollector::instance();
 *   WsMetricsServer ws_server(collector, 9001);
 *   ws_server.start(); // non-blocking, runs on its own thread
 */

#pragma once
#include <atomic>
#include <thread>
#include <string>
#include "collector.hpp"

namespace lb {

class WsMetricsServer {
public:
    explicit WsMetricsServer(MetricsCollector& collector, uint16_t port = 9001);
    ~WsMetricsServer();

    void start();   // launches background thread
    void stop();

private:
    MetricsCollector& collector_;
    uint16_t port_;
    std::atomic<bool> running_{false};
    std::thread thread_;

    std::string build_json_frame() const;
};

} // namespace lb
