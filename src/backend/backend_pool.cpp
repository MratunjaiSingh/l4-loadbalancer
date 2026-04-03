  #include "backend_pool.hpp"
#include <spdlog/spdlog.h>

namespace lb {

void BackendPool::mark_dead(const std::string& host, uint16_t port) {
    std::lock_guard lock(mtx_);
    for (auto& b : backends_) {
        if (b->host == host && b->port == port) {
            b->alive = false;
            spdlog::warn("Backend {}:{} marked DOWN", host, port);
        }
    }
}

void BackendPool::mark_alive(const std::string& host, uint16_t port) {
    std::lock_guard lock(mtx_);
    for (auto& b : backends_) {
        if (b->host == host && b->port == port) {
            b->alive = true;
            spdlog::info("Backend {}:{} marked UP", host, port);
        }
    }
}

} // namespace lb 