  #pragma once
#include <memory>
#include <atomic>
#include "../backend/backend_pool.hpp"

namespace lb {

class RoundRobin {
public:
    explicit RoundRobin(std::shared_ptr<BackendPool> pool)
        : pool_(std::move(pool)) {}

    std::shared_ptr<Backend> next() {
        auto alive = pool_->alive_backends();
        if (alive.empty()) return nullptr;
        
        uint64_t idx = counter_.fetch_add(1) % alive.size();
        return alive[idx];
    }

private:
    std::shared_ptr<BackendPool> pool_;
    std::atomic<uint64_t> counter_{0};
};

} // namespace lb 