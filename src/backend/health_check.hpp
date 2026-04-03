#pragma once
#define _WIN32_WINNT 0x0601
#include <boost/asio.hpp>
#include <memory>
#include <chrono>
#include <iostream>
#include "backend_pool.hpp"

namespace lb {

class HealthChecker {
public:
    HealthChecker(
        boost::asio::io_context& ioc,
        std::shared_ptr<BackendPool> pool
    ) : ioc_(ioc), pool_(pool), timer_(ioc) {}

    void start() { do_check(); }

private:
    void do_check() {
        for (auto& b : pool_->all()) {
            try {
                boost::asio::ip::tcp::socket sock(ioc_);
                boost::asio::ip::tcp::endpoint ep(
                    boost::asio::ip::make_address(b->host),
                    b->port
                );
                boost::system::error_code ec;
                sock.connect(ep, ec);
                bool was_alive = b->alive.load();
                b->alive = !ec;
                if (was_alive && ec)
                    std::cout << "[health] " << b->host
                        << ":" << b->port << " DOWN!" << std::endl;
                else if (!was_alive && !ec)
                    std::cout << "[health] " << b->host
                        << ":" << b->port << " UP!" << std::endl;
            } catch(...) {}
        }
        timer_.expires_after(std::chrono::seconds(3));
        timer_.async_wait([this](boost::system::error_code ec) {
            if (!ec) do_check();
        });
    }

    boost::asio::io_context& ioc_;
    std::shared_ptr<BackendPool> pool_;
    boost::asio::steady_timer timer_;
};

} // namespace lb 