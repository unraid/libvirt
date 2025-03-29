import { Domain as NativeDomain, DomainInfo, DomainGetXMLDescFlags, ConnectListAllDomainsFlags, NodeInfo, LibvirtError } from './types.js';
import { Domain } from './domain.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * Represents a connection to a libvirt hypervisor.
 * This class provides methods to interact with libvirt domains (virtual machines)
 * and retrieve information about the hypervisor system.
 */
export class Hypervisor {
    private nativeHypervisor: any;

    /**
     * Creates a new Hypervisor instance.
     * @param options - Connection options
     * @param options.uri - The URI to connect to the hypervisor (e.g., 'qemu:///system')
     */
    constructor(options: { uri: string }) {
        // Use require for native module since it's not an ES module
        this.nativeHypervisor = new (require('../build/Release/libvirt').Hypervisor)(options);
    }

    /**
     * Handles errors from the native libvirt module by converting them to LibvirtError instances.
     * @param error - The error to handle
     * @throws {LibvirtError} A standardized libvirt error
     * @private
     */
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

    /**
     * Wraps a method call with standardized error handling.
     * @param method - Method to call
     * @param args - Arguments to pass to the method
     * @returns Result of the method call
     * @throws {LibvirtError} If an error occurs
     * @private
     */
    private async wrapMethod<T>(method: (...args: any[]) => Promise<T>, ...args: any[]): Promise<T> {
        try {
            return await method(...args);
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Opens a connection to the hypervisor.
     * @throws {LibvirtError} If the connection fails
     */
    async connectOpen(): Promise<void> {
        return this.wrapMethod(this.nativeHypervisor.connectOpen.bind(this.nativeHypervisor));
    }

    /**
     * Closes the connection to the hypervisor.
     * @throws {LibvirtError} If closing the connection fails
     */
    async connectClose(): Promise<void> {
        return this.wrapMethod(this.nativeHypervisor.connectClose.bind(this.nativeHypervisor));
    }

    /**
     * Lists all domains matching the specified flags.
     * If no flags are provided, lists all domains (both active and inactive).
     * @param flags - Optional flags to filter the list of domains
     * @returns Array of Domain objects
     * @throws {LibvirtError} If listing domains fails
     */
    async connectListAllDomains(flags?: ConnectListAllDomainsFlags): Promise<Domain[]> {
        const effectiveFlags = flags ?? (ConnectListAllDomainsFlags.ACTIVE | ConnectListAllDomainsFlags.INACTIVE);
        const nativeDomains = await this.wrapMethod<NativeDomain[]>(
            this.nativeHypervisor.connectListAllDomains.bind(this.nativeHypervisor),
            effectiveFlags
        );
        return nativeDomains.map((d: NativeDomain) => new Domain(d, this));
    }

    /**
     * Lists the IDs of all running domains.
     * @returns Array of domain IDs
     * @throws {LibvirtError} If listing domain IDs fails
     */
    async connectListDomains(): Promise<number[]> {
        return this.wrapMethod(this.nativeHypervisor.connectListDomains.bind(this.nativeHypervisor));
    }

    /**
     * Lists the names of all defined (but not running) domains.
     * @returns Array of domain names
     * @throws {LibvirtError} If listing defined domains fails
     */
    async connectListDefinedDomains(): Promise<string[]> {
        return this.wrapMethod(this.nativeHypervisor.connectListDefinedDomains.bind(this.nativeHypervisor));
    }

    /**
     * Creates and starts a new domain from XML configuration.
     * @param xml - XML configuration for the domain
     * @returns The created Domain object
     * @throws {LibvirtError} If domain creation fails
     */
    async domainCreateXML(xml: string): Promise<Domain> {
        const nativeDomain = await this.wrapMethod(
            this.nativeHypervisor.domainCreateXML.bind(this.nativeHypervisor),
            xml
        );
        return new Domain(nativeDomain, this);
    }

    /**
     * Defines a new domain from XML configuration without starting it.
     * @param xml - XML configuration for the domain
     * @returns The defined Domain object
     * @throws {LibvirtError} If domain definition fails
     */
    async domainDefineXML(xml: string): Promise<Domain> {
        const nativeDomain = await this.wrapMethod(
            this.nativeHypervisor.domainDefineXML.bind(this.nativeHypervisor),
            xml
        );
        return new Domain(nativeDomain, this);
    }

    /**
     * Looks up a domain by its ID.
     * @param id - The domain ID to look up
     * @returns The found Domain object
     * @throws {LibvirtError} If the domain is not found or lookup fails
     */
    async domainLookupByID(id: number): Promise<Domain> {
        const nativeDomain = await this.wrapMethod(
            this.nativeHypervisor.domainLookupByID.bind(this.nativeHypervisor),
            id
        );
        return new Domain(nativeDomain, this);
    }

    /**
     * Looks up a domain by its name.
     * @param name - The domain name to look up
     * @returns The found Domain object
     * @throws {LibvirtError} If the domain is not found or lookup fails
     */
    async domainLookupByName(name: string): Promise<Domain> {
        const nativeDomain = await this.wrapMethod(
            this.nativeHypervisor.domainLookupByName.bind(this.nativeHypervisor),
            name
        );
        return new Domain(nativeDomain, this);
    }

    /**
     * Looks up a domain by its UUID.
     * @param uuid - The domain UUID to look up
     * @returns The found Domain object
     * @throws {LibvirtError} If the domain is not found or lookup fails
     */
    async domainLookupByUUIDString(uuid: string): Promise<Domain> {
        const nativeDomain = await this.wrapMethod(
            this.nativeHypervisor.domainLookupByUUIDString.bind(this.nativeHypervisor),
            uuid
        );
        return new Domain(nativeDomain, this);
    }

    /**
     * Saves the state of a domain to a file.
     * @param domain - The domain to save
     * @param filename - The file to save the domain state to
     * @throws {LibvirtError} If saving the domain state fails
     */
    async domainSave(domain: Domain, filename: string): Promise<void> {
        return this.wrapMethod(
            this.nativeHypervisor.domainSave.bind(this.nativeHypervisor),
            domain.getNativeDomain(),
            filename
        );
    }

    /**
     * Starts a defined domain.
     * @param domain - The domain to start
     * @throws {LibvirtError} If starting the domain fails
     */
    async domainCreate(domain: Domain): Promise<void> {
        return this.wrapMethod(
            this.nativeHypervisor.domainCreate.bind(this.nativeHypervisor),
            domain.getNativeDomain()
        );
    }

    /**
     * Gracefully shuts down a domain.
     * @param domain - The domain to shut down
     * @throws {LibvirtError} If shutting down the domain fails
     */
    async domainShutdown(domain: Domain): Promise<void> {
        return this.wrapMethod(
            this.nativeHypervisor.domainShutdown.bind(this.nativeHypervisor),
            domain.getNativeDomain()
        );
    }

    /**
     * Forcefully terminates a domain.
     * @param domain - The domain to destroy
     * @throws {LibvirtError} If destroying the domain fails
     */
    async domainDestroy(domain: Domain): Promise<void> {
        return this.wrapMethod(
            this.nativeHypervisor.domainDestroy.bind(this.nativeHypervisor),
            domain.getNativeDomain()
        );
    }

    /**
     * Removes a domain's configuration from the hypervisor.
     * @param domain - The domain to undefine
     * @throws {LibvirtError} If undefining the domain fails
     */
    async domainUndefine(domain: Domain): Promise<void> {
        return this.wrapMethod(
            this.nativeHypervisor.domainUndefine.bind(this.nativeHypervisor),
            domain.getNativeDomain()
        );
    }

    /**
     * Retrieves information about a domain.
     * @param domain - The domain to get information about
     * @returns Domain information including state, memory usage, etc.
     * @throws {LibvirtError} If retrieving domain information fails
     */
    async domainGetInfo(domain: Domain): Promise<DomainInfo> {
        return this.wrapMethod(
            this.nativeHypervisor.domainGetInfo.bind(this.nativeHypervisor),
            domain.getNativeDomain()
        );
    }

    /**
     * Gets the ID of a running domain.
     * @param domain - The domain to get the ID for
     * @returns The domain ID or null if the domain is not running
     * @throws {LibvirtError} If getting the domain ID fails
     */
    async domainGetID(domain: Domain): Promise<number | null> {
        return this.wrapMethod(
            this.nativeHypervisor.domainGetID.bind(this.nativeHypervisor),
            domain.getNativeDomain()
        );
    }

    /**
     * Gets the name of a domain.
     * @param domain - The domain to get the name for
     * @returns The domain name
     * @throws {LibvirtError} If getting the domain name fails
     */
    async domainGetName(domain: Domain): Promise<string> {
        return this.wrapMethod(
            this.nativeHypervisor.domainGetName.bind(this.nativeHypervisor),
            domain.getNativeDomain()
        );
    }

    /**
     * Gets the UUID of a domain.
     * @param domain - The domain to get the UUID for
     * @returns The domain UUID as a string
     * @throws {LibvirtError} If getting the domain UUID fails
     */
    async domainGetUUIDString(domain: Domain): Promise<string> {
        return this.wrapMethod(
            this.nativeHypervisor.domainGetUUIDString.bind(this.nativeHypervisor),
            domain.getNativeDomain()
        );
    }

    /**
     * Gets the XML description of a domain.
     * @param domain - The domain to get the XML for
     * @param flags - Optional flags to modify the XML output
     * @returns The domain's XML configuration
     * @throws {LibvirtError} If getting the domain XML fails
     */
    async domainGetXMLDesc(domain: Domain, flags?: DomainGetXMLDescFlags): Promise<string> {
        return this.wrapMethod(
            this.nativeHypervisor.domainGetXMLDesc.bind(this.nativeHypervisor),
            domain.getNativeDomain(),
            flags
        );
    }

    /**
     * Gets the maximum number of virtual CPUs supported for a given hypervisor type.
     * @param type - Optional hypervisor type to check
     * @returns The maximum number of virtual CPUs
     * @throws {LibvirtError} If getting the maximum vCPUs fails
     */
    async connectGetMaxVcpus(type?: string): Promise<number> {
        return this.wrapMethod(
            this.nativeHypervisor.connectGetMaxVcpus.bind(this.nativeHypervisor),
            type
        );
    }

    /**
     * Gets the hostname of the hypervisor.
     * @returns The hypervisor's hostname
     * @throws {LibvirtError} If getting the hostname fails
     */
    async connectGetHostname(): Promise<string> {
        return this.wrapMethod(this.nativeHypervisor.connectGetHostname.bind(this.nativeHypervisor));
    }

    /**
     * Gets information about the physical node (host machine).
     * @returns Node information including memory, CPUs, etc.
     * @throws {LibvirtError} If getting node information fails
     */
    async nodeGetInfo(): Promise<NodeInfo> {
        return this.wrapMethod(this.nativeHypervisor.nodeGetInfo.bind(this.nativeHypervisor));
    }
} 