import { describe, it, expect } from 'vitest';
import { LibvirtError } from './types';

describe('LibvirtError', () => {
    it('should handle numeric type errors', () => {
        const error = new LibvirtError('Expected a number.', -1, -1, -1, 'string');
        expect(error.message).toContain('Expected a number but received string');
        expect(error.message).toContain('This error typically occurs when calling libvirt methods that require numeric parameters');
    });

    it('should handle numeric type errors with undefined details', () => {
        const error = new LibvirtError('Expected a number.', -1, -1, -1);
        expect(error.message).toContain('Expected a number but received undefined');
    });

    it('should format error message correctly', () => {
        const error = new LibvirtError('Test error', 1, 2, 3, 'str1', 'str2', 'str3');
        expect(error.toString()).toBe('LibvirtError: Test error (code: 1, domain: 2, level: 3)');
    });

    it('should handle undefined values in toString', () => {
        const error = new LibvirtError('Test error', -1, -1, -1);
        expect(error.toString()).toBe('LibvirtError: Test error (code: -1, domain: -1, level: -1)');
    });
}); 
