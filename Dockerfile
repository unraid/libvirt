# Use Node.js as base image
FROM node:20-slim

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install only the essential QEMU and libvirt packages
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
COPY . .

# Install pnpm
RUN npm install -g pnpm

# Install dependencies and build
RUN npm install && npm run build

# Set up libvirt configuration
RUN mkdir -p /etc/libvirt && \
    echo 'unix_sock_group = "libvirt"' >> /etc/libvirt/libvirtd.conf && \
    echo 'unix_sock_rw_perms = "0770"' >> /etc/libvirt/libvirtd.conf && \
    echo 'auth_unix_rw = "none"' >> /etc/libvirt/libvirtd.conf

# Switch to non-root user
USER libvirt

# Create necessary directories with correct permissions
RUN mkdir -p /home/libvirt/.config/libvirt && \
    echo 'uri_default = "qemu:///session"' > /home/libvirt/.config/libvirt/libvirt.conf

# Start libvirtd and run tests
CMD ["/bin/sh", "-c", "/usr/sbin/libvirtd --daemon && sleep 2 && npm test"]
