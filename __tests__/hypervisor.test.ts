import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Domain, DomainState } from '../lib';
import { domainDescToXml } from '../lib/domain-xml';
import { setupTestEnv, TEST_VM_NAME, DISK_IMAGE } from './helpers';
import { LibvirtError } from '../lib/types';
import { DomainBuilder } from '../lib/domain-builder';

describe('Hypervisor Tests', () => {
    let connection: any;
    let domain: Domain | null = null;
    let archConfig: any;

    beforeAll(async () => {
        const env = await setupTestEnv();
        connection = env.connection;
        archConfig = env.archConfig;
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

    it('should handle connection operations', async () => {
        // Test nodeGetInfo
        const nodeInfo = await connection.nodeGetInfo();
        expect(nodeInfo).toBeDefined();
        expect(typeof nodeInfo.memory).toBe('number');
        expect(typeof nodeInfo.cpus).toBe('number');

        // Test connectGetMaxVcpus
        const maxVcpus = await connection.connectGetMaxVcpus();
        expect(maxVcpus).toBeGreaterThan(0);
        try {
            const maxVcpusKvm = await connection.connectGetMaxVcpus('kvm');
            expect(maxVcpusKvm).toBeGreaterThan(0);
        } catch (error) {
            // Some systems might not support KVM, so we'll just log this
            console.log('KVM not available on this system');
        }

        // Test connectGetHostname
        const hostname = await connection.connectGetHostname();
        expect(typeof hostname).toBe('string');
        expect(hostname.length).toBeGreaterThan(0);
    });

    it('should handle domain operations', async () => {
        // Create a test domain
        const domainDesc = new DomainBuilder()
            .fromTemplate({
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
            })
            .build();

        const xml = domainDescToXml(domainDesc);
        const domain = await connection.domainDefineXML(xml);
        expect(domain).toBeDefined();

        // Start the domain
        await connection.domainCreate(domain);

        // Get domain ID and name
        const id = await connection.domainGetID(domain);
        expect(id).toBeDefined();
        expect(typeof id).toBe('number');

        const name = await connection.domainGetName(domain);
        expect(name).toBe(TEST_VM_NAME);

        // Get domain UUID and look it up
        const uuid = await connection.domainGetUUIDString(domain);
        expect(uuid).toBeDefined();
        expect(typeof uuid).toBe('string');

        const lookedUpDomain = await connection.domainLookupByUUIDString(uuid);
        expect(await connection.domainGetName(lookedUpDomain)).toBe(TEST_VM_NAME);

        // Get domain info
        const info = await connection.domainGetInfo(domain);
        expect(info).toBeDefined();
        expect(info.state).toBeDefined();
        expect(info.maxMem).toBeDefined();
        expect(info.memory).toBeDefined();
        expect(info.nrVirtCpu).toBeDefined();
        expect(info.cpuTime).toBeDefined();

        // Get domain XML description
        const xmlDesc = await connection.domainGetXMLDesc(domain);
        expect(xmlDesc).toBeDefined();
        expect(typeof xmlDesc).toBe('string');

        // Save domain state
        const saveFile = '/tmp/domain-save-test';
        await connection.domainSave(domain, saveFile);

        // Restore domain state
        await connection.domainRestore(saveFile);

        // Test error handling for domain operations
        await expect(connection.domainLookupByID(-1)).rejects.toThrow();
        await expect(connection.domainLookupByName('nonexistent')).rejects.toThrow();
        await expect(connection.domainLookupByUUIDString('invalid-uuid')).rejects.toThrow();

        // Shutdown and undefine domain
        await connection.domainDestroy(domain);
        await connection.domainUndefine(domain);
    });

    it('should handle domain listing operations', async () => {
        // Test connectListDomains
        const domains = await connection.connectListDomains();
        expect(Array.isArray(domains)).toBe(true);

        // Test connectListDefinedDomains
        const definedDomains = await connection.connectListDefinedDomains();
        expect(Array.isArray(definedDomains)).toBe(true);

        // Test connectListAllDomains
        const allDomains = await connection.connectListAllDomains();
        expect(Array.isArray(allDomains)).toBe(true);
    });

    it('should handle domain creation and lookup operations', async () => {
        // Create a test domain using DomainBuilder
        const builder = new DomainBuilder()
            .setName(TEST_VM_NAME)
            .setUUID('4b66504a-d874-4fd3-827a-d2b357de75b9')
            .addDisk({
                type: 'file',
                device: 'disk',
                driver: { name: 'qemu', type: 'qcow2' },
                source: { file: DISK_IMAGE },
                target: { dev: 'vda', bus: 'virtio' }
            });

        const domainDesc = builder.build();
        domainDesc.type = 'qemu';
        domainDesc.os = {
            type: {
                arch: archConfig.arch,
                machine: archConfig.machine,
                value: 'hvm'
            },
            boot: {
                dev: 'hd'
            }
        };
        domainDesc.memory = {
            unit: 'KiB',
            value: 524288 // 512MB
        };
        domainDesc.vcpu = {
            placement: 'static',
            value: 1
        };
        domainDesc.devices = [
            ...(domainDesc.devices || []),
            {
                type: 'emulator',
                emulator: {
                    value: archConfig.emulator
                }
            },
            {
                type: 'console',
                console: {
                    type: 'pty'
                }
            }
        ];

        const xml = domainDescToXml(domainDesc);
        
        // Test domainCreateXML
        const createdDomain = await connection.domainCreateXML(xml);
        expect(createdDomain).toBeDefined();
        expect(await createdDomain.getName()).toBe(TEST_VM_NAME);
        domain = createdDomain;

        // Test domainLookupByID
        const domainId = await createdDomain.getID();
        expect(domainId).not.toBeNull();
        if (domainId !== null) {
            const lookedUpDomain = await connection.domainLookupByID(domainId);
            expect(lookedUpDomain).toBeDefined();
            expect(await lookedUpDomain.getName()).toBe(TEST_VM_NAME);
        }

        // Test error handling with invalid domain ID
        await expect(connection.domainLookupByID(999999)).rejects.toThrow(LibvirtError);
    });

    it('should handle error cases with proper stack traces', async () => {
        // Test error handling with invalid XML
        const invalidXml = '<invalid>xml</invalid>';
        await expect(connection.domainCreateXML(invalidXml)).rejects.toThrow(LibvirtError);

        // Test error handling with invalid domain name
        await expect(connection.domainLookupByName('non-existent-domain')).rejects.toThrow(LibvirtError);

        // Test error handling with invalid UUID
        await expect(connection.domainLookupByUUIDString('invalid-uuid')).rejects.toThrow(LibvirtError);
    });
}); 