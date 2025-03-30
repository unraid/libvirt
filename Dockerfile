# Build stage
FROM node:22-slim AS builder

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    libvirt-dev \
    && rm -rf /var/lib/apt/lists/*

# Set up the build environment
WORKDIR /app

# Copy package files first to leverage caching
COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY binding.gyp ./
COPY src ./src
COPY scripts ./scripts


# Install pnpm and dependencies
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Copy source files
COPY . .

# Build the project
RUN pnpm run build

# Test stage
FROM node:22-slim AS test

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install test dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    qemu-system-x86 \
    qemu-system-arm \
    qemu-efi \
    qemu-efi-aarch64 \
    qemu-utils \
    ovmf \
    libvirt-daemon-system \
    libvirt-dev \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for libvirt and set up permissions
RUN useradd -m -s /bin/bash -g libvirt libvirt && \
    usermod -aG kvm libvirt && \
    mkdir -p /var/run/libvirt && \
    chown root:libvirt /var/run/libvirt && \
    chmod g+w /var/run/libvirt

# Set up the test environment
WORKDIR /app

# Copy package files and binding.gyp first
COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY binding.gyp ./
COPY src ./src
COPY scripts ./scripts

# Install pnpm and dependencies
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Copy built files and test files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/__tests__ ./__tests__
COPY --from=builder /app/vitest.config.ts ./vitest.config.ts
COPY --from=builder /app/build ./build

# Set up libvirt configuration
RUN mkdir -p /etc/libvirt && \
    echo 'unix_sock_group = "libvirt"' >> /etc/libvirt/libvirtd.conf && \
    echo 'unix_sock_rw_perms = "0770"' >> /etc/libvirt/libvirtd.conf && \
    echo 'auth_unix_rw = "none"' >> /etc/libvirt/libvirtd.conf

# Create necessary directories with correct permissions
RUN mkdir -p /home/libvirt/.config/libvirt && \
    echo 'uri_default = "qemu:///session"' > /home/libvirt/.config/libvirt/libvirt.conf && \
    chown -R libvirt:libvirt /home/libvirt/.config && \
    chown -R libvirt:libvirt /app

# Switch to non-root user
USER libvirt

# Start libvirtd and run tests
CMD ["/bin/sh", "-c", "/usr/sbin/libvirtd --daemon && sleep 2 && pnpm test:coverage"]
