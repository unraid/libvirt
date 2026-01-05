import { describe, it, expect, vi } from 'vitest';
import { Hypervisor } from './hypervisor.js';
import { Domain } from './domain.js';
import { NodeSuspendTarget } from './types.js';

describe('Hypervisor', () => {
    it('should wake a PMSUSPENDED domain', async () => {
        const hypervisor = Object.create(Hypervisor.prototype) as Hypervisor;
        const domainPMWakeup = vi.fn().mockResolvedValue(undefined);

        (hypervisor as any).nativeHypervisor = {
            domainPMWakeup
        };

        const domain = {
            getNativeDomain: vi.fn().mockReturnValue({ id: 'native' })
        } as unknown as Domain;

        await hypervisor.domainPMWakeup(domain);

        expect(domainPMWakeup).toHaveBeenCalledWith({ id: 'native' });
    });

    it('should suspend a domain with power management', async () => {
        const hypervisor = Object.create(Hypervisor.prototype) as Hypervisor;
        const domainPMSuspend = vi.fn().mockResolvedValue(undefined);

        (hypervisor as any).nativeHypervisor = {
            domainPMSuspend
        };

        const domain = {
            getNativeDomain: vi.fn().mockReturnValue({ id: 'native' })
        } as unknown as Domain;

        await hypervisor.domainPMSuspend(domain);

        expect(domainPMSuspend).toHaveBeenCalledWith({ id: 'native' }, NodeSuspendTarget.MEM);
    });

    it('should pass a custom suspend target', async () => {
        const hypervisor = Object.create(Hypervisor.prototype) as Hypervisor;
        const domainPMSuspend = vi.fn().mockResolvedValue(undefined);

        (hypervisor as any).nativeHypervisor = {
            domainPMSuspend
        };

        const domain = {
            getNativeDomain: vi.fn().mockReturnValue({ id: 'native' })
        } as unknown as Domain;

        await hypervisor.domainPMSuspend(domain, NodeSuspendTarget.DISK);

        expect(domainPMSuspend).toHaveBeenCalledWith({ id: 'native' }, NodeSuspendTarget.DISK);
    });
});
