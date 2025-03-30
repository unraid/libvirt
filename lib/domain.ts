import { Domain as NativeDomain, DomainInfo, DomainGetXMLDescFlags } from './types.js';
import { Hypervisor } from './hypervisor.js';

/**
 * Represents a libvirt domain (virtual machine).
 * This class provides methods to interact with and manage a virtual machine instance.
 */
export class Domain {
    private nativeDomain: NativeDomain;
    private hypervisor: Hypervisor;

    /**
     * Creates a new Domain instance.
     * @param nativeDomain - The native libvirt domain object
     * @param hypervisor - The hypervisor instance this domain belongs to
     */
    constructor(nativeDomain: NativeDomain, hypervisor: Hypervisor) {
        this.nativeDomain = nativeDomain;
        this.hypervisor = hypervisor;
    }

    /**
     * Saves the current state of the domain to a file.
     * This allows the domain to be restored later using the saved state.
     * @param filename - The path where the domain state should be saved
     * @throws {LibvirtError} If saving the domain state fails
     */
    async save(filename: string): Promise<void> {
        return this.hypervisor.domainSave(this, filename);
    }

    /**
     * Starts the domain.
     * This operation is only valid for defined but inactive domains.
     * @throws {LibvirtError} If starting the domain fails
     */
    async create(): Promise<void> {
        return this.hypervisor.domainCreate(this);
    }

    /**
     * Gracefully shuts down the domain.
     * This sends an ACPI shutdown signal to the domain's operating system.
     * @throws {LibvirtError} If shutting down the domain fails
     */
    async shutdown(): Promise<void> {
        return this.hypervisor.domainShutdown(this);
    }

    /**
     * Pauses the domain's execution
     * @throws {LibvirtError} If pausing the domain fails
     */
    async suspend(): Promise<void> {
        return this.hypervisor.domainSuspend(this);
    }

    /**
     * Resumes a paused domain.
     * This operation restarts execution of a domain that was previously paused.
     * @throws {LibvirtError} If resuming the domain fails
     */
    async resume(): Promise<void> {
        return this.hypervisor.domainResume(this);
    }

    /**
     * Forcefully terminates the domain.
     * This is equivalent to pulling the power plug on a physical machine.
     * @throws {LibvirtError} If destroying the domain fails
     */
    async destroy(): Promise<void> {
        return this.hypervisor.domainDestroy(this);
    }

    /**
     * Removes the domain's configuration from the hypervisor.
     * This operation is only valid for inactive domains.
     * @throws {LibvirtError} If undefining the domain fails
     */
    async undefine(): Promise<void> {
        return this.hypervisor.domainUndefine(this);
    }

    /**
     * Gets the XML description of the domain.
     * @param flags - Optional flags to modify the XML output
     * @returns The domain's XML configuration
     * @throws {LibvirtError} If getting the domain XML fails
     */
    async getXMLDesc(flags?: DomainGetXMLDescFlags): Promise<string> {
        return this.hypervisor.domainGetXMLDesc(this, flags);
    }

    /**
     * Gets information about the domain's current state and resource usage.
     * @returns Domain information including state, memory usage, CPU time, etc.
     * @throws {LibvirtError} If getting domain information fails
     */
    async getInfo(): Promise<DomainInfo> {
        return this.hypervisor.domainGetInfo(this);
    }

    /**
     * Gets the ID of the domain.
     * @returns The domain ID if the domain is running, null otherwise
     * @throws {LibvirtError} If getting the domain ID fails
     */
    async getID(): Promise<number | null> {
        return this.hypervisor.domainGetID(this);
    }

    /**
     * Gets the name of the domain.
     * @returns The domain name
     * @throws {LibvirtError} If getting the domain name fails
     */
    async getName(): Promise<string> {
        return this.hypervisor.domainGetName(this);
    }

    /**
     * Gets the UUID of the domain.
     * @returns The domain UUID as a string
     * @throws {LibvirtError} If getting the domain UUID fails
     */
    async getUUIDString(): Promise<string> {
        return this.hypervisor.domainGetUUIDString(this);
    }

    /**
     * Gets the native libvirt domain object.
     * This method is for internal use only.
     * @returns The native domain object
     */
    getNativeDomain(): NativeDomain {
        return this.nativeDomain;
    }
} 