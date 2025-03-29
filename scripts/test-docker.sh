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
    
    echo -e "${GREEN}Running tests on node:20-slim (${arch})${NC}"
    
    # Build the Docker image for the specific architecture
    docker buildx build \
        --platform linux/$arch \
        -t $tag \
        --load \
        .
    
    # Run the container with necessary privileges
    docker run --rm \
        --platform linux/$arch \
        --privileged \
        -v /var/run/libvirt/libvirt-sock:/var/run/libvirt/libvirt-sock \
        -v /var/lib/libvirt:/var/lib/libvirt \
        $tag
    
    # Check the exit code
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Tests passed on node:20-slim (${arch})${NC}"
    else
        echo -e "${RED}Tests failed on node:20-slim (${arch})${NC}"
        exit 1
    fi
}

# Main script
echo "Starting Docker-based integration tests..."

# Check if Docker buildx is available
if ! docker buildx version >/dev/null 2>&1; then
    echo -e "${YELLOW}Docker buildx not found. Installing...${NC}"
    docker buildx install
fi

# Create a temporary directory for test artifacts
mkdir -p test-artifacts

# Run tests for each architecture
for arch in "${ARCHES[@]}"; do
    run_tests "$arch"
done

echo "All tests completed!" 