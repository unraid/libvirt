import { describe, it, expect } from 'vitest';
import { DomainBuilder } from './domain-builder.js';
import { DomainDesc, DomainDiskDesc, DomainInterfaceDesc, DomainGraphicsDesc } from './domain-desc.js';

describe('DomainBuilder', () => {
    it('should create an empty domain description', () => {
        const builder = new DomainBuilder();
        const desc = builder.build();
        expect(desc).toEqual({});
    });

    it('should set name and UUID', () => {
        const builder = new DomainBuilder();
        const desc = builder
            .setName('test-vm')
            .setUUID('123e4567-e89b-12d3-a456-426614174000')
            .build();
        expect(desc.name).toBe('test-vm');
        expect(desc.uuid).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should add and remove disks', () => {
        const builder = new DomainBuilder();
        const diskDesc: DomainDiskDesc = {
            type: 'file',
            device: 'disk',
            source: { file: '/tmp/test.img' },
            target: { dev: 'vda', bus: 'virtio' }
        };

        const desc = builder
            .addDisk(diskDesc)
            .build();
        expect(desc.devices).toHaveLength(1);
        const diskDevice = desc.devices![0];
        expect(diskDevice.type).toBe('disk');
        if (diskDevice.type === 'disk') {
            expect(diskDevice.disk).toEqual(diskDesc);
        }

        const descAfterRemove = builder
            .removeDisks()
            .build();
        expect(descAfterRemove.devices).toHaveLength(0);
    });

    it('should add and remove interfaces', () => {
        const builder = new DomainBuilder();
        const interfaceDesc: DomainInterfaceDesc = {
            type: 'network',
            source: { network: 'default' },
            model: { type: 'virtio' }
        };

        const desc = builder
            .addInterface(interfaceDesc)
            .build();
        expect(desc.devices).toHaveLength(1);
        const interfaceDevice = desc.devices![0];
        expect(interfaceDevice.type).toBe('interface');
        if (interfaceDevice.type === 'interface') {
            expect(interfaceDevice.interface).toEqual(interfaceDesc);
        }

        const descAfterRemove = builder
            .removeInterfaces()
            .build();
        expect(descAfterRemove.devices).toHaveLength(0);
    });

    it('should add and remove graphics', () => {
        const builder = new DomainBuilder();
        const graphicsDesc: DomainGraphicsDesc = {
            type: 'vnc',
            port: 5900,
            listen: '0.0.0.0'
        };

        const desc = builder
            .addGraphics(graphicsDesc)
            .build();
        expect(desc.devices).toHaveLength(1);
        const graphicsDevice = desc.devices![0];
        expect(graphicsDevice.type).toBe('graphics');
        if (graphicsDevice.type === 'graphics') {
            expect(graphicsDevice.graphics).toEqual(graphicsDesc);
        }

        const descAfterRemove = builder
            .removeGraphics()
            .build();
        expect(descAfterRemove.devices).toHaveLength(0);
    });

    it('should use template description', () => {
        const template: DomainDesc = {
            name: 'template-vm',
            memory: { unit: 'KiB', value: 1024 * 1024 },
            vcpu: { placement: 'static', value: 1 }
        };

        const builder = new DomainBuilder();
        const desc = builder
            .fromTemplate(template)
            .build();
        expect(desc).toEqual(template);
    });

    it('should chain multiple operations', () => {
        const builder = new DomainBuilder();
        const diskDesc: DomainDiskDesc = {
            type: 'file',
            device: 'disk',
            source: { file: '/tmp/test.img' },
            target: { dev: 'vda', bus: 'virtio' }
        };

        const desc = builder
            .setName('test-vm')
            .addDisk(diskDesc)
            .removeDisks()
            .build();
        expect(desc.name).toBe('test-vm');
        expect(desc.devices).toHaveLength(0);
    });
}); 