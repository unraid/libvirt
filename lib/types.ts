export interface HypervisorOptions {
    uri: string;
}

export interface DomainInfo {
    state: DomainState;
    maxMem: number;
    memory: number;
    nrVirtCpu: number;
    cpuTime: number;
}

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

export interface DomainBlockInfo {
    capacity: number;
    allocation: number;
    physical: number;
}

export interface DomainInterfaceInfo {
    name: string;
    hwaddr: string;
    addrs: DomainInterfaceAddress[];
}

export interface DomainInterfaceAddress {
    type: number;
    addr: string;
    prefix: number;
}

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

export enum DomainRebootFlags {
    NONE = 0,
    ACPI = 1,
    GUEST_AGENT = 2,
    INIT = 4,
    SIGNAL = 8
}

export enum DomainInterfaceAddressesSource {
    LEASE = 0,
    AGENT = 1,
    ARP = 2
}

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

export enum DomainGetXMLDescFlags {
    SECURE = 1,
    INACTIVE = 2,
    UPDATE_CPU = 4,
    MIGRATABLE = 8
} 