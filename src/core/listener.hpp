  #pragma once
#include <boost/asio.hpp>
#include <memory>
#include "../balancer/round_robin.hpp"

namespace lb {

class Listener {
public:
    Listener(
        boost::asio::io_context& ioc,
        const std::string& host,
        uint16_t port,
        std::shared_ptr<RoundRobin> balancer
    );

    void start();

private:
    void do_accept();

    boost::asio::io_context& ioc_;
    boost::asio::ip::tcp::acceptor acceptor_;
    std::shared_ptr<RoundRobin> balancer_;
};

} // namespace lb 