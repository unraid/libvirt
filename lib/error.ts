import { LibvirtError } from './types.js';

/**
 * Handles errors from the native libvirt module by converting them to LibvirtError instances.
 * @param error - The error to handle
 * @throws {LibvirtError} A standardized libvirt error
 */
export function handleError(error: any): never {
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
        // Preserve the original stack trace
        libvirtError.stack = error.stack;
        throw libvirtError;
    }

    // Handle string errors directly
    if (typeof error === 'string') {
        const libvirtError = new LibvirtError(error, -1, -1, -1);
        Error.captureStackTrace(libvirtError);
        throw libvirtError;
    }

    // Try to get a string representation of the error
    let errorMessage = 'Unknown error';
    if (error && typeof error.toString === 'function') {
        try {
            const result = error.toString();
            errorMessage = result || errorMessage;
        } catch {
            // Keep default message if toString throws
        }
    }

    const libvirtError = new LibvirtError(errorMessage, -1, -1, -1);
    Error.captureStackTrace(libvirtError);
    throw libvirtError;
}

/**
 * Wraps a method call with standardized error handling.
 * @param method - Method to call
 * @param args - Arguments to pass to the method
 * @returns Result of the method call
 * @throws {LibvirtError} If an error occurs
 */
export async function wrapMethod<T>(method: (...args: any[]) => Promise<T>, ...args: any[]): Promise<T> {
    try {
        return await method(...args);
    } catch (error) {
        handleError(error);
    }
} 