SHELL := /bin/bash

# ---------------------------------------------------------------------------
# Project
# ---------------------------------------------------------------------------

APP_NAME     ?= dock-sight
BACKEND_DIR  := backend
FRONTEND_DIR := frontend
PORT         ?= 8080

VERSION     ?= $(shell sed -n 's/^version = "\(.*\)"/\1/p' $(BACKEND_DIR)/Cargo.toml | head -n1)
VERSION_TAG ?= v$(VERSION)

HOST_OS   := $(shell uname -s | tr '[:upper:]' '[:lower:]')
HOST_ARCH := $(shell uname -m)

# ---------------------------------------------------------------------------
# Build target — set CARGO_TARGET to a Rust triple to cross-compile
# ---------------------------------------------------------------------------

CARGO_TARGET ?=

BACKEND_BIN := $(if $(CARGO_TARGET),$(BACKEND_DIR)/target/$(CARGO_TARGET)/release/backend,$(BACKEND_DIR)/target/release/backend)

PLATFORM ?= $(if $(CARGO_TARGET),$(if $(findstring apple-darwin,$(CARGO_TARGET)),macos,linux),$(if $(filter darwin,$(HOST_OS)),macos,linux))

TARGET_ARCH := $(if $(CARGO_TARGET),$(word 1,$(subst -, ,$(CARGO_TARGET))),$(HOST_ARCH))

# ---------------------------------------------------------------------------
# Artifacts — e.g. dock-sight-linux-x86_64.tar.gz
# ---------------------------------------------------------------------------

ARTIFACT_BASENAME   ?= dock-sight
ARTIFACT_ARCH       ?= $(TARGET_ARCH)
DIST_DIR            ?= dist
ARTIFACT            ?= $(ARTIFACT_BASENAME)-$(ARTIFACT_ARCH).tar.gz
ARTIFACT_VERSIONED  := $(ARTIFACT_BASENAME)-$(PLATFORM)-$(ARTIFACT_ARCH).tar.gz

# Set to 1 to also write an unversioned copy of each artifact
ENABLE_LATEST_ASSET ?= 0

# ---------------------------------------------------------------------------
# Cross-compilation
#   Linux targets → built inside Docker via 'cross' (Docker must be running)
#   macOS targets → built natively via rustup (no Docker required)
#
#   Install cross once: cargo install cross --git https://github.com/cross-rs/cross
# ---------------------------------------------------------------------------

CARGO_CMD ?= cargo

LINUX_TARGETS ?= \
	x86_64-unknown-linux-gnu \
	aarch64-unknown-linux-gnu \
	armv7-unknown-linux-gnueabihf \
	i686-unknown-linux-gnu

MACOS_TARGETS ?= \
	x86_64-apple-darwin \
	aarch64-apple-darwin

# ---------------------------------------------------------------------------
# Phony targets
# ---------------------------------------------------------------------------

.PHONY: help version \
        dev-backend watch-backend dev-frontend \
        install-frontend build-frontend build-backend build run release \
        package package-one \
        package-all package-all-linux package-all-macos \
        _package-linux-binaries _package-macos-binaries \
        rust-targets clean dist-clean

# ---------------------------------------------------------------------------
# Help
# ---------------------------------------------------------------------------

help:
	@echo "Dock Sight — available targets"
	@echo ""
	@echo "  Development"
	@echo "    make dev-backend              Run backend in development mode"
	@echo "    make watch-backend            Run backend with cargo-watch (auto-reload)"
	@echo "    make dev-frontend             Run frontend dev server"
	@echo ""
	@echo "  Building"
	@echo "    make build                    Build frontend + backend for the host"
	@echo "    make build-frontend           Build frontend only"
	@echo "    make build-backend            Build backend only"
	@echo "    make run                      Run the built backend binary"
	@echo ""
	@echo "  Packaging"
	@echo "    make package                  Build and package for the host (or CARGO_TARGET)"
	@echo "    make package-all              Package all Linux + macOS targets"
	@echo "    make package-all-linux        Package all Linux targets (cross + Docker)"
	@echo "    make package-all-macos        Package all macOS targets (rustup)"
	@echo ""
	@echo "  Utilities"
	@echo "    make version                  Print the detected version"
	@echo "    make rust-targets             List all targets used by package-all-*"
	@echo "    make install-frontend         Install frontend dependencies"
	@echo "    make clean                    Remove backend build artifacts"
	@echo "    make dist-clean               Remove the dist directory"
	@echo ""
	@echo "  Variables"
	@echo "    PORT=<port>                   Backend port at runtime (default: 8080)"
	@echo "    VERSION=<x.y.z>              Override the version from Cargo.toml"
	@echo "    DIST_DIR=<dir>               Output directory for artifacts (default: dist)"
	@echo "    CARGO_TARGET=<triple>        Rust target triple (e.g. aarch64-apple-darwin)"
	@echo "    LINUX_TARGETS=\"...\"         Space-separated triples for package-all-linux"
	@echo "    MACOS_TARGETS=\"...\"         Space-separated triples for package-all-macos"
	@echo "    ENABLE_LATEST_ASSET=1        Also write an unversioned copy of each artifact"
	@echo "    ARTIFACT_BASENAME=<name>     Artifact filename prefix (default: dock-sight)"

# ---------------------------------------------------------------------------
# Development
# ---------------------------------------------------------------------------

version:
	@echo $(VERSION)

dev-backend:
	cargo run --manifest-path $(BACKEND_DIR)/Cargo.toml -- --dev --port $(PORT)

watch-backend:
	cargo watch --manifest-path $(BACKEND_DIR)/Cargo.toml -x "run -- --dev --port $(PORT)"

dev-frontend:
	cd $(FRONTEND_DIR) && pnpm dev

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

install-frontend:
	cd $(FRONTEND_DIR) && pnpm install --frozen-lockfile

build-frontend: install-frontend
	cd $(FRONTEND_DIR) && pnpm build

build-backend:
	$(CARGO_CMD) build --manifest-path $(BACKEND_DIR)/Cargo.toml --release \
		$(if $(CARGO_TARGET),--target $(CARGO_TARGET),)

build: build-frontend build-backend

release: build

run:
	./$(BACKEND_BIN) --port $(PORT)

# ---------------------------------------------------------------------------
# Packaging
# ---------------------------------------------------------------------------

package: build
	@$(MAKE) package-one CARGO_TARGET="$(CARGO_TARGET)" ARTIFACT_ARCH="$(ARTIFACT_ARCH)"

package-one:
	@if [ ! -f "$(BACKEND_BIN)" ]; then \
		echo "ERROR: backend binary not found at $(BACKEND_BIN)"; \
		exit 1; \
	fi
	@mkdir -p $(DIST_DIR)
	@cp "$(BACKEND_BIN)" "$(DIST_DIR)/$(APP_NAME)"
	@chmod +x "$(DIST_DIR)/$(APP_NAME)"
	@tar -czf "$(DIST_DIR)/$(ARTIFACT_VERSIONED)" -C "$(DIST_DIR)" "$(APP_NAME)"
	@if [ "$(ENABLE_LATEST_ASSET)" = "1" ]; then \
		cp "$(DIST_DIR)/$(ARTIFACT_VERSIONED)" "$(DIST_DIR)/$(ARTIFACT)"; \
	fi
	@rm -f "$(DIST_DIR)/$(APP_NAME)"
	@echo "$(DIST_DIR)/$(ARTIFACT_VERSIONED)"

package-all: build-frontend
	@$(MAKE) --no-print-directory _package-linux-binaries
	@$(MAKE) --no-print-directory _package-macos-binaries

package-all-linux: build-frontend _package-linux-binaries

package-all-macos: build-frontend _package-macos-binaries

_package-linux-binaries:
	@set -e; \
	for target in $(LINUX_TARGETS); do \
		echo "==> [linux] $$target (cross + Docker)"; \
		$(MAKE) --no-print-directory build-backend CARGO_TARGET=$$target CARGO_CMD=cross; \
		$(MAKE) --no-print-directory package-one \
			CARGO_TARGET=$$target \
			PLATFORM=linux \
			ARTIFACT_ARCH=$$(echo $$target | cut -d- -f1); \
	done

_package-macos-binaries:
	@set -e; \
	for target in $(MACOS_TARGETS); do \
		echo "==> [macos] $$target"; \
		rustup target add $$target >/dev/null; \
		$(MAKE) --no-print-directory build-backend CARGO_TARGET=$$target; \
		$(MAKE) --no-print-directory package-one \
			CARGO_TARGET=$$target \
			PLATFORM=macos \
			ARTIFACT_ARCH=$$(echo $$target | cut -d- -f1); \
	done

# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

rust-targets:
	@for target in $(LINUX_TARGETS); do echo $$target; done
	@for target in $(MACOS_TARGETS); do echo $$target; done

clean:
	cargo clean --manifest-path $(BACKEND_DIR)/Cargo.toml

dist-clean:
	@if [ -z "$(DIST_DIR)" ] || [ "$(DIST_DIR)" = "/" ] || [ "$(DIST_DIR)" = "." ]; then \
		echo "ERROR: refusing to remove DIST_DIR='$(DIST_DIR)'"; \
		exit 1; \
	fi
	rm -rf "$(DIST_DIR)"
