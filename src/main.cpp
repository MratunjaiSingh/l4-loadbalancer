 #include <iostream>
#include <string>
#include <vector>

#define _WIN32_WINNT 0x0601
#include <boost/asio.hpp>
#include "core/listener.hpp"
#include "backend/backend_pool.hpp"
#include "backend/health_check.hpp"
#include "balancer/round_robin.hpp"

int main(int argc, char* argv[]) {
    std::cout << "=== L4 Load Balancer ===" << std::endl;

    std::vector<std::string> backends;
    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];
        if (arg == "--backend" && i + 1 < argc) {
            backends.push_back(argv[++i]);
        }
    }

    if (backends.empty()) {
        std::cerr << "Usage: l4lb --backend IP:PORT" << std::endl;
        return 1;
    }

    std::cout << "Backends: " << backends.size() << std::endl;
    for (auto& b : backends)
        std::cout << "  -> " << b << std::endl;

    try {
        boost::asio::io_context ioc;
        auto work = boost::asio::make_work_guard(ioc);

        auto pool = std::make_shared<lb::BackendPool>(backends);
        auto balancer = std::make_shared<lb::RoundRobin>(pool);

        // Health checker — every 3 seconds
       //  lb::HealthChecker health(ioc, pool);
        // health.start();

        lb::Listener listener(ioc, "0.0.0.0", 8080, balancer);
        listener.start();

        std::cout << "Running on port 8080! Ctrl+ to stop." << std::endl;

        boost::asio::signal_set signals(ioc, SIGINT, SIGTERM);
        signals.async_wait([&](auto, auto) {
            std::cout << "Shutting down..." << std::endl;
            work.reset();
            ioc.stop();
        });

        ioc.run();
    } catch (std::exception& e) {
        std::cerr << "EXCEPTION: " << e.what() << std::endl;
        return 1;
    } catch (...) {
        std::cerr << "UNKNOWN EXCEPTION!" << std::endl;
        return 1;
    }
    return 0;
} 