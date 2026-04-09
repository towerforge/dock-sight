# Dock Sight — Docker deployment

![Dock Sight demo](https://raw.githubusercontent.com/towerforge/dock-sight/main/demo.gif)

Lightweight infrastructure dashboard for Docker hosts — monitor CPU, RAM, disk, network and Docker services from your browser. Protected by password on first launch.

- Real-time host metrics (CPU, RAM, disk, network)
- Docker services and container status
- Password-protected portal (set on first open)
- Single binary, no runtime dependencies
- Supports `amd64` and `arm64`

## Quick start

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

Open [http://localhost:8080](http://localhost:8080). On first visit you will be asked to set a password.

## Docker Compose

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

## Password & sessions

On first launch the browser shows a setup screen asking you to choose a password (minimum 8 characters, confirmed twice). After that, every visit requires the password.

Sessions remain valid for **24 hours** by default. You can change this with the `SESSION_DURATION_HOURS` environment variable:

```yaml
environment:
  - DATA_DIR=/data
  - SESSION_DURATION_HOURS=12
```

The password hash is stored in `$DATA_DIR/config.json`. Mount a named volume at that path so it survives container updates.

### Persistence behaviour

| Situation | Password kept? |
|---|---|
| `docker restart dock-sight` | ✅ Yes |
| `docker stop` + `docker start` | ✅ Yes |
| `docker-compose restart` | ✅ Yes |
| `docker-compose pull` + `up -d` (recreates container) | ✅ Yes — if volume is mounted |
| `docker rm` + `docker run` without volume | ❌ No — setup required again |

## Custom port

Map any host port to the internal `8080`:

```bash
docker run -d \
  --name dock-sight \
  --restart unless-stopped \
  -p 9090:8080 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v dock-sight-data:/data \
  -e DATA_DIR=/data \
  towerforge/dock-sight:latest
```

Then open [http://localhost:9090](http://localhost:9090).

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `DATA_DIR` | `.` | Path where `config.json` is stored |
| `SESSION_DURATION_HOURS` | `24` | Session lifetime in hours |
| `SECURE_COOKIES` | `false` | Set to `true` to add the `Secure` flag to session cookies. Enable this when Dock Sight is behind an HTTPS reverse proxy. |

## Docker Swarm

Containers are automatically grouped by the label `com.docker.swarm.service.name`. Containers without this label are listed under `standalone`.

## Security note

Mounting `/var/run/docker.sock` gives the container full access to the Docker daemon. Always protect the port with the built-in password, keep it on a private network, and avoid exposing it to the public internet.

## Source

[github.com/towerforge/dock-sight](https://github.com/towerforge/dock-sight)
