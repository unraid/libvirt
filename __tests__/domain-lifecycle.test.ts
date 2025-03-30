import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Domain, DomainState } from '../lib';
import { domainDescToXml } from '../lib/domain-xml';
import { DomainDesc } from '../lib/domain-desc';
import { execSync } from 'child_process';
import { setupTestEnv, TEST_VM_NAME, DISK_IMAGE } from './helpers';

describe('Domain Lifecycle Tests', () => {
    let connection: any;
    let domain: Domain | null = null;
    let archConfig: any;

    beforeAll(async () => {
        const env = await setupTestEnv();
        connection = env.connection;
        archConfig = env.archConfig;
    }, 10000);

    beforeEach(async () => {
        // Clean up any existing domain
        try {
            const existingDomain = await connection.domainLookupByName(TEST_VM_NAME);
            if (existingDomain) {
                const info = await connection.domainGetInfo(existingDomain);
                if (info.state === DomainState.RUNNING) {
                    await connection.domainShutdown(existingDomain);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                await connection.domainUndefine(existingDomain);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            // Ignore errors from cleanup
        }
    }, 10000);

    afterAll(async () => {
        if (domain) {
            try {
                const info = await connection.domainGetInfo(domain);
                if (info.state === DomainState.RUNNING) {
                    await connection.domainShutdown(domain);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                console.error('Error during cleanup:', error);
            }
            domain = null;
        }
        if (connection) {
            await connection.connectClose();
        }
    }, 10000);

    it('should create, start, and stop a VM', async () => {
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

            if (!domain) {
                throw new Error('Failed to create domain');
            }

            // Test the create() method
            await domain.create();
            console.log('Domain created successfully');

            // Verify domain state
            const info = await connection.domainGetInfo(domain);
            console.log('Domain state:', info.state);
            console.log('Domain info:', info);
            expect(info.state).toBe(DomainState.RUNNING);

            // Get domain info
            const name = await connection.domainGetName(domain);
            console.log('Domain info:', { name, state: info.state, maxMem: info.maxMem, nrVirtCpu: info.nrVirtCpu });
            expect(name).toBe(TEST_VM_NAME);
            expect(info.state).toBe(DomainState.RUNNING);
            expect(info.maxMem).toBe(512 * 1024);
            expect(info.nrVirtCpu).toBe(1);

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
            expect(finalInfo.state).toBe(DomainState.SHUTOFF);

        } catch (error) {
            console.error('Error during VM operations:', error);
            throw error;
        } finally {
            // Clear the domain reference before cleanup
            domain = null;
        }
    }, 60000);

    it('should handle suspend and resume operations', async () => {
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

        try {
            // Define and start the domain
            domain = await connection.domainDefineXML(xml);
            console.log('Domain defined successfully');

            if (!domain) {
                throw new Error('Failed to create domain');
            }

            // Start the domain
            await domain.create();
            console.log('Domain created successfully');

            // Verify initial running state
            const initialInfo = await connection.domainGetInfo(domain);
            console.log('Initial domain state:', initialInfo.state);
            expect(initialInfo.state).toBe(DomainState.RUNNING);

            // Suspend the domain
            await domain.suspend();
            console.log('Domain suspended');

            // Verify state after suspend
            const stateAfterSuspend = await connection.domainGetInfo(domain);
            console.log('Domain state after suspend:', stateAfterSuspend.state);
            expect(stateAfterSuspend.state).toBe(DomainState.PAUSED);

            // Resume the domain
            await domain.resume();
            console.log('Domain resumed');

            // Verify state after resume
            const stateAfterResume = await connection.domainGetInfo(domain);
            console.log('Domain state after resume:', stateAfterResume.state);
            expect(stateAfterResume.state).toBe(DomainState.RUNNING);

            // Clean up by shutting down
            console.log('Performing cleanup shutdown...');
            await domain.destroy();

            // Verify final state
            const finalState = (await domain.getInfo()).state;
            console.log('Final domain state:', finalState);
            expect(finalState).toBe(DomainState.SHUTOFF);

            // Undefine the domain
            await domain.undefine();

        } catch (error) {
            console.error('Error during VM operations:', error);
            throw error;
        } finally {
            // Clear the domain reference before cleanup
            domain = null;
        }
    }, 60000);
}); 