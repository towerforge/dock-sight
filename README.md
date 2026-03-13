# Dock Sight

[![GitHub release](https://img.shields.io/github/v/release/towerforge/dock-sight?style=flat-square&color=blue)](https://github.com/towerforge/dock-sight/releases/latest)
[![GitHub Release Date](https://img.shields.io/github/release-date/towerforge/dock-sight?style=flat-square&color=blue)](https://github.com/towerforge/dock-sight/releases/latest)
[![GitHub Downloads](https://img.shields.io/github/downloads/towerforge/dock-sight/total?style=flat-square&color=green)](https://github.com/towerforge/dock-sight/releases)
[![Repo size](https://img.shields.io/github/repo-size/towerforge/dock-sight?style=flat-square)](https://github.com/towerforge/dock-sight)
[![License](https://img.shields.io/github/license/towerforge/dock-sight?style=flat-square)](LICENSE)

![Demo](demo.gif)

Dock Sight is a lightweight infrastructure dashboard for:

- Host metrics (CPU, RAM, disk, network)
- Docker services and container status
- Fast local access from your browser

## Why Dock Sight

- Single binary — no runtime, no dependencies
- No complex setup
- Works well on servers and local machines

## Requirements

- Docker Engine running (required for Docker service views)
- One of the supported operating systems:
  - Linux x86_64, ARM64, ARMv7, i686 (glibc or musl/static)
  - macOS Intel
  - macOS Apple Silicon (M1/M2/M3/M4)

## Installation

### Quick install (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/towerforge/dock-sight/main/install.sh | sh
```

Detects your platform automatically and installs to `/usr/local/bin` (root) or `~/.local/bin` (non-root).

### Inspect before running

If you prefer to review the script before executing it:

```bash
curl -fsSL https://raw.githubusercontent.com/towerforge/dock-sight/main/install.sh -o install.sh
less install.sh
sh install.sh
```

### Available packages

Pre-built binaries for all platforms are listed on the [releases page](https://github.com/towerforge/dock-sight/releases/latest).

| System | Package |
|---|---|
| Linux x86_64 (glibc) | `dock-sight-linux-x86_64.tar.gz` |
| Linux x86_64 (static) | `dock-sight-linux-x86_64-musl.tar.gz` |
| Linux ARM64 (glibc) | `dock-sight-linux-aarch64.tar.gz` |
| Linux ARM64 (static) | `dock-sight-linux-aarch64-musl.tar.gz` |
| Linux ARMv7 | `dock-sight-linux-armv7.tar.gz` |
| Linux i686 | `dock-sight-linux-i686.tar.gz` |
| macOS Intel | `dock-sight-macos-x86_64.tar.gz` |
| macOS Apple Silicon | `dock-sight-macos-aarch64.tar.gz` |

> Use the **static** (`-musl`) variant on Alpine Linux, containers, or servers where glibc compatibility is uncertain.

## Usage

```
dock-sight [OPTIONS]

Options:
  -p, --port <PORT>   Port to listen on [default: 8080]
      --dev           Enable development mode
  -h, --help          Print help
  -V, --version       Print version
```

## Optional: systemd (Linux)

```ini
[Service]
ExecStart=/usr/local/bin/dock-sight --port 8080
Restart=always
```

## Docker Service Grouping

Containers are grouped by label `com.docker.swarm.service.name`.
If missing, they are grouped as `standalone`.

## License

MIT. See [LICENSE](LICENSE).
