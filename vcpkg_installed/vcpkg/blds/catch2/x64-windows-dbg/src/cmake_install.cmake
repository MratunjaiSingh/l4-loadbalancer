# Install script for directory: C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/catch2/src/v3.13.0-981ec6066a.clean/src

# Set the install prefix
if(NOT DEFINED CMAKE_INSTALL_PREFIX)
  set(CMAKE_INSTALL_PREFIX "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/pkgs/catch2_x64-windows/debug")
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
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib" TYPE STATIC_LIBRARY FILES "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/catch2/x64-windows-dbg/src/Catch2d.lib")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib/manual-link" TYPE STATIC_LIBRARY FILES "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/catch2/x64-windows-dbg/src/Catch2Maind.lib")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  if(EXISTS "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/cmake/Catch2/Catch2Targets.cmake")
    file(DIFFERENT _cmake_export_file_changed FILES
         "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/cmake/Catch2/Catch2Targets.cmake"
         "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/catch2/x64-windows-dbg/src/CMakeFiles/Export/fdf7af8c87c731050acff3e2de49ed47/Catch2Targets.cmake")
    if(_cmake_export_file_changed)
      file(GLOB _cmake_old_config_files "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/cmake/Catch2/Catch2Targets-*.cmake")
      if(_cmake_old_config_files)
        string(REPLACE ";" ", " _cmake_old_config_files_text "${_cmake_old_config_files}")
        message(STATUS "Old export file \"$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/cmake/Catch2/Catch2Targets.cmake\" will be replaced.  Removing files [${_cmake_old_config_files_text}].")
        unset(_cmake_old_config_files_text)
        file(REMOVE ${_cmake_old_config_files})
      endif()
      unset(_cmake_old_config_files)
    endif()
    unset(_cmake_export_file_changed)
  endif()
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib/cmake/Catch2" TYPE FILE FILES "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/catch2/x64-windows-dbg/src/CMakeFiles/Export/fdf7af8c87c731050acff3e2de49ed47/Catch2Targets.cmake")
  if(CMAKE_INSTALL_CONFIG_NAME MATCHES "^([Dd][Ee][Bb][Uu][Gg])$")
    file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib/cmake/Catch2" TYPE FILE FILES "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/catch2/x64-windows-dbg/src/CMakeFiles/Export/fdf7af8c87c731050acff3e2de49ed47/Catch2Targets-debug.cmake")
  endif()
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include" TYPE DIRECTORY FILES
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/catch2/src/v3.13.0-981ec6066a.clean/src/catch2"
    "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/catch2/x64-windows-dbg/generated-includes/catch2"
    FILES_MATCHING REGEX "/[^/]*\\.hpp$")
endif()

string(REPLACE ";" "\n" CMAKE_INSTALL_MANIFEST_CONTENT
       "${CMAKE_INSTALL_MANIFEST_FILES}")
if(CMAKE_INSTALL_LOCAL_ONLY)
  file(WRITE "C:/Projects/l4-loadbalancer/vcpkg_installed/vcpkg/blds/catch2/x64-windows-dbg/src/install_local_manifest.txt"
     "${CMAKE_INSTALL_MANIFEST_CONTENT}")
endif()
