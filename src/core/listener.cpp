 #include "listener.hpp"
#include "connection.hpp"
#include <spdlog/spdlog.h>

namespace lb {

Listener::Listener(
    boost::asio::io_context& ioc,
    const std::string& host,
    uint16_t port,
    std::shared_ptr<RoundRobin> balancer
) : ioc_(ioc),
    acceptor_(ioc),
    balancer_(std::move(balancer))
{
    boost::asio::ip::tcp::endpoint ep(
        boost::asio::ip::make_address(host), port
    );
    acceptor_.open(ep.protocol());
    acceptor_.set_option(
        boost::asio::ip::tcp::acceptor::reuse_address(true)
    );
    acceptor_.bind(ep);
    acceptor_.listen();
    spdlog::info("Listening on {}:{}", host, port);
}

void Listener::start() {
    do_accept();
}

void Listener::do_accept() {
    acceptor_.async_accept(
        [this](boost::system::error_code ec,
               boost::asio::ip::tcp::socket client_sock)
        {
            if (!ec) {
                auto backend = balancer_->next();
                if (backend) {
                    spdlog::info("New connection -> {}:{}",
                        backend->host, backend->port);
                    auto conn = std::make_shared<Connection>(
                        ioc_,
                        std::move(client_sock),
                        backend
                    );
                    conn->start();
                } else {
                    spdlog::warn("No alive backends!");
                }
            }
            do_accept();
        }
    );
}

} // namespace lb 