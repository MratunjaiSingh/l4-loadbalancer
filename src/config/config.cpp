  #include "config.hpp"

namespace lb {

Config Config::from_args(
    const std::string& host,
    uint16_t port,
    const std::vector<std::string>& backends)
{
    Config cfg;
    cfg.host = host;
    cfg.port = port;
    cfg.backends = backends;
    return cfg;
}

} // namespace lb 