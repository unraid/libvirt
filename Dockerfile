FROM node:22-slim

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
COPY . .

# Install pnpm and dependencies
RUN corepack enable pnpm && \
    pnpm install --frozen-lockfile

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
