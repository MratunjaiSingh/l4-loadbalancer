#define SPDLOG_ACTIVE_LEVEL SPDLOG_LEVEL_DEBUG
#include <boost/asio.hpp>
#include <spdlog/spdlog.h>
#include <CLI/CLI.hpp>
#include <iostream>
#include <string>
#include <vector>
#include "core/listener.hpp"
#include "backend/backend_pool.hpp"
#include "balancer/round_robin.hpp"

int main(int argc, char* argv[]) {
    spdlog::set_level(spdlog::level::debug);

    CLI::App app{"L4 Load Balancer"};
    std::string host = "0.0.0.0";
    uint16_t port = 8080;
    std::vector<std::string> backends;

    app.add_option("--host", host, "Listen host")->default_val("0.0.0.0");
    app.add_option("--port", port, "Listen port")->default_val(8080);
    app.add_option("--backend", backends, "Backend servers")
       ->required()
       ->expected(-1);

    CLI11_PARSE(app, argc, argv);

    std::cout << "Starting L4 Load Balancer on "
              << host << ":" << port << std::endl;
    for (auto& b : backends)
        std::cout << "  -> " << b << std::endl;

    boost::asio::io_context ioc;
    auto work = boost::asio::make_work_guard(ioc);

    auto pool     = std::make_shared<lb::BackendPool>(backends);
    auto balancer = std::make_shared<lb::RoundRobin>(pool);
    lb::Listener listener(ioc, host, port, balancer);
    listener.start();

    std::cout << "Listening on port " << port
              << " — press Ctrl+C to stop." << std::endl;

    boost::asio::signal_set signals(ioc, SIGINT, SIGTERM);
    signals.async_wait([&](auto, auto) {
        std::cout << "Shutting down..." << std::endl;
        work.reset();
        ioc.stop();
    });

    ioc.run();
    return 0;
} 