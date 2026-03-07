SHELL := /bin/bash

PORT ?= 8080

APP_NAME ?= dock-sight

BACKEND_DIR := backend
FRONTEND_DIR := frontend

DIST_DIR ?= dist

VERSION ?= $(shell sed -n 's/^version = "\(.*\)"/\1/p' $(BACKEND_DIR)/Cargo.toml | head -n1)
VERSION_TAG ?= v$(VERSION)
HOST_OS := $(shell uname -s | tr '[:upper:]' '[:lower:]')
HOST_ARCH := $(shell uname -m)

# Native / single-target settings
CARGO_TARGET ?=
BACKEND_BIN := $(if $(CARGO_TARGET),$(BACKEND_DIR)/target/$(CARGO_TARGET)/release/backend,$(BACKEND_DIR)/target/release/backend)
PLATFORM ?= $(if $(CARGO_TARGET),$(if $(findstring apple-darwin,$(CARGO_TARGET)),macos,linux),$(if $(filter darwin,$(HOST_OS)),macos,linux))
TARGET_ARCH := $(if $(CARGO_TARGET),$(word 1,$(subst -, ,$(CARGO_TARGET))),$(HOST_ARCH))
ARTIFACT_BASENAME ?= dock-sight
ARTIFACT_ARCH ?= $(TARGET_ARCH)
ARTIFACT ?= $(ARTIFACT_BASENAME)-$(ARTIFACT_ARCH).tar.gz
ARTIFACT_VERSIONED := $(ARTIFACT_BASENAME)-$(PLATFORM)-$(ARTIFACT_ARCH).tar.gz

# Multi-target Linux packaging
LINUX_TARGETS ?= \
	x86_64-unknown-linux-gnu \
	aarch64-unknown-linux-gnu \
	armv7-unknown-linux-gnueabihf \
	i686-unknown-linux-gnu
MACOS_TARGETS ?= \
	x86_64-apple-darwin \
	aarch64-apple-darwin

ENABLE_LATEST_ASSET ?= 0

.PHONY: help version dev-backend watch-backend dev-frontend install-frontend build-frontend build-backend build run release package package-one package-all-linux package-all-macos rust-targets clean dist-clean

help:
	@echo "Dock Sight available targets"
	@echo ""
	@echo "  make version                    Print detected version"
	@echo "  make dev-backend                Run backend in development mode"
	@echo "  make watch-backend              Run backend with cargo-watch"
	@echo "  make dev-frontend               Run frontend development server"
	@echo "  make install-frontend           Install frontend dependencies"
	@echo "  make build-frontend             Build frontend for production"
	@echo "  make build-backend              Build backend release binary"
	@echo "  make build                      Build frontend and backend"
	@echo "  make run                        Run backend release binary"
	@echo "  make release                    Alias for 'make build'"
	@echo "  make package                    Build and create one release artifact"
	@echo "  make package-all-linux          Build and package all Linux targets"
	@echo "  make package-all-macos          Build and package all macOS targets"
	@echo "  make rust-targets               Print targets used by package-all-*"
	@echo "  make clean                      Clean backend build artifacts"
	@echo "  make dist-clean                 Remove packaged artifacts"
	@echo ""
	@echo "Variables:"
	@echo "  PORT=<port>                     Runtime port (default: 8080)"
	@echo "  VERSION=<x.y.z>                 Override detected version"
	@echo "  DIST_DIR=<dir>                  Output directory (default: dist)"
	@echo "  CARGO_TARGET=<target-triple>    Rust target triple for backend build/package"
	@echo "  LINUX_TARGETS=\"...\"            Space-separated rust targets for package-all-linux"
	@echo "  MACOS_TARGETS=\"...\"            Space-separated rust targets for package-all-macos"
	@echo "  ENABLE_LATEST_ASSET=1           Also create unversioned artifact per package"
	@echo "  ARTIFACT_BASENAME=<name>        Artifact prefix (default: dock-sight)"

version:
	@echo $(VERSION)

dev-backend:
	cargo run --manifest-path $(BACKEND_DIR)/Cargo.toml -- --dev --port $(PORT)

watch-backend:
	cargo watch --manifest-path $(BACKEND_DIR)/Cargo.toml -x "run -- --dev --port $(PORT)"

dev-frontend:
	cd $(FRONTEND_DIR) && pnpm dev

install-frontend:
	cd $(FRONTEND_DIR) && pnpm install --frozen-lockfile

build-frontend: install-frontend
	cd $(FRONTEND_DIR) && pnpm build

build-backend:
	cargo build --manifest-path $(BACKEND_DIR)/Cargo.toml --release $(if $(CARGO_TARGET),--target $(CARGO_TARGET),)

build: build-frontend build-backend

release: build

run:
	./$(BACKEND_BIN) --port $(PORT)

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

package-all-linux: build-frontend
	@set -e; \
	for target in $(LINUX_TARGETS); do \
		echo "==> Building and packaging $$target"; \
		rustup target add $$target >/dev/null; \
		$(MAKE) --no-print-directory build-backend CARGO_TARGET=$$target; \
		$(MAKE) --no-print-directory package-one CARGO_TARGET=$$target PLATFORM=linux ARTIFACT_ARCH=$$(echo $$target | cut -d- -f1); \
	done

package-all-macos: build-frontend
	@set -e; \
	for target in $(MACOS_TARGETS); do \
		echo "==> Building and packaging $$target"; \
		rustup target add $$target >/dev/null; \
		$(MAKE) --no-print-directory build-backend CARGO_TARGET=$$target; \
		$(MAKE) --no-print-directory package-one CARGO_TARGET=$$target PLATFORM=macos ARTIFACT_ARCH=$$(echo $$target | cut -d- -f1); \
	done

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
