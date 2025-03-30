#!/bin/bash

# List of architectures to test
ARCHES=(
    "amd64"
    "arm64"
)

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run tests for a specific architecture
run_tests() {
    local arch=$1
    local tag="libvirt-test-${arch}"
    
    docker buildx build \
        --platform linux/"$arch" \
        -t "$tag" \
        --load \
        .

    
    # Run the container with necessary privileges and network setup
    docker run --rm \
        --platform linux/"$arch" \
        --privileged \
        --cap-add SYS_ADMIN \
        --cap-add NET_ADMIN \
        --device /dev/kvm \
        --network host \
        -v /var/run/libvirt/libvirt-sock:/var/run/libvirt/libvirt-sock \
        -v /var/lib/libvirt:/var/lib/libvirt \
        -v /sys/fs/cgroup:/sys/fs/cgroup:ro \
        "$tag"
}

# Main script
echo "Starting Docker-based integration tests..."

# Check if Docker buildx is available
if ! docker buildx version >/dev/null 2>&1; then
    echo -e "${YELLOW}Docker buildx not found. Installing...${NC}"
    docker buildx install
fi

# Run tests for each architecture
for arch in "${ARCHES[@]}"; do
    run_tests "$arch"
done
