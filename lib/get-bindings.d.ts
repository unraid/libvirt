import type {
    HypervisorOptions,
    DomainInfo,
    NodeInfo,
    DomainBlockInfo,
    DomainInterfaceInfo,
    DomainInterfaceAddress,
    DomainState,
    DomainRebootFlags,
    DomainInterfaceAddressesSource,
    ConnectListAllDomainsFlags,
    DomainGetXMLDescFlags
} from './types.js';

export declare class Hypervisor {
    constructor(options: HypervisorOptions);

    connectOpen(): Promise<void>;
    connectClose(): Promise<void>;
    connectListAllDomains(flags?: ConnectListAllDomainsFlags): Promise<Domain[]>;
    connectListDomains(): Promise<number[]>;
    connectListDefinedDomains(): Promise<string[]>;
    connectGetMaxVcpus(type?: string): Promise<number>;
    connectGetHostname(): Promise<string>;

    domainCreateXML(xml: string): Promise<Domain>;
    domainDefineXML(xml: string): Promise<Domain>;
    domainGetInfo(domain: Domain): Promise<DomainInfo>;
    domainGetID(domain: Domain): Promise<number | null>;
    domainGetName(domain: Domain): Promise<string>;
    domainGetUUIDString(domain: Domain): Promise<string>;
    domainLookupByID(id: number): Promise<Domain>;
    domainLookupByName(name: string): Promise<Domain>;
    domainLookupByUUIDString(uuid: string): Promise<Domain>;
    domainSave(domain: Domain, filename: string): Promise<void>;
    domainRestore(filename: string): Promise<void>;
    domainCreate(domain: Domain): Promise<void>;
    domainShutdown(domain: Domain): Promise<void>;
    domainGetXMLDesc(domain: Domain, flags?: DomainGetXMLDescFlags): Promise<string>;

    nodeGetInfo(): Promise<NodeInfo>;
}

export declare class Domain {
    isActive(): Promise<boolean>;
    isPersistent(): Promise<boolean>;
    isUpdated(): Promise<boolean>;
    
    suspend(): Promise<void>;
    resume(): Promise<void>;
    shutdown(): Promise<void>;
    reboot(flags?: DomainRebootFlags): Promise<void>;
    reset(): Promise<void>;
    
    getState(): Promise<DomainState>;
    getMaxMemory(): Promise<number>;
    setMaxMemory(memory: number): Promise<void>;
    getMemory(): Promise<number>;
    setMemory(memory: number): Promise<void>;
    getMaxVcpus(): Promise<number>;
    setVcpus(vcpus: number): Promise<void>;
    getVcpus(): Promise<number>;
    
    getXMLDesc(flags?: DomainGetXMLDescFlags): Promise<string>;
    defineXML(xml: string): Promise<void>;
    
    hasCurrentSnapshot(): Promise<boolean>;
    hasSnapshot(): Promise<boolean>;
    
    getBlockInfo(device: string): Promise<DomainBlockInfo>;
    getBlockDevices(): Promise<string[]>;
    
    getInterfaceAddresses(source?: DomainInterfaceAddressesSource): Promise<DomainInterfaceInfo[]>;
}

export type {
    HypervisorOptions,
    DomainInfo,
    NodeInfo,
    DomainBlockInfo,
    DomainInterfaceInfo,
    DomainInterfaceAddress,
    DomainState,
    DomainRebootFlags,
    DomainInterfaceAddressesSource,
    ConnectListAllDomainsFlags,
    DomainGetXMLDescFlags
};
