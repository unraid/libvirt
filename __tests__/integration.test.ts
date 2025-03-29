import { expect } from 'chai';
import { Hypervisor, Domain, DomainState } from '../lib';
import { domainDescToXml } from '../lib/domain-xml';
import { DomainDesc } from '../lib/domain-desc';
import { HypervisorOptions, Hypervisor as HypervisorType, Domain as DomainType } from '../lib/types';
import { arch as osArch, platform } from 'os';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

describe('Integration Tests', () => {
    let connection: HypervisorType;
    let domain: DomainType | null = null;
    const TEST_VM_NAME = 'test-integration-vm';
    const DISK_IMAGE = '/tmp/test-vm.img';

    // Determine architecture-specific configuration
    function getArchConfig(): { arch: string; machine: string; firmware?: { code: string; vars: string }; emulator: string } {
        if (process.platform === 'darwin') {
            if (process.arch === 'arm64') {
                return {
                    arch: 'aarch64',
                    machine: 'virt',
                    emulator: '/opt/homebrew/bin/qemu-system-aarch64'
                };
            } else {
                return {
                    arch: 'x86_64',
                    machine: 'q35',
                    emulator: '/opt/homebrew/bin/qemu-system-x86_64'
                };
            }
        } else {
            if (process.arch === 'arm64') {
                return {
                    arch: 'aarch64',
                    machine: 'virt',
                    emulator: '/usr/bin/qemu-system-aarch64'
                };
            } else {
                return {
                    arch: 'x86_64',
                    machine: 'q35',
                    emulator: '/usr/bin/qemu-system-x86_64'
                };
            }
        }
    }

    // Check if QEMU and firmware are available
    const verifyQemuInstallation = () => {
        const archConfig = getArchConfig();
        const qemuPath = archConfig.emulator;
        const firmwareCodePath = archConfig.firmware?.code;
        const firmwareVarsPath = archConfig.firmware?.vars;

        if (!existsSync(qemuPath)) {
            throw new Error(`QEMU not found at ${qemuPath}. Please install QEMU first.`);
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
    const cleanupDiskImage = () => {
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
    const cleanupDomain = async () => {
        try {
            // First check if domain exists without generating error output
            const domains = await connection.connectListDefinedDomains();
            if (domains.includes(TEST_VM_NAME)) {
                try {
                    const existingDomain = await connection.domainLookupByName(TEST_VM_NAME);
                    if (existingDomain) {
                        try {
                            const info = await connection.domainGetInfo(existingDomain);
                            if (info.state === DomainState.RUNNING) {
                                // Try graceful shutdown first
                                try {
                                    execSync(`virsh -c qemu:///session shutdown ${TEST_VM_NAME}`);
                                    await new Promise(resolve => setTimeout(resolve, 1000));
                                } catch (error) {
                                    // Ignore errors during shutdown
                                }
                                // Force shutdown if still running
                                try {
                                    execSync(`virsh -c qemu:///session destroy ${TEST_VM_NAME}`);
                                    await new Promise(resolve => setTimeout(resolve, 1000));
                                } catch (error) {
                                    // Ignore errors during force shutdown
                                }
                            }
                        } catch (error) {
                            // Ignore errors during info check
                        }
                    }
                } catch (error) {
                    // Ignore errors if domain doesn't exist
                }

                // Now try to undefine the domain
                try {
                    execSync(`virsh -c qemu:///session undefine ${TEST_VM_NAME}`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    // Ignore errors during undefine
                }
            }
        } catch (error) {
            // Ignore errors during cleanup
        }
    };

    before(async () => {
        try {
            // Clean up disk image first
            cleanupDiskImage();

            // Connect to libvirt using session URI
            const options: HypervisorOptions = { uri: 'qemu:///session' };
            connection = new Hypervisor(options);
            await connection.connectOpen();

            // Now clean up any existing domain
            await cleanupDomain();

            // Verify QEMU installation before proceeding
            const archConfig = verifyQemuInstallation();
            console.log(`Using QEMU configuration for ${archConfig.arch}`);
        } catch (error) {
            console.error('Error in before hook:', error);
            throw error;
        }
    });

    after(async () => {
        // Clean up: stop and remove the test VM if it exists
        if (domain) {
            try {
                const info = await connection.domainGetInfo(domain);
                if (info.state === DomainState.RUNNING) {
                    await connection.domainShutdown(domain);
                    // Wait for shutdown to complete
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                console.error('Error during cleanup:', error);
            }
            // Clear the domain reference
            domain = null;
        }
        if (connection) {
            await connection.connectClose();
        }
        // Clean up disk image and domain
        cleanupDiskImage();
        await cleanupDomain();
    });

    it('should create, start, and stop a VM', async function() {
        // Increase timeout for this test
        this.timeout(30000);

        const archConfig = getArchConfig();

        // Create a copy of the NVRAM file for this VM
        if (archConfig.firmware) {
            execSync(`cp "${archConfig.firmware.vars}" "/tmp/test-vm.nvram"`);
        }

        // Create a minimal VM configuration
        const domainDesc: DomainDesc = {
            type: 'qemu',
            name: TEST_VM_NAME,
            memory: { value: 512 * 1024 }, // 512MB RAM
            vcpu: { value: 1 },
            os: {
                type: { 
                    arch: archConfig.arch,
                    machine: archConfig.machine,
                    value: 'hvm'
                },
                boot: { dev: 'hd' }
            },
            devices: [
                {
                    type: 'emulator',
                    emulator: {
                        value: archConfig.emulator
                    }
                },
                {
                    type: 'disk',
                    disk: {
                        type: 'file',
                        device: 'disk',
                        driver: {
                            name: 'qemu',
                            type: 'qcow2'
                        },
                        source: {
                            file: DISK_IMAGE
                        },
                        target: {
                            dev: 'vda',
                            bus: 'virtio'
                        }
                    }
                },
                {
                    type: 'console',
                    console: {
                        type: 'pty'
                    }
                }
            ]
        };

        // Convert domain description to XML
        const xml = domainDescToXml(domainDesc);
        console.log('Generated XML:', xml);

        // Create a small disk image for the VM
        execSync(`qemu-img create -f qcow2 ${DISK_IMAGE} 1G`);

        try {
            // Define and start the domain
            domain = await connection.domainDefineXML(xml);
            console.log('Domain defined successfully');

            await connection.domainCreate(domain);
            console.log('Domain created successfully');

            // Wait a moment for the domain to start
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Verify the domain is running
            const info = await connection.domainGetInfo(domain);
            console.log('Domain state:', info.state);
            expect(info.state).to.equal(DomainState.RUNNING);

            // Get domain info
            const name = await connection.domainGetName(domain);
            console.log('Domain info:', { name, state: info.state, maxMem: info.maxMem, nrVirtCpu: info.nrVirtCpu });
            expect(name).to.equal(TEST_VM_NAME);
            expect(info.state).to.equal(DomainState.RUNNING);
            expect(info.maxMem).to.equal(512 * 1024);
            expect(info.nrVirtCpu).to.equal(1);

            // Try graceful shutdown first (we know it won't work without an OS)
            console.log('Attempting graceful shutdown (expected to fail without OS)...');
            try {
                execSync(`virsh -c qemu:///session shutdown ${TEST_VM_NAME}`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.log('Graceful shutdown failed as expected (no OS installed)');
            }

            // Now perform force shutdown
            console.log('Performing force shutdown...');
            try {
                execSync(`virsh -c qemu:///session destroy ${TEST_VM_NAME}`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                console.error('Error during force shutdown:', error);
            }

            // Verify the domain is shut down
            const finalInfo = await connection.domainGetInfo(domain);
            console.log('Final domain state:', finalInfo.state);
            expect(finalInfo.state).to.equal(DomainState.SHUTOFF);

        } catch (error) {
            console.error('Error during VM operations:', error);
            throw error;
        } finally {
            // Clear the domain reference before cleanup
            domain = null;
        }
    });
}); 