import { describe, it, beforeEach, vi, expect } from 'vitest';
import { Domain } from './domain.js';
import { Hypervisor } from './hypervisor.js';
import { DomainGetXMLDescFlags } from './types.js';

describe('Domain', () => {
    let domain: Domain;
    let hypervisor: Hypervisor;

    beforeEach(() => {
        // Mock the hypervisor methods
        const domainSave = vi.fn();
        const domainCreate = vi.fn();
        const domainShutdown = vi.fn();
        const domainDestroy = vi.fn();
        const domainUndefine = vi.fn();
        const domainGetXMLDesc = vi.fn().mockResolvedValue('<domain/>');
        const domainGetInfo = vi.fn().mockResolvedValue({
            state: 1,
            maxMem: 1024,
            memory: 512,
            nrVirtCpu: 1,
            cpuTime: 0
        });
        const domainGetID = vi.fn().mockResolvedValue(1);
        const domainGetName = vi.fn().mockResolvedValue('test-vm');
        const domainGetUUIDString = vi.fn().mockResolvedValue('123e4567-e89b-12d3-a456-426614174000');

        // Create mock hypervisor
        hypervisor = {
            domainSave,
            domainCreate,
            domainShutdown,
            domainDestroy,
            domainUndefine,
            domainGetXMLDesc,
            domainGetInfo,
            domainGetID,
            domainGetName,
            domainGetUUIDString
        } as unknown as Hypervisor;

        // Mock the native domain
        const nativeDomain = {};
        domain = new Domain(nativeDomain, hypervisor);
    });

    describe('save', () => {
        it('should save domain state to file', async () => {
            const filename = '/tmp/test-vm.save';
            await domain.save(filename);
            expect(hypervisor.domainSave).toHaveBeenCalledWith(domain, filename);
        });
    });

    describe('getXMLDesc', () => {
        it('should get XML description without flags', async () => {
            const xml = await domain.getXMLDesc();
            expect(xml).toBe('<domain/>');
            expect(hypervisor.domainGetXMLDesc).toHaveBeenCalledWith(domain, undefined);
        });

        it('should get XML description with flags', async () => {
            const flags = DomainGetXMLDescFlags.SECURE;
            const xml = await domain.getXMLDesc(flags);
            expect(xml).toBe('<domain/>');
            expect(hypervisor.domainGetXMLDesc).toHaveBeenCalledWith(domain, flags);
        });
    });

    describe('getID', () => {
        it('should get domain ID', async () => {
            const id = await domain.getID();
            expect(id).toBe(1);
            expect(hypervisor.domainGetID).toHaveBeenCalledWith(domain);
        });
    });

    describe('getUUIDString', () => {
        it('should get domain UUID', async () => {
            const uuid = await domain.getUUIDString();
            expect(uuid).toBe('123e4567-e89b-12d3-a456-426614174000');
            expect(hypervisor.domainGetUUIDString).toHaveBeenCalledWith(domain);
        });
    });
}); 