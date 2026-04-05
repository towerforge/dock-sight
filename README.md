<p align="center">
  <img src="frontend/public/logo.svg" width="88" alt="Dock Sight" />
</p>

<h1 align="center">Dock Sight</h1>

<p align="center">
  Lightweight infrastructure dashboard for Docker services, host metrics, and network topology.
</p>

<p align="center">
  <a href="https://github.com/towerforge/dock-sight/releases/latest"><img src="https://img.shields.io/github/v/release/towerforge/dock-sight?style=flat-square&color=6d28d9" alt="Latest release" /></a>
  <a href="https://github.com/towerforge/dock-sight/releases"><img src="https://img.shields.io/github/downloads/towerforge/dock-sight/total?style=flat-square&color=6d28d9" alt="Downloads" /></a>
  <a href="https://hub.docker.com/r/towerforge/dock-sight"><img src="https://img.shields.io/docker/pulls/towerforge/dock-sight?style=flat-square&color=6d28d9" alt="Docker Pulls" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/towerforge/dock-sight?style=flat-square&color=6d28d9" alt="License" /></a>
</p>

<br />

![Demo](demo.gif)

---

## Overview

Dock Sight runs as a single binary and serves a real-time dashboard in your browser. No agents, no external dependencies.

**Host metrics** — CPU, RAM, disk, and network usage with historical charts.
**Docker services** — Container status, resource consumption, per-service CPU/RAM charts, images, and live logs. Scale, pause, and delete services directly from the dashboard.
**Network topology** — Visual graph and table of Docker networks with service distribution and health status.
**Password protection** — On first launch the browser prompts you to set a password. Every subsequent visit requires it (session valid for 24 h by default).

## Requirements

- Docker Engine (required for Docker service views)
- Linux x86_64 / ARM64 / ARMv7 / i686, or macOS Intel / Apple Silicon

## Installation

### Quick install

```bash
curl -fsSL https://raw.githubusercontent.com/towerforge/dock-sight/main/install.sh | sh
```

Detects your platform and installs to `/usr/local/bin` (root) or `~/.local/bin` (non-root).

### Manual download

Pre-built binaries are available on the [releases page](https://github.com/towerforge/dock-sight/releases/latest).

| Platform | Package |
|---|---|
| Linux x86_64 (glibc) | `dock-sight-linux-x86_64.tar.gz` |
| Linux x86_64 (static) | `dock-sight-linux-x86_64-musl.tar.gz` |
| Linux ARM64 (glibc) | `dock-sight-linux-aarch64.tar.gz` |
| Linux ARM64 (static) | `dock-sight-linux-aarch64-musl.tar.gz` |
| Linux ARMv7 | `dock-sight-linux-armv7.tar.gz` |
| Linux i686 | `dock-sight-linux-i686.tar.gz` |
| macOS Intel | `dock-sight-macos-x86_64.tar.gz` |
| macOS Apple Silicon | `dock-sight-macos-aarch64.tar.gz` |

> Use the **static** (`-musl`) variant on Alpine Linux or any system where glibc availability is uncertain.

## Usage

```
dock-sight [OPTIONS]

Options:
  -p, --port <PORT>   Port to listen on [default: 8080]
      --dev           Enable development mode
  -h, --help          Print help
  -V, --version       Print version
```

Open [http://localhost:8080](http://localhost:8080) in your browser.
On first launch you will be prompted to set a password before the dashboard is accessible.

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `DATA_DIR` | `.` | Directory where `config.json` is stored (password hash) |
| `SESSION_DURATION_HOURS` | `24` | How many hours a login session stays valid |

## Docker

```bash
docker run -d \
  --name dock-sight \
  --restart unless-stopped \
  -p 8080:8080 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v dock-sight-data:/data \
  -e DATA_DIR=/data \
  towerforge/dock-sight:latest
```

The `-v dock-sight-data:/data` volume keeps your password hash across container recreations (e.g. after `docker pull` + `up -d`). Without it the password persists across restarts but is lost if the container is removed and recreated.

<details>
<summary>docker-compose</summary>

```yaml
services:
  dock-sight:
    image: towerforge/dock-sight:latest
    container_name: dock-sight
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - dock-sight-data:/data
    environment:
      - DATA_DIR=/data

volumes:
  dock-sight-data:
```

</details>

<details>
<summary>systemd (Linux)</summary>

```ini
[Service]
ExecStart=/usr/local/bin/dock-sight --port 8080
Restart=always
```

The password hash is saved as `config.json` in the working directory. Set `DATA_DIR` if you want it elsewhere:

```ini
[Service]
ExecStart=/usr/local/bin/dock-sight --port 8080
Environment=DATA_DIR=/etc/dock-sight
Restart=always
```

</details>

## Service grouping

Containers are grouped by the `com.docker.swarm.service.name` label. Containers without this label appear under `standalone`.

## License

MIT — see [LICENSE](LICENSE).
