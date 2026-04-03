  #pragma once
#include <string>
#include <vector>
#include <mutex>
#include <atomic>

namespace lb {

struct Backend {
    std::string host;
    uint16_t port;
    std::atomic<bool> alive{true};
    std::atomic<uint32_t> active_conn{0};
    std::atomic<uint64_t> total_req{0};

    Backend(const std::string& addr) {
        auto colon = addr.find(':');
        host = addr.substr(0, colon);
        port = static_cast<uint16_t>(
            std::stoi(addr.substr(colon + 1))
        );
    }
};

class BackendPool {
public:
    explicit BackendPool(const std::vector<std::string>& addrs) {
        for (const auto& a : addrs)
            backends_.emplace_back(std::make_shared<Backend>(a));
    }

    std::vector<std::shared_ptr<Backend>> alive_backends() {
        std::lock_guard lock(mtx_);
        std::vector<std::shared_ptr<Backend>> result;
        for (auto& b : backends_)
            if (b->alive) result.push_back(b);
        return result;
    }

    std::vector<std::shared_ptr<Backend>>& all() { return backends_; }
    void mark_dead(const std::string& host, uint16_t port);
    void mark_alive(const std::string& host, uint16_t port);

private:
    std::vector<std::shared_ptr<Backend>> backends_;
    std::mutex mtx_;
};

} // namespace lb 