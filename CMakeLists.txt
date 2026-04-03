 cmake_minimum_required(VERSION 3.25)
project(l4lb CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_compile_definitions(_WIN32_WINNT=0x0601)

find_package(Boost CONFIG REQUIRED COMPONENTS system)
find_package(spdlog CONFIG REQUIRED)
find_package(nlohmann_json CONFIG REQUIRED)
find_package(CLI11 CONFIG REQUIRED)

add_executable(l4lb
    src/main.cpp
    src/core/listener.cpp
    src/core/connection.cpp
    src/balancer/round_robin.cpp
    src/backend/backend_pool.cpp
    src/config/config.cpp
)

target_include_directories(l4lb PRIVATE src)

target_link_libraries(l4lb PRIVATE
    Boost::system
    spdlog::spdlog
    nlohmann_json::nlohmann_json
    CLI11::CLI11
) 