/**
 * Options for creating a new Hypervisor instance
 */
export interface HypervisorOptions {
    uri: string;
}

/**
 * Information about a domain's state and resources
 */
export interface DomainInfo {
    state: DomainState;
    maxMem: number;
    memory: number;
    nrVirtCpu: number;
    cpuTime: number;
}

/**
 * Information about the host node
 */
export interface NodeInfo {
    model: string;
    memory: number;
    cpus: number;
    mhz: number;
    nodes: number;
    sockets: number;
    cores: number;
    threads: number;
}

/**
 * Information about a domain's block device
 */
export interface DomainBlockInfo {
    capacity: number;
    allocation: number;
    physical: number;
}

/**
 * Information about a domain's network interface
 */
export interface DomainInterfaceInfo {
    name: string;
    hwaddr: string;
    addrs: DomainInterfaceAddress[];
}

/**
 * Information about a network interface address
 */
export interface DomainInterfaceAddress {
    type: number;
    addr: string;
    prefix: number;
}

/**
 * Possible states a domain can be in
 */
export enum DomainState {
    NOSTATE = 0,
    RUNNING = 1,
    BLOCKED = 2,
    PAUSED = 3,
    SHUTDOWN = 4,
    SHUTOFF = 5,
    CRASHED = 6,
    PMSUSPENDED = 7
}

/**
 * Flags for domain reboot operations
 */
export enum DomainRebootFlags {
    NONE = 0,
    ACPI = 1,
    GUEST_AGENT = 2,
    INIT = 4,
    SIGNAL = 8
}

/**
 * Sources for domain interface addresses
 */
export enum DomainInterfaceAddressesSource {
    LEASE = 0,
    AGENT = 1,
    ARP = 2
}

/**
 * Flags for listing domains
 */
export enum ConnectListAllDomainsFlags {
    ACTIVE = 1,
    INACTIVE = 2,
    PERSISTENT = 4,
    TRANSIENT = 8,
    RUNNING = 16,
    PAUSED = 32,
    SHUTOFF = 64,
    OTHER = 128,
    MANAGEDSAVE = 256,
    NO_MANAGEDSAVE = 512,
    AUTOSTART = 1024,
    NO_AUTOSTART = 2048,
    HAS_SNAPSHOT = 4096,
    NO_SNAPSHOT = 8192,
    HAS_CHECKPOINT = 16384,
    NO_CHECKPOINT = 32768
}

/**
 * Flags for getting domain XML description
 */
export enum DomainGetXMLDescFlags {
    NONE = 0,
    SECURE = 1,
    INACTIVE = 2,
    UPDATE_CPU = 4,
    MIGRATABLE = 8
}

/**
 * Marker type for the native domain object
 */
export type Domain = any;

export class LibvirtError extends Error {
    code: number;
    domain: number;
    level: number;
    str1?: string;
    str2?: string;
    str3?: string;

    constructor(message: string, code: number, domain: number, level: number, str1?: string, str2?: string, str3?: string) {
        super(message);
        this.name = 'LibvirtError';
        this.code = code;
        this.domain = domain;
        this.level = level;
        this.str1 = str1;
        this.str2 = str2;
        this.str3 = str3;

        // Add more context to the error message
        if (message === 'Expected a number.') {
            this.message = `Type error: Expected a number but received ${typeof str1 || 'undefined'}. This error typically occurs when calling libvirt methods that require numeric parameters.`;
        }
    }

    toString(): string {
        return `${this.name}: ${this.message} (code: ${this.code}, domain: ${this.domain}, level: ${this.level})`;
    }
} 