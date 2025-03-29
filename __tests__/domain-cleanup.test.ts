import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Domain, DomainState } from '../lib';
import { domainDescToXml } from '../lib/domain-xml';
import { DomainDesc } from '../lib/domain-desc';
import { LibvirtError } from '../lib/types.js';
import { setupTestEnv, TEST_VM_NAME } from './helpers';

describe('Domain Cleanup and Error Handling Tests', () => {
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

    it('should allow undefining a domain through the domain object', async () => {
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
        expect(domain).not.toBeNull();

        // Verify the domain exists
        const definedDomains = await connection.connectListDefinedDomains();
        expect(definedDomains).toContain(TEST_VM_NAME);

        // Undefine using the domain object method
        if (domain) {
            await domain.undefine();
        }

        // Verify the domain no longer exists
        const remainingDomains = await connection.connectListDefinedDomains();
        expect(remainingDomains).not.toContain(TEST_VM_NAME);
    }, 30000);

    it('should allow undefining a domain through the hypervisor', async () => {
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
        expect(domain).not.toBeNull();

        // Verify the domain exists
        const definedDomains = await connection.connectListDefinedDomains();
        expect(definedDomains).toContain(TEST_VM_NAME);

        // Undefine using the hypervisor method
        if (domain) {
            await connection.domainUndefine(domain);
        }

        // Verify the domain no longer exists
        const remainingDomains = await connection.connectListDefinedDomains();
        expect(remainingDomains).not.toContain(TEST_VM_NAME);
    }, 30000);

    it('should handle errors when trying to undefine a non-existent domain', async () => {
        try {
            const domain = await connection.domainLookupByName('non-existent-domain');
            await domain.undefine();
            // If we get here, the undefine succeeded unexpectedly
            expect.fail('Expected domain operations to throw an error');
        } catch (error) {
            expect(error).toBeInstanceOf(LibvirtError);
            expect(error.message).toMatch(/Domain not found: no domain with matching name 'non-existent-domain'/);
            expect(typeof error.code).toBe('number');
            expect(typeof error.domain).toBe('number');
        }
    }, 30000);
}); 