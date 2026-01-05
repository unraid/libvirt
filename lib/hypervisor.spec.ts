import { describe, it, expect, vi } from 'vitest';
import { Hypervisor } from './hypervisor.js';
import { Domain } from './domain.js';

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
});
