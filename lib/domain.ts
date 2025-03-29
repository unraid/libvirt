import { Domain as NativeDomain, DomainInfo, DomainGetXMLDescFlags } from './types.js';

export class Domain {
    private nativeDomain: NativeDomain;
    private hypervisor: any; // We'll use any here since we don't want to create a circular dependency

    constructor(nativeDomain: NativeDomain, hypervisor: any) {
        this.nativeDomain = nativeDomain;
        this.hypervisor = hypervisor;
    }

    // Domain operations
    async save(filename: string): Promise<void> {
        return this.hypervisor.domainSave(this, filename);
    }

    async create(): Promise<void> {
        return this.hypervisor.domainCreate(this);
    }

    async shutdown(): Promise<void> {
        return this.hypervisor.domainShutdown(this);
    }

    async destroy(): Promise<void> {
        return this.hypervisor.domainDestroy(this);
    }

    async undefine(): Promise<void> {
        return this.hypervisor.domainUndefine(this);
    }

    async getXMLDesc(flags?: DomainGetXMLDescFlags): Promise<string> {
        return this.hypervisor.domainGetXMLDesc(this, flags);
    }

    // Domain information
    async getInfo(): Promise<DomainInfo> {
        return this.hypervisor.domainGetInfo(this);
    }

    async getID(): Promise<number | null> {
        return this.hypervisor.domainGetID(this);
    }

    async getName(): Promise<string> {
        return this.hypervisor.domainGetName(this);
    }

    async getUUIDString(): Promise<string> {
        return this.hypervisor.domainGetUUIDString(this);
    }

    // Method to get the native domain object (for internal use)
    getNativeDomain(): NativeDomain {
        return this.nativeDomain;
    }
} 