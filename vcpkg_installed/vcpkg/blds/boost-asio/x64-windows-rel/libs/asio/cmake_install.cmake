# Install script for directory: C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/boost-asio/src/ost-1.90.0-e2c2359ce3.clean/libs/asio

# Set the install prefix
if(NOT DEFINED CMAKE_INSTALL_PREFIX)
  set(CMAKE_INSTALL_PREFIX "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/pkgs/boost-asio_x64-windows")
endif()
string(REGEX REPLACE "/$" "" CMAKE_INSTALL_PREFIX "${CMAKE_INSTALL_PREFIX}")

# Set the install configuration name.
if(NOT DEFINED CMAKE_INSTALL_CONFIG_NAME)
  if(BUILD_TYPE)
    string(REGEX REPLACE "^[^A-Za-z0-9_]+" ""
           CMAKE_INSTALL_CONFIG_NAME "${BUILD_TYPE}")
  else()
    set(CMAKE_INSTALL_CONFIG_NAME "Release")
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
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include" TYPE DIRECTORY FILES "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/boost-asio/src/ost-1.90.0-e2c2359ce3.clean/libs/asio/include/")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  if(EXISTS "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio_core-1.90.0/boost_asio_core-targets.cmake")
    file(DIFFERENT _cmake_export_file_changed FILES
         "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio_core-1.90.0/boost_asio_core-targets.cmake"
         "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/boost-asio/x64-windows-rel/libs/asio/CMakeFiles/Export/437c5f7b1e5b1898b2fc4723462095b4/boost_asio_core-targets.cmake")
    if(_cmake_export_file_changed)
      file(GLOB _cmake_old_config_files "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio_core-1.90.0/boost_asio_core-targets-*.cmake")
      if(_cmake_old_config_files)
        string(REPLACE ";" ", " _cmake_old_config_files_text "${_cmake_old_config_files}")
        message(STATUS "Old export file \"$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio_core-1.90.0/boost_asio_core-targets.cmake\" will be replaced.  Removing files [${_cmake_old_config_files_text}].")
        unset(_cmake_old_config_files_text)
        file(REMOVE ${_cmake_old_config_files})
      endif()
      unset(_cmake_old_config_files)
    endif()
    unset(_cmake_export_file_changed)
  endif()
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio_core-1.90.0" TYPE FILE FILES "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/boost-asio/x64-windows-rel/libs/asio/CMakeFiles/Export/437c5f7b1e5b1898b2fc4723462095b4/boost_asio_core-targets.cmake")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio_core-1.90.0" TYPE FILE FILES "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/boost-asio/x64-windows-rel/libs/asio/tmpinst/boost_asio_core-config.cmake")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio_core-1.90.0" TYPE FILE FILES "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/boost-asio/x64-windows-rel/libs/asio/tmpinst/boost_asio_core-config-version.cmake")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  if(EXISTS "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio_deadline_timer-1.90.0/boost_asio_deadline_timer-targets.cmake")
    file(DIFFERENT _cmake_export_file_changed FILES
         "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio_deadline_timer-1.90.0/boost_asio_deadline_timer-targets.cmake"
         "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/boost-asio/x64-windows-rel/libs/asio/CMakeFiles/Export/8c15dee22b00bf4d0f64e18e34d34d71/boost_asio_deadline_timer-targets.cmake")
    if(_cmake_export_file_changed)
      file(GLOB _cmake_old_config_files "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio_deadline_timer-1.90.0/boost_asio_deadline_timer-targets-*.cmake")
      if(_cmake_old_config_files)
        string(REPLACE ";" ", " _cmake_old_config_files_text "${_cmake_old_config_files}")
        message(STATUS "Old export file \"$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio_deadline_timer-1.90.0/boost_asio_deadline_timer-targets.cmake\" will be replaced.  Removing files [${_cmake_old_config_files_text}].")
        unset(_cmake_old_config_files_text)
        file(REMOVE ${_cmake_old_config_files})
      endif()
      unset(_cmake_old_config_files)
    endif()
    unset(_cmake_export_file_changed)
  endif()
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio_deadline_timer-1.90.0" TYPE FILE FILES "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/boost-asio/x64-windows-rel/libs/asio/CMakeFiles/Export/8c15dee22b00bf4d0f64e18e34d34d71/boost_asio_deadline_timer-targets.cmake")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio_deadline_timer-1.90.0" TYPE FILE FILES "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/boost-asio/x64-windows-rel/libs/asio/tmpinst/boost_asio_deadline_timer-config.cmake")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio_deadline_timer-1.90.0" TYPE FILE FILES "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/boost-asio/x64-windows-rel/libs/asio/tmpinst/boost_asio_deadline_timer-config-version.cmake")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  if(EXISTS "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio_spawn-1.90.0/boost_asio_spawn-targets.cmake")
    file(DIFFERENT _cmake_export_file_changed FILES
         "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio_spawn-1.90.0/boost_asio_spawn-targets.cmake"
         "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/boost-asio/x64-windows-rel/libs/asio/CMakeFiles/Export/3fb76d3a94e7a465c8481993bd7af4fa/boost_asio_spawn-targets.cmake")
    if(_cmake_export_file_changed)
      file(GLOB _cmake_old_config_files "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio_spawn-1.90.0/boost_asio_spawn-targets-*.cmake")
      if(_cmake_old_config_files)
        string(REPLACE ";" ", " _cmake_old_config_files_text "${_cmake_old_config_files}")
        message(STATUS "Old export file \"$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio_spawn-1.90.0/boost_asio_spawn-targets.cmake\" will be replaced.  Removing files [${_cmake_old_config_files_text}].")
        unset(_cmake_old_config_files_text)
        file(REMOVE ${_cmake_old_config_files})
      endif()
      unset(_cmake_old_config_files)
    endif()
    unset(_cmake_export_file_changed)
  endif()
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio_spawn-1.90.0" TYPE FILE FILES "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/boost-asio/x64-windows-rel/libs/asio/CMakeFiles/Export/3fb76d3a94e7a465c8481993bd7af4fa/boost_asio_spawn-targets.cmake")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio_spawn-1.90.0" TYPE FILE FILES "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/boost-asio/x64-windows-rel/libs/asio/tmpinst/boost_asio_spawn-config.cmake")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio_spawn-1.90.0" TYPE FILE FILES "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/boost-asio/x64-windows-rel/libs/asio/tmpinst/boost_asio_spawn-config-version.cmake")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  if(EXISTS "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio-1.90.0/boost_asio-targets.cmake")
    file(DIFFERENT _cmake_export_file_changed FILES
         "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio-1.90.0/boost_asio-targets.cmake"
         "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/boost-asio/x64-windows-rel/libs/asio/CMakeFiles/Export/c8169e2e69393d799d419799887602e2/boost_asio-targets.cmake")
    if(_cmake_export_file_changed)
      file(GLOB _cmake_old_config_files "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio-1.90.0/boost_asio-targets-*.cmake")
      if(_cmake_old_config_files)
        string(REPLACE ";" ", " _cmake_old_config_files_text "${_cmake_old_config_files}")
        message(STATUS "Old export file \"$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio-1.90.0/boost_asio-targets.cmake\" will be replaced.  Removing files [${_cmake_old_config_files_text}].")
        unset(_cmake_old_config_files_text)
        file(REMOVE ${_cmake_old_config_files})
      endif()
      unset(_cmake_old_config_files)
    endif()
    unset(_cmake_export_file_changed)
  endif()
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio-1.90.0" TYPE FILE FILES "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/boost-asio/x64-windows-rel/libs/asio/CMakeFiles/Export/c8169e2e69393d799d419799887602e2/boost_asio-targets.cmake")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio-1.90.0" TYPE FILE FILES "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/boost-asio/x64-windows-rel/libs/asio/tmpinst/boost_asio-config.cmake")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib/cmake/boost_asio-1.90.0" TYPE FILE FILES "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/boost-asio/x64-windows-rel/libs/asio/tmpinst/boost_asio-config-version.cmake")
endif()

string(REPLACE ";" "\n" CMAKE_INSTALL_MANIFEST_CONTENT
       "${CMAKE_INSTALL_MANIFEST_FILES}")
if(CMAKE_INSTALL_LOCAL_ONLY)
  file(WRITE "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/boost-asio/x64-windows-rel/libs/asio/install_local_manifest.txt"
     "${CMAKE_INSTALL_MANIFEST_CONTENT}")
endif()
