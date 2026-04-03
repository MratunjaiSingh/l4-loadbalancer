   #pragma once
#include <string>
#include <vector>

namespace lb {

struct Config {
    std::string host{"0.0.0.0"};
    uint16_t port{8080};
    std::vector<std::string> backends;

    static Config from_args(
        const std::string& host,
        uint16_t port,
        const std::vector<std::string>& backends
    );
};

} // namespace lb   