import { describe, it, expect } from 'vitest';
import { LibvirtError } from '../lib/types';
import { wrapMethod } from '../lib/error';

describe('Error Handling Tests', () => {
    it('should handle various error types correctly', async () => {
        // Test error handling with string error
        const stringError = 'Test error';
        await expect(wrapMethod(async () => {
            throw stringError;
        })).rejects.toThrow(stringError);

        // Test error handling with non-Error object
        const nonError = { message: 'Test error' };
        await expect(wrapMethod(async () => {
            throw nonError;
        })).rejects.toThrow('[object Object]');

        // Test error handling with undefined error
        await expect(wrapMethod(async () => {
            throw undefined;
        })).rejects.toThrow('Unknown error');

        // Test error handling with Error instance without stack
        const errorWithoutStack = new LibvirtError('Test error', -1, -1, -1);
        delete errorWithoutStack.stack;
        await expect(wrapMethod(async () => {
            throw errorWithoutStack;
        })).rejects.toThrow('Test error');

        // Test error handling with LibvirtError with stack
        const libvirtErrorWithStack = new LibvirtError('Test error', 1, 2, 3);
        libvirtErrorWithStack.stack = 'Test stack trace';
        await expect(wrapMethod(async () => {
            throw libvirtErrorWithStack;
        })).rejects.toThrow(libvirtErrorWithStack);

        // Test error handling with LibvirtError without stack
        const libvirtErrorNoStack = new LibvirtError('Test error', 1, 2, 3);
        delete libvirtErrorNoStack.stack;
        await expect(wrapMethod(async () => {
            throw libvirtErrorNoStack;
        })).rejects.toThrow(libvirtErrorNoStack);

        // Test error handling with Error instance with stack
        const errorWithStack = new Error('Test error');
        await expect(wrapMethod(async () => {
            throw errorWithStack;
        })).rejects.toThrow('Test error');

        // Test error handling with Error instance with stack but no message
        const errorWithStackNoMessage = new Error();
        await expect(wrapMethod(async () => {
            throw errorWithStackNoMessage;
        })).rejects.toThrow('');

        // Test error handling with null
        await expect(wrapMethod(async () => {
            throw null;
        })).rejects.toThrow('Unknown error');

        // Test error handling with number
        await expect(wrapMethod(async () => {
            throw 42;
        })).rejects.toThrow('42');

        // Test error handling with Error instance with all properties
        const errorWithAllProps = new Error('Test error');
        Object.assign(errorWithAllProps, {
            code: 1,
            domain: 2,
            level: 3,
            str1: 'str1',
            str2: 'str2',
            str3: 'str3',
            stack: 'Test stack trace'
        });
        await expect(wrapMethod(async () => {
            throw errorWithAllProps;
        })).rejects.toThrow('Test error');

        // Test error handling with Error instance with some properties
        const errorWithSomeProps = new Error('Test error');
        Object.assign(errorWithSomeProps, {
            code: 1,
            domain: 2,
            str1: 'str1'
        });
        await expect(wrapMethod(async () => {
            throw errorWithSomeProps;
        })).rejects.toThrow('Test error');

        // Test error handling with Error instance with no properties but has stack
        const errorWithOnlyStack = new Error('Test error');
        Object.assign(errorWithOnlyStack, {
            stack: 'Test stack trace'
        });
        await expect(wrapMethod(async () => {
            throw errorWithOnlyStack;
        })).rejects.toThrow('Test error');

        // Test error handling with Error instance with all properties but no stack
        const errorWithAllPropsNoStack = new Error('Test error');
        Object.assign(errorWithAllPropsNoStack, {
            code: 1,
            domain: 2,
            level: 3,
            str1: 'str1',
            str2: 'str2',
            str3: 'str3'
        });
        delete errorWithAllPropsNoStack.stack;
        await expect(wrapMethod(async () => {
            throw errorWithAllPropsNoStack;
        })).rejects.toThrow('Test error');

        // Test error handling with Error instance with some properties but no stack
        const errorWithSomePropsNoStack = new Error('Test error');
        Object.assign(errorWithSomePropsNoStack, {
            code: 1,
            domain: 2,
            str1: 'str1'
        });
        delete errorWithSomePropsNoStack.stack;
        await expect(wrapMethod(async () => {
            throw errorWithSomePropsNoStack;
        })).rejects.toThrow('Test error');

        // Test error handling with Error instance with no properties and no stack
        const errorWithNothingNoStack = new Error('Test error');
        delete errorWithNothingNoStack.stack;
        await expect(wrapMethod(async () => {
            throw errorWithNothingNoStack;
        })).rejects.toThrow('Test error');

        // Test error handling with object that has toString() returning undefined
        const errorWithUndefinedToString = {
            toString: () => undefined
        };
        await expect(wrapMethod(async () => {
            throw errorWithUndefinedToString;
        })).rejects.toThrow('Unknown error');

        // Test error handling with object that has toString() returning null
        const errorWithNullToString = {
            toString: () => null
        };
        await expect(wrapMethod(async () => {
            throw errorWithNullToString;
        })).rejects.toThrow('Unknown error');

        // Test error handling with object that has toString() throwing error
        const errorWithThrowingToString = {
            toString: () => {
                throw new Error('toString error');
            }
        };
        await expect(wrapMethod(async () => {
            throw errorWithThrowingToString;
        })).rejects.toThrow('Unknown error');
    });
}); 