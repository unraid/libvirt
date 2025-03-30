import { Hypervisor, Domain, DomainState } from '../lib';
import { HypervisorOptions } from '../lib/types';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

export const TEST_VM_NAME = 'test-integration-vm';
export const DISK_IMAGE = '/tmp/test-vm.img';

// Determine architecture-specific configuration
export function getArchConfig(): { arch: string; machine: string; firmware?: { code: string; vars: string }; emulator: string } {
    // Check for QEMU in Homebrew path on macOS
    const homebrewQemuPath = process.platform === 'darwin' ? '/opt/homebrew/bin' : null;
    const systemQemuPath = '/usr/bin';
    
    // Function to find QEMU binary
    const findQemuBinary = (arch: string): string => {
        const binaryName = `qemu-system-${arch}`;
        if (homebrewQemuPath && existsSync(`${homebrewQemuPath}/${binaryName}`)) {
            return `${homebrewQemuPath}/${binaryName}`;
        }
        if (existsSync(`${systemQemuPath}/${binaryName}`)) {
            return `${systemQemuPath}/${binaryName}`;
        }
        throw new Error(`QEMU binary ${binaryName} not found in ${homebrewQemuPath} or ${systemQemuPath}`);
    };

    if (process.platform === 'darwin') {
        if (process.arch === 'arm64') {
            return {
                arch: 'aarch64',
                machine: 'virt',
                emulator: findQemuBinary('aarch64')
            };
        } else {
            return {
                arch: 'x86_64',
                machine: 'q35',
                emulator: findQemuBinary('x86_64')
            };
        }
    } else {
        if (process.arch === 'arm64') {
            return {
                arch: 'aarch64',
                machine: 'virt',
                emulator: findQemuBinary('aarch64')
            };
        } else {
            return {
                arch: 'x86_64',
                machine: 'q35',
                emulator: findQemuBinary('x86_64')
            };
        }
    }
}

// Check if QEMU and firmware are available
export const verifyQemuInstallation = () => {
    const archConfig = getArchConfig();
    const qemuPath = archConfig.emulator;
    const firmwareCodePath = archConfig.firmware?.code;
    const firmwareVarsPath = archConfig.firmware?.vars;

    if (!existsSync(qemuPath)) {
        const homebrewPath = process.platform === 'darwin' ? '/opt/homebrew/bin' : null;
        const systemPath = '/usr/bin';
        const errorMessage = process.platform === 'darwin' 
            ? `QEMU not found. Please install it using Homebrew:\n` +
              `  brew install qemu\n\n` +
              `Expected paths checked:\n` +
              `  ${homebrewPath}/qemu-system-${archConfig.arch}\n` +
              `  ${systemPath}/qemu-system-${archConfig.arch}`
            : `QEMU not found at ${qemuPath}. Please install QEMU first.`;
        throw new Error(errorMessage);
    }

    if (firmwareCodePath && !existsSync(firmwareCodePath)) {
        throw new Error(`UEFI firmware code not found at ${firmwareCodePath}. Please ensure QEMU is properly installed.`);
    }

    if (firmwareVarsPath && !existsSync(firmwareVarsPath)) {
        throw new Error(`UEFI firmware vars not found at ${firmwareVarsPath}. Please ensure QEMU is properly installed.`);
    }
    return archConfig;
};

// Clean up disk image and any locks
export const cleanupDiskImage = () => {
    try {
        // Clean up disk image
        if (existsSync(DISK_IMAGE)) {
            // Try to remove any locks first
            try {
                execSync(`qemu-img info ${DISK_IMAGE} --force-share`);
            } catch (error) {
                // Ignore errors from force-share
            }
            // Remove the disk image
            execSync(`rm -f ${DISK_IMAGE}`);
        }
        // Clean up NVRAM files
        try {
            execSync('rm -f /tmp/test-vm.nvram*');
        } catch (error) {
            // Ignore errors from NVRAM cleanup
        }
    } catch (error) {
        console.error('Error cleaning up files:', error);
    }
};

// Clean up domain if it exists
export const cleanupDomain = async (connection: Hypervisor) => {
    try {
        console.log('Starting domain cleanup...');
        
        // Check both defined and active domains
        const definedDomains = await connection.connectListDefinedDomains();
        const activeDomainIds = await connection.connectListDomains();
        console.log('Defined domains:', definedDomains);
        console.log('Active domain IDs:', activeDomainIds);

        // Check if domain exists in either list
        if (definedDomains.includes(TEST_VM_NAME) || activeDomainIds.length > 0) {
            console.log(`Found existing domain ${TEST_VM_NAME}, attempting cleanup...`);
            try {
                const existingDomain = await connection.domainLookupByName(TEST_VM_NAME);
                if (existingDomain) {
                    try {
                        const info = await existingDomain.getInfo();
                        console.log('Domain state:', info.state);
                        if (info.state === DomainState.RUNNING) {
                            // Try graceful shutdown first
                            try {
                                console.log('Attempting graceful shutdown...');
                                await existingDomain.shutdown();
                                await new Promise(resolve => setTimeout(resolve, 2000));
                            } catch (error) {
                                console.log('Graceful shutdown failed:', error instanceof Error ? error.message : error);
                            }
                            // Force shutdown if still running
                            try {
                                console.log('Attempting force shutdown...');
                                await existingDomain.destroy();
                                await new Promise(resolve => setTimeout(resolve, 2000));
                            } catch (error) {
                                console.log('Force shutdown failed:', error instanceof Error ? error.message : error);
                            }
                        }
                    } catch (error) {
                        console.log('Error getting domain info:', error instanceof Error ? error.message : error);
                    }
                }
            } catch (error) {
                console.log('Error looking up domain:', error instanceof Error ? error.message : error);
            }

            // Now try to undefine the domain
            try {
                console.log('Attempting to undefine domain...');
                const domain = await connection.domainLookupByName(TEST_VM_NAME);
                if (domain) {
                    await connection.domainUndefine(domain);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    console.log('Domain undefined successfully');
                }
            } catch (error) {
                console.log('Error during undefine:', error instanceof Error ? error.message : error);
            }
        } else {
            console.log('No existing domain found to clean up');
        }
    } catch (error) {
        console.error('Error during domain cleanup:', error instanceof Error ? error.message : error);
    }
};

// Create disk image for testing
export const createDiskImage = () => {
    try {
        // Create a 1GB qcow2 disk image
        execSync(`qemu-img create -f qcow2 ${DISK_IMAGE} 1G`);
        console.log(`Created disk image at ${DISK_IMAGE}`);
    } catch (error) {
        console.error('Error creating disk image:', error);
        throw error;
    }
};

// Setup test environment
export const setupTestEnv = async () => {
    // Clean up disk image first
    cleanupDiskImage();

    // Create new disk image
    createDiskImage();

    // Connect to libvirt using session URI
    const options: HypervisorOptions = { uri: 'qemu:///session' };
    const connection = new Hypervisor(options);
    await connection.connectOpen();

    // Now clean up any existing domain
    await cleanupDomain(connection);

    // Verify QEMU installation before proceeding
    const archConfig = verifyQemuInstallation();
    console.log(`Using QEMU configuration for ${archConfig.arch}`);

    return { connection, archConfig };
}; 