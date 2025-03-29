import { expect } from 'chai';
import { Hypervisor, Domain, DomainState } from '../lib';
import { domainDescToXml } from '../lib/domain-xml';
import { DomainDesc } from '../lib/domain-desc';
import { HypervisorOptions } from '../lib/types';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { LibvirtError } from '../lib/types.js';

describe('Integration Tests', () => {
    let connection: Hypervisor;
    let domain: Domain | null = null;
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

    before(async function() {
        // Increase timeout for the before hook
        this.timeout(10000);

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

            // Try graceful shutdown first (we know it won't work without OS)
            console.log('Attempting graceful shutdown (expected to fail without OS)...');
            try {
                await connection.domainShutdown(domain);
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.log('Graceful shutdown failed as expected (no OS installed)');
            }

            // Now perform force shutdown
            console.log('Performing force shutdown...');
            try {
                await connection.domainDestroy(domain);
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                console.error('Error during force shutdown:', error);
                throw error;
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

    it('should allow undefining a domain through the domain object', async function() {
        this.timeout(30000);

        // Clean up any existing domain first
        await cleanupDomain();
        
        const archConfig = getArchConfig();

        // Create a minimal VM configuration
        const domainDesc: DomainDesc = {
            type: 'qemu',
            name: TEST_VM_NAME,
            memory: { value: 512 * 1024 },
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
                }
            ]
        };

        // Convert domain description to XML and define the domain
        const xml = domainDescToXml(domainDesc);
        domain = await connection.domainDefineXML(xml);
        expect(domain).to.not.be.null;

        // Verify the domain exists
        const definedDomains = await connection.connectListDefinedDomains();
        expect(definedDomains).to.include(TEST_VM_NAME);

        // Undefine using the domain object method
        await domain.undefine();

        // Verify the domain no longer exists
        const remainingDomains = await connection.connectListDefinedDomains();
        expect(remainingDomains).to.not.include(TEST_VM_NAME);
    });

    it('should allow undefining a domain through the hypervisor', async function() {
        this.timeout(30000);

        // Clean up any existing domain first
        await cleanupDomain();
        
        const archConfig = getArchConfig();

        // Create a minimal VM configuration
        const domainDesc: DomainDesc = {
            type: 'qemu',
            name: TEST_VM_NAME,
            memory: { value: 512 * 1024 },
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
                }
            ]
        };

        // Convert domain description to XML and define the domain
        const xml = domainDescToXml(domainDesc);
        domain = await connection.domainDefineXML(xml);
        expect(domain).to.not.be.null;

        // Verify the domain exists
        const definedDomains = await connection.connectListDefinedDomains();
        expect(definedDomains).to.include(TEST_VM_NAME);

        // Undefine using the hypervisor method
        await connection.domainUndefine(domain);

        // Verify the domain no longer exists
        const remainingDomains = await connection.connectListDefinedDomains();
        expect(remainingDomains).to.not.include(TEST_VM_NAME);
    });

    it('should handle errors when trying to undefine a non-existent domain', async function() {
        this.timeout(30000);

        // Clean up any existing domain first
        await cleanupDomain();

        try {
            const domain = await connection.domainLookupByName('non-existent-domain');
            await domain.undefine();
            // If we get here, the undefine succeeded unexpectedly
            expect.fail('Expected domain operations to throw an error');
        } catch (error) {
            expect(error).to.be.instanceOf(LibvirtError);
            expect(error.message).to.match(/Domain not found: no domain with matching name 'non-existent-domain'/);
            expect(error.code).to.be.a('number');
            expect(error.domain).to.be.a('number');
        }
    });
}); 