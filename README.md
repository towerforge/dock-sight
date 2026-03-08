# Dock Sight

Dock Sight is a lightweight infrastructure dashboard for:

- Host metrics (CPU, RAM, disk, network)
- Docker services and container status
- Fast local access from your browser

## Why Dock Sight

- Single binary deployment
- No complex setup
- Works well on servers and local machines

## Requirements

- Docker Engine running (required for Docker service views)
- One of the supported operating systems:
  - Linux (`x86_64`)
  - macOS Intel
  - macOS Apple Silicon (M1/M2/M3/M4)

## Installation

### 1) Choose your package

Use the package that matches your OS and CPU:

| System | Package name |
|---|---|
| Linux ARM64 | `dock-sight-linux-aarch64.tar.gz` |
| macOS Intel | `dock-sight-macos-x86_64.tar.gz` |
| macOS Apple Silicon | `dock-sight-macos-aarch64.tar.gz` |

Release URL pattern:

```text
https://github.com/towerforge/dock-sight/releases/download/v0.1.4/<package-name>
```

### 2) Download

Linux server (x86_64) example:

```bash
curl -fL -o dock-sight.tar.gz \
https://github.com/towerforge/dock-sight/releases/download/v0.1.4/dock-sight-linux-x86_64.tar.gz
```

macOS Apple Silicon example:

```bash
curl -fL -o dock-sight.tar.gz \
https://github.com/towerforge/dock-sight/releases/download/v0.1.4/dock-sight-macos-aarch64.tar.gz
```

### 3) Extract and run

```bash
tar -xzf dock-sight.tar.gz
chmod +x dock-sight
./dock-sight --port 8080
```

Open:

```text
http://localhost:8080
```

## Optional: systemd (Linux)

Use this in your service unit:

```text
ExecStart=/opt/dock-sight/dock-sight --port 8080
```

## Docker Service Grouping

Containers are grouped by label `com.docker.swarm.service.name`.
If missing, they are grouped as `standalone`.

## License

MIT. See [LICENSE](LICENSE).
