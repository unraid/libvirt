import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Domain, DomainState } from '../lib';
import { domainDescToXml } from '../lib/domain-xml';
import { DomainDesc } from '../lib/domain-desc';
import { ConnectListAllDomainsFlags } from '../lib/types';
import { setupTestEnv, TEST_VM_NAME, DISK_IMAGE } from './helpers';

describe('Domain Listing and Querying Tests', () => {
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

    it('should list domains with different flags', async () => {
        // Create a test domain
        const domainDesc: DomainDesc = {
            type: 'qemu',
            name: TEST_VM_NAME,
            memory: {
                unit: 'KiB',
                value: 1024 * 1024 // 1GB in KiB
            },
            vcpu: {
                placement: 'static',
                value: 1
            },
            os: {
                type: {
                    arch: archConfig.arch,
                    machine: archConfig.machine,
                    value: 'hvm'
                },
                boot: {
                    dev: 'hd'
                }
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
                        source: {
                            file: DISK_IMAGE
                        },
                        target: {
                            dev: 'hda',
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

        const xml = domainDescToXml(domainDesc);
        domain = await connection.domainDefineXML(xml);

        // Test listing active domains (should be empty initially)
        const activeDomains = await connection.connectListAllDomains(1 as ConnectListAllDomainsFlags);
        expect(Array.isArray(activeDomains)).toBe(true);
        expect(activeDomains.length).toBe(0);

        // Test listing inactive domains (should include our defined domain)
        const inactiveDomains = await connection.connectListAllDomains(2 as ConnectListAllDomainsFlags);
        expect(Array.isArray(inactiveDomains)).toBe(true);
        expect(inactiveDomains.length).toBeGreaterThan(0);
        const inactiveNames = await Promise.all(inactiveDomains.map(d => d.getName()));
        expect(inactiveNames).toContain(TEST_VM_NAME);

        // Start the domain
        await connection.domainCreate(domain);

        // Test listing running domains
        const runningDomains = await connection.connectListAllDomains(16 as ConnectListAllDomainsFlags);
        expect(Array.isArray(runningDomains)).toBe(true);
        expect(runningDomains.length).toBeGreaterThan(0);
        const runningNames = await Promise.all(runningDomains.map(d => d.getName()));
        expect(runningNames).toContain(TEST_VM_NAME);

        // Test listing persistent domains
        const persistentDomains = await connection.connectListAllDomains(4 as ConnectListAllDomainsFlags);
        expect(Array.isArray(persistentDomains)).toBe(true);
        const persistentNames = await Promise.all(persistentDomains.map(d => d.getName()));
        expect(persistentNames).toContain(TEST_VM_NAME);

        // Test listing transient domains
        const transientDomains = await connection.connectListAllDomains(8 as ConnectListAllDomainsFlags);
        expect(Array.isArray(transientDomains)).toBe(true);
        const transientNames = await Promise.all(transientDomains.map(d => d.getName()));
        expect(transientNames).not.toContain(TEST_VM_NAME);

        // Test listing all domains
        const allDomains = await connection.connectListAllDomains(ConnectListAllDomainsFlags.ACTIVE | ConnectListAllDomainsFlags.INACTIVE);
        expect(Array.isArray(allDomains)).toBe(true);
        expect(allDomains.length).toBeGreaterThan(0);
        const allNames = await Promise.all(allDomains.map(d => d.getName()));
        expect(allNames).toContain(TEST_VM_NAME);

        // Clean up
        await connection.domainShutdown(domain);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await connection.domainUndefine(domain);
        domain = null;
    }, 30000);
}); 