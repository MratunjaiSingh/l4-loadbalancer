  #pragma once
#include <boost/asio.hpp>
#include <memory>
#include "../backend/backend_pool.hpp"

namespace lb {

class Connection : public std::enable_shared_from_this<Connection> {
public:
    Connection(
        boost::asio::io_context& ioc,
        boost::asio::ip::tcp::socket client_sock,
        std::shared_ptr<Backend> backend
    );

    void start();

private:
    void connect_to_backend();
    void do_proxy(
        boost::asio::ip::tcp::socket& from,
        boost::asio::ip::tcp::socket& to,
        std::vector<uint8_t>& buf
    );

    boost::asio::io_context& ioc_;
    boost::asio::ip::tcp::socket client_;
    boost::asio::ip::tcp::socket server_;
    std::shared_ptr<Backend> backend_;

    std::vector<uint8_t> client_buf_ = std::vector<uint8_t>(65536);
    std::vector<uint8_t> server_buf_ = std::vector<uint8_t>(65536);
};

} // namespace lb 