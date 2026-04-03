  #include "connection.hpp"
#include <spdlog/spdlog.h>

namespace lb {

Connection::Connection(
    boost::asio::io_context& ioc,
    boost::asio::ip::tcp::socket client_sock,
    std::shared_ptr<Backend> backend
) : ioc_(ioc),
    client_(std::move(client_sock)),
    server_(ioc),
    backend_(std::move(backend))
{
    backend_->active_conn++;
    backend_->total_req++;
}

void Connection::start() {
    connect_to_backend();
}

void Connection::connect_to_backend() {
    auto self = shared_from_this();
    boost::asio::ip::tcp::endpoint ep(
        boost::asio::ip::make_address(backend_->host),
        backend_->port
    );

    server_.async_connect(ep,
        [this, self](boost::system::error_code ec) {
            if (ec) {
                spdlog::error("Backend connect failed: {}", ec.message());
                backend_->alive = false;
                backend_->active_conn--;
                return;
            }
            // Start bidirectional proxy
            do_proxy(client_, server_, client_buf_);
            do_proxy(server_, client_, server_buf_);
        }
    );
}

void Connection::do_proxy(
    boost::asio::ip::tcp::socket& from,
    boost::asio::ip::tcp::socket& to,
    std::vector<uint8_t>& buf
) {
    auto self = shared_from_this();
    from.async_read_some(
        boost::asio::buffer(buf),
        [this, self, &from, &to, &buf](
            boost::system::error_code ec, std::size_t n)
        {
            if (ec) {
                backend_->active_conn--;
                client_.close();
                server_.close();
                return;
            }
            boost::asio::async_write(
                to,
                boost::asio::buffer(buf, n),
                [this, self, &from, &to, &buf](
                    boost::system::error_code ec, std::size_t)
                {
                    if (!ec) do_proxy(from, to, buf);
                    else {
                        backend_->active_conn--;
                        client_.close();
                        server_.close();
                    }
                }
            );
        }
    );
}

} // namespace lb 
