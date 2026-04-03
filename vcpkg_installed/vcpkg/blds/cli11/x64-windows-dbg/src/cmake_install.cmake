# Install script for directory: C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/src

# Set the install prefix
if(NOT DEFINED CMAKE_INSTALL_PREFIX)
  set(CMAKE_INSTALL_PREFIX "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/pkgs/cli11_x64-windows/debug")
endif()
string(REGEX REPLACE "/$" "" CMAKE_INSTALL_PREFIX "${CMAKE_INSTALL_PREFIX}")

# Set the install configuration name.
if(NOT DEFINED CMAKE_INSTALL_CONFIG_NAME)
  if(BUILD_TYPE)
    string(REGEX REPLACE "^[^A-Za-z0-9_]+" ""
           CMAKE_INSTALL_CONFIG_NAME "${BUILD_TYPE}")
  else()
    set(CMAKE_INSTALL_CONFIG_NAME "Debug")
  endif()
  message(STATUS "Install configuration: \"${CMAKE_INSTALL_CONFIG_NAME}\"")
endif()

# Set the component getting installed.
if(NOT CMAKE_INSTALL_COMPONENT)
  if(COMPONENT)
    message(STATUS "Install component: \"${COMPONENT}\"")
    set(CMAKE_INSTALL_COMPONENT "${COMPONENT}")
  else()
    set(CMAKE_INSTALL_COMPONENT)
  endif()
endif()

# Is this installation the result of a crosscompile?
if(NOT DEFINED CMAKE_CROSSCOMPILING)
  set(CMAKE_CROSSCOMPILING "OFF")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib" TYPE STATIC_LIBRARY FILES "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/x64-windows-dbg/src/CLI11.lib")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include/CLI" TYPE FILE FILES
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/App.hpp"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/Config.hpp"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/ConfigFwd.hpp"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/Error.hpp"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/Formatter.hpp"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/FormatterFwd.hpp"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/Macros.hpp"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/Option.hpp"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/Split.hpp"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/StringTools.hpp"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/TypeTools.hpp"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/Validators.hpp"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/ExtraValidators.hpp"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/Version.hpp"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/Encoding.hpp"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/Argv.hpp"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/CLI.hpp"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/Timer.hpp"
    )
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include/CLI/impl" TYPE FILE FILES
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/impl/App_inl.hpp"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/impl/Config_inl.hpp"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/impl/Formatter_inl.hpp"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/impl/Option_inl.hpp"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/impl/Split_inl.hpp"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/impl/StringTools_inl.hpp"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/impl/Validators_inl.hpp"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/impl/ExtraValidators_inl.hpp"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/impl/Encoding_inl.hpp"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/src/v2.6.2-f0d9462a16.clean/include/CLI/impl/Argv_inl.hpp"
    )
endif()

string(REPLACE ";" "\n" CMAKE_INSTALL_MANIFEST_CONTENT
       "${CMAKE_INSTALL_MANIFEST_FILES}")
if(CMAKE_INSTALL_LOCAL_ONLY)
  file(WRITE "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/cli11/x64-windows-dbg/src/install_local_manifest.txt"
     "${CMAKE_INSTALL_MANIFEST_CONTENT}")
endif()
