Package: boost-optional:x64-windows@1.90.0#1

**Host Environment**

- Host: x64-windows
- Compiler: MSVC 19.50.35728.0
- CMake Version: 4.3.1
-    vcpkg-tool version: 2025-12-16-44bb3ce006467fc13ba37ca099f64077b8bbf84d
    vcpkg-readonly: true
    vcpkg-scripts version: 544a4c5c297e60e4ac4a5a1810df66748d908869

**To Reproduce**

`vcpkg install `

**Failure logs**

```
Downloading https://github.com/boostorg/optional/archive/boost-1.90.0.tar.gz -> boostorg-optional-boost-1.90.0.tar.gz
error: https://github.com/boostorg/optional/archive/boost-1.90.0.tar.gz: failed: status code 502
note: If you are using a proxy, please ensure your proxy settings are correct.
Possible causes are:
1. You are actually using an HTTP proxy, but setting HTTPS_PROXY variable to `https://address:port`.
This is not correct, because `https://` prefix claims the proxy is an HTTPS proxy, while your proxy (v2ray, shadowsocksr, etc...) is an HTTP proxy.
Try setting `http://address:port` to both HTTP_PROXY and HTTPS_PROXY instead.
2. If you are using Windows, vcpkg will automatically use your Windows IE Proxy Settings set by your proxy software. See: https://github.com/microsoft/vcpkg-tool/pull/77
The value set by your proxy might be wrong, or have same `https://` prefix issue.
3. Your proxy's remote server is out of service.
If you believe this is not a temporary download server failure and vcpkg needs to be changed to download this file from a different location, please submit an issue to https://github.com/Microsoft/vcpkg/issues
CMake Error at scripts/cmake/vcpkg_download_distfile.cmake:136 (message):
  Download failed, halting portfile.
Call Stack (most recent call first):
  scripts/cmake/vcpkg_from_github.cmake:120 (vcpkg_download_distfile)
  C:/Users/MRATUNJAI SINGH/AppData/Local/vcpkg/registries/git-trees/37d48513a5c0e1dd869909555ca4d58ad34f94da/portfile.cmake:3 (vcpkg_from_github)
  scripts/ports.cmake:206 (include)



```

**Additional context**

<details><summary>vcpkg.json</summary>

```
{
  "name": "l4-loadbalancer",
  "version": "0.1.0",
  "builtin-baseline": "cb2981c4e03d421fa03b9bb5044cd1986180e7e4",
  "dependencies": [
    "boost-asio",
    "spdlog",
    "nlohmann-json",
    "cli11",
    "catch2"
  ]
}

```
</details>
