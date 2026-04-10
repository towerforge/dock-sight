<p align="center">
  <img src="frontend/public/logo.svg" width="88" alt="Dock Sight" />
</p>

<h1 align="center">Dock Sight</h1>

<p align="center">
  Monitor your Docker infrastructure — services, host metrics, networks and volumes — from a single, self-hosted dashboard.
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

Dock Sight runs as a single binary and serves a real-time dashboard in your browser. No agents, no external dependencies, no cloud.

| Area | What you get |
|---|---|
| **Host metrics** | CPU, RAM, disk and network usage with historical charts |
| **Docker services** | Container status, resource consumption, per-service CPU/RAM/network charts, images and live logs. Scale, pause, delete and pull latest image directly from the dashboard |
| **Networks** | Visual table of Docker networks with service distribution, health status and RX/TX rates. Create and delete networks from the dashboard |
| **Volumes** | List all Docker volumes with size, mount point, disk usage and service grouping. Create and delete volumes from the dashboard |
| **Registries** | Manage private DockerHub registries (create, list, delete) and use them when deploying new services |
| **Users** | Multi-user access — create, delete and reset passwords for any user. All users have the same privileges |
| **Security** | Brute-force protection per IP (blocked after 10 failed attempts in 15 min). Rate-limit state and login event log are persisted in SQLite and visible in Settings → Security |

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
      --dev           Enable development mode (disables auth middleware, enables CORS)
  -h, --help          Print help
  -V, --version       Print version
```

Open [http://localhost:8080](http://localhost:8080) in your browser. On first launch you will be prompted to create the first user before the dashboard is accessible.

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `DATA_DIR` | `.` | Directory where `dock-sight.db` is stored |
| `SESSION_DURATION_HOURS` | `24` | How many hours a login session stays valid |
| `SECURE_COOKIES` | `false` | Set to `true` to add the `Secure` flag to session cookies (recommended behind an HTTPS reverse proxy) |
| `BACKEND_PORT` | `8080` | Port override (alternative to `--port`) |

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

The `-v dock-sight-data:/data` volume persists the SQLite database (users, registries, login history) across container recreations.

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
[Unit]
Description=Dock Sight
After=network.target docker.service

[Service]
ExecStart=/usr/local/bin/dock-sight --port 8080
Environment=DATA_DIR=/etc/dock-sight
Restart=always

[Install]
WantedBy=multi-user.target
```

</details>

## Data persistence

All state is stored in a single SQLite database (`dock-sight.db`) in `DATA_DIR`:

| Table | Contents |
|---|---|
| `users` | Usernames and hashed passwords |
| `registries` | DockerHub registry credentials |
| `login_attempts` | Active rate-limit counters per IP |
| `login_events` | Login attempt history (last 50 shown in Settings → Security) |

## Service grouping

Containers are grouped by the `com.docker.swarm.service.name` label. Containers without this label appear under `standalone`.

## License

MIT — see [LICENSE](LICENSE).
