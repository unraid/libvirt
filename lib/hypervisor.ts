import { Domain as NativeDomain, DomainInfo, DomainGetXMLDescFlags, ConnectListAllDomainsFlags, NodeInfo, LibvirtError } from './types.js';
import { Domain } from './domain.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export class Hypervisor {
    private nativeHypervisor: any;

    constructor(options: { uri: string }) {
        // Use require for native module since it's not an ES module
        this.nativeHypervisor = new (require('../build/Release/libvirt').Hypervisor)(options);
    }

    private handleError(error: any): never {
        if (error instanceof Error) {
            // If it's already an Error instance, convert it to LibvirtError
            const libvirtError = new LibvirtError(
                error.message,
                (error as any).code || -1,
                (error as any).domain || -1,
                (error as any).level || -1,
                (error as any).str1,
                (error as any).str2,
                (error as any).str3
            );
            throw libvirtError;
        }
        // If it's a string or something else, create a generic LibvirtError
        throw new LibvirtError(
            error.toString(),
            -1,
            -1,
            -1
        );
    }

    // Connection methods
    async connectOpen(): Promise<void> {
        try {
            return await this.nativeHypervisor.connectOpen();
        } catch (error) {
            this.handleError(error);
        }
    }

    async connectClose(): Promise<void> {
        try {
            return await this.nativeHypervisor.connectClose();
        } catch (error) {
            this.handleError(error);
        }
    }

    // Domain listing methods
    async connectListAllDomains(flags?: ConnectListAllDomainsFlags): Promise<Domain[]> {
        try {
            const nativeDomains = await this.nativeHypervisor.connectListAllDomains(flags);
            return nativeDomains.map((d: NativeDomain) => new Domain(d, this));
        } catch (error) {
            this.handleError(error);
        }
    }

    async connectListDomains(): Promise<number[]> {
        try {
            return await this.nativeHypervisor.connectListDomains();
        } catch (error) {
            this.handleError(error);
        }
    }

    async connectListDefinedDomains(): Promise<string[]> {
        try {
            return await this.nativeHypervisor.connectListDefinedDomains();
        } catch (error) {
            this.handleError(error);
        }
    }

    // Domain creation and lookup methods
    async domainCreateXML(xml: string): Promise<Domain> {
        try {
            const nativeDomain = await this.nativeHypervisor.domainCreateXML(xml);
            return new Domain(nativeDomain, this);
        } catch (error) {
            this.handleError(error);
        }
    }

    async domainDefineXML(xml: string): Promise<Domain> {
        try {
            const nativeDomain = await this.nativeHypervisor.domainDefineXML(xml);
            return new Domain(nativeDomain, this);
        } catch (error) {
            this.handleError(error);
        }
    }

    async domainLookupByID(id: number): Promise<Domain> {
        try {
            const nativeDomain = await this.nativeHypervisor.domainLookupByID(id);
            return new Domain(nativeDomain, this);
        } catch (error) {
            this.handleError(error);
        }
    }

    async domainLookupByName(name: string): Promise<Domain> {
        try {
            const nativeDomain = await this.nativeHypervisor.domainLookupByName(name);
            return new Domain(nativeDomain, this);
        } catch (error) {
            this.handleError(error);
        }
    }

    async domainLookupByUUIDString(uuid: string): Promise<Domain> {
        try {
            const nativeDomain = await this.nativeHypervisor.domainLookupByUUIDString(uuid);
            return new Domain(nativeDomain, this);
        } catch (error) {
            this.handleError(error);
        }
    }

    // Domain operations (these are used internally by the Domain wrapper)
    async domainSave(domain: Domain, filename: string): Promise<void> {
        try {
            return await this.nativeHypervisor.domainSave(domain.getNativeDomain(), filename);
        } catch (error) {
            this.handleError(error);
        }
    }

    async domainCreate(domain: Domain): Promise<void> {
        try {
            return await this.nativeHypervisor.domainCreate(domain.getNativeDomain());
        } catch (error) {
            this.handleError(error);
        }
    }

    async domainShutdown(domain: Domain): Promise<void> {
        try {
            return await this.nativeHypervisor.domainShutdown(domain.getNativeDomain());
        } catch (error) {
            this.handleError(error);
        }
    }

    async domainDestroy(domain: Domain): Promise<void> {
        try {
            return await this.nativeHypervisor.domainDestroy(domain.getNativeDomain());
        } catch (error) {
            this.handleError(error);
        }
    }

    async domainUndefine(domain: Domain): Promise<void> {
        try {
            return await this.nativeHypervisor.domainUndefine(domain.getNativeDomain());
        } catch (error) {
            this.handleError(error);
        }
    }

    // Domain information
    async domainGetInfo(domain: Domain): Promise<DomainInfo> {
        try {
            return await this.nativeHypervisor.domainGetInfo(domain.getNativeDomain());
        } catch (error) {
            this.handleError(error);
        }
    }

    async domainGetID(domain: Domain): Promise<number | null> {
        try {
            return await this.nativeHypervisor.domainGetID(domain.getNativeDomain());
        } catch (error) {
            this.handleError(error);
        }
    }

    async domainGetName(domain: Domain): Promise<string> {
        try {
            return await this.nativeHypervisor.domainGetName(domain.getNativeDomain());
        } catch (error) {
            this.handleError(error);
        }
    }

    async domainGetUUIDString(domain: Domain): Promise<string> {
        try {
            return await this.nativeHypervisor.domainGetUUIDString(domain.getNativeDomain());
        } catch (error) {
            this.handleError(error);
        }
    }

    async domainGetXMLDesc(domain: Domain, flags?: DomainGetXMLDescFlags): Promise<string> {
        try {
            return await this.nativeHypervisor.domainGetXMLDesc(domain.getNativeDomain(), flags);
        } catch (error) {
            this.handleError(error);
        }
    }

    // Other methods
    async connectGetMaxVcpus(type?: string): Promise<number> {
        try {
            return await this.nativeHypervisor.connectGetMaxVcpus(type);
        } catch (error) {
            this.handleError(error);
        }
    }

    async connectGetHostname(): Promise<string> {
        try {
            return await this.nativeHypervisor.connectGetHostname();
        } catch (error) {
            this.handleError(error);
        }
    }

    async nodeGetInfo(): Promise<NodeInfo> {
        try {
            return await this.nativeHypervisor.nodeGetInfo();
        } catch (error) {
            this.handleError(error);
        }
    }
} 