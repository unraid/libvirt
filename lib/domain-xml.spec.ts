/* eslint-disable @typescript-eslint/no-unsafe-argument */
/**
 * Copyright 2019 Leon Rinkel <leon@rinkel.me> and vmngr/libvirt contributers.
 *
 * This file is part of the vmngr/libvirt project and is subject to the MIT
 * license as in the LICENSE file in the project root.
 *
 * @brief Tests for domain-xml.ts.
 */

import { expect } from 'chai';
import xml2js from 'xml2js';
import { describe, it } from 'vitest';

import {
	DomainOsDesc,
	DomainDiskDesc,
	DomainInterfaceDesc,
	DomainGraphicsDesc,
	DomainDesc
} from './domain-desc';
import {
	domainOsXml,
	domainDiskXml,
	domainInterfaceXml,
	domainGraphicsXml,
	domainDescToXml,
	domainDescFromXml
} from './domain-xml';

describe('DomainOs', () => {
	describe('serialize', () => {
		it('should work', () => {
			const os = domainOsXml.serialize({
				type: { arch: 'x86_64', machine: 'q35', value: 'hvm' },
				boot: { dev: 'hd' }
			});

			const builder = new xml2js.Builder({ headless: true });
			const actualXml = builder.buildObject({ os });

			const expectedXml =
`<os>
  <type arch="x86_64" machine="q35">hvm</type>
  <boot dev="hd"/>
</os>`;

			expect(actualXml).to.equal(expectedXml);
		});

		it('should handle missing type value', () => {
			const os = domainOsXml.serialize({
				type: {
					arch: 'x86_64',
					machine: 'pc-q35-7.2'
				}
			});

			const builder = new xml2js.Builder({ headless: true });
			const actualXml = builder.buildObject({ os });

			const expectedXml =
`<os>
  <type arch="x86_64" machine="pc-q35-7.2"/>
</os>`;

			expect(actualXml).to.equal(expectedXml);
		});

		it('should handle missing boot dev', () => {
			const os = domainOsXml.serialize({
				boot: {}
			});

			const builder = new xml2js.Builder({ headless: true });
			const actualXml = builder.buildObject({ os });

			const expectedXml =
`<os>
  <boot/>
</os>`;

			expect(actualXml).to.equal(expectedXml);
		});

		it('should handle missing loader fields', () => {
			const os = domainOsXml.serialize({
				loader: {}
			});

			const builder = new xml2js.Builder({ headless: true });
			const actualXml = builder.buildObject({ os });

			const expectedXml =
`<os>
  <loader/>
</os>`;

			expect(actualXml).to.equal(expectedXml);
		});

		it('should handle array of loaders with missing fields', () => {
			const os = domainOsXml.serialize({
				loader: [{}, {
					readonly: 'yes'
				}, {
					type: 'rom'
				}, {
					value: '/path/to/loader'
				}]
			});

			const builder = new xml2js.Builder({ headless: true });
			const actualXml = builder.buildObject({ os });

			const expectedXml =
`<os>
  <loader/>
  <loader readonly="yes"/>
  <loader type="rom"/>
  <loader>/path/to/loader</loader>
</os>`;

			expect(actualXml).to.equal(expectedXml);
		});
	});

	describe('deserialize', () => {
		it('should work', async () => {
			const parsed = await xml2js.parseStringPromise(
				`<os>
  <type arch="x86_64" machine="q35">hvm</type>
  <boot dev="hd"/>
</os>`) as Record<string, any>;
			const actualOsDesc = domainOsXml.deserialize(parsed.os);

			const expectedOsDesc: DomainOsDesc = {
				type: { arch: 'x86_64', machine: 'q35', value: 'hvm' },
				boot: { dev: 'hd' }
			};

			expect(actualOsDesc).to.deep.equal(expectedOsDesc);
		});
	});

	it('should handle all OS fields in XML serialization', () => {
		const osDesc: DomainOsDesc = {
			type: {
				arch: 'x86_64',
				machine: 'pc',
				value: 'hvm'
			},
			boot: {
				dev: 'hd'
			},
			loader: {
				readonly: 'yes',
				type: 'pflash',
				value: '/path/to/loader'
			}
		};
		const xml = domainOsXml.serialize(osDesc);
		expect(xml).to.deep.equal({
			$: {},
			type: {
				$: {
					arch: 'x86_64',
					machine: 'pc'
				},
				_: 'hvm'
			},
			boot: {
				$: {
					dev: 'hd'
				}
			},
			loader: [{
				$: {
					readonly: 'yes',
					type: 'pflash'
				},
				_: '/path/to/loader'
			}]
		});
	});

	it('should handle minimal OS fields in XML serialization', () => {
		const osDesc: DomainOsDesc = {
			type: {
				value: 'hvm'
			}
		};
		const xml = domainOsXml.serialize(osDesc);
		expect(xml).to.deep.equal({
			$: {},
			type: {
				$: {},
				_: 'hvm'
			}
		});
	});

	it('should handle all OS fields in XML deserialization', () => {
		const xml = {
			type: [{
				$: {
					arch: 'x86_64',
					machine: 'pc'
				},
				_: 'hvm'
			}],
			boot: [{
				$: {
					dev: 'hd'
				}
			}],
			loader: [{
				$: {
					readonly: 'yes',
					type: 'pflash'
				},
				_: '/path/to/loader'
			}]
		};
		const osDesc = domainOsXml.deserialize(xml);
		expect(osDesc).to.deep.equal({
			type: {
				arch: 'x86_64',
				machine: 'pc',
				value: 'hvm'
			},
			boot: {
				dev: 'hd'
			},
			loader: {
				readonly: 'yes',
				type: 'pflash',
				value: '/path/to/loader'
			}
		});
	});

	it('should handle minimal OS fields in XML deserialization', () => {
		const xml = {
			type: [{
				$: {},
				_: 'hvm'
			}]
		};
		const osDesc = domainOsXml.deserialize(xml);
		expect(osDesc).to.deep.equal({
			type: {
				value: 'hvm'
			}
		});
	});

	it('should handle missing optional fields in OS XML serialization', () => {
		const osDesc: DomainOsDesc = {
			type: {
				value: 'hvm'
			}
		};
		const xml = domainOsXml.serialize(osDesc);
		expect(xml).to.deep.equal({
			$: {},
			type: {
				$: {},
				_: 'hvm'
			}
		});
	});

	it('should handle missing optional fields in OS XML deserialization', () => {
		const xml = {
			type: [{
				$: {},
				_: 'hvm'
			}]
		};
		const osDesc = domainOsXml.deserialize(xml);
		expect(osDesc).to.deep.equal({
			type: {
				value: 'hvm'
			}
		});
	});

	it('should handle empty loader array in OS XML serialization', () => {
		const osDesc: DomainOsDesc = {
			type: {
				value: 'hvm'
			},
			loader: []
		};
		const xml = domainOsXml.serialize(osDesc);
		expect(xml).to.deep.equal({
			$: {},
			type: {
				$: {},
				_: 'hvm'
			},
			loader: []
		});
	});

	it('should handle empty loader array in OS XML deserialization', () => {
		const xml = {
			type: [{
				$: {},
				_: 'hvm'
			}],
			loader: []
		};
		const osDesc = domainOsXml.deserialize(xml);
		expect(osDesc).to.deep.equal({
			type: {
				value: 'hvm'
			}
		});
	});

	it('should handle loader with minimal fields in OS XML deserialization', () => {
		const xml = {
			type: [{
				$: {},
				_: 'hvm'
			}],
			loader: [{
				$: {},
				_: '/path/to/loader'
			}]
		};
		const osDesc = domainOsXml.deserialize(xml);
		expect(osDesc).to.deep.equal({
			type: {
				value: 'hvm'
			},
			loader: {
				value: '/path/to/loader'
			}
		});
	});
});

describe('DomainDisk', () => {
	describe('serialize', () => {
		it('should work', () => {
			const disk = domainDiskXml.serialize({
				type: 'file', device: 'disk',
				driver: { name: 'qemu', type: 'qcow2' },
				source: { file: '/home/leon/test1.img' },
				target: { dev: 'vda', bus: 'virtio' }
			});

			const builder = new xml2js.Builder({ headless: true });
			const actualXml = builder.buildObject({ disk });

			const expectedXml =
`<disk type="file" device="disk">
  <driver name="qemu" type="qcow2"/>
  <source file="/home/leon/test1.img"/>
  <target dev="vda" bus="virtio"/>
</disk>`;

			expect(actualXml).to.equal(expectedXml);
		});

		it('should handle missing type and device fields', () => {
			const disk = domainDiskXml.serialize({
				driver: {
					name: 'qemu',
					type: 'qcow2'
				},
				source: {
					file: '/path/to/disk.qcow2'
				},
				target: {
					dev: 'vda',
					bus: 'virtio'
				}
			});

			const builder = new xml2js.Builder({ headless: true });
			const actualXml = builder.buildObject({ disk });

			const expectedXml =
`<disk>
  <driver name="qemu" type="qcow2"/>
  <source file="/path/to/disk.qcow2"/>
  <target dev="vda" bus="virtio"/>
</disk>`;

			expect(actualXml).to.equal(expectedXml);
		});
	});

	describe('deserialize', () => {
		it('should work', async () => {
			const parsed = await xml2js.parseStringPromise(
				`<disk type="file" device="disk">
  <driver name="qemu" type="qcow2"/>
  <source file="/home/leon/test1.img"/>
  <target dev="vda" bus="virtio"/>
</disk>`) as Record<string, any>;
			const actualDiskDesc = domainDiskXml.deserialize(parsed.disk);

			const expectedDiskDesc: DomainDiskDesc = {
				type: 'file', device: 'disk',
				driver: { name: 'qemu', type: 'qcow2' },
				source: { file: '/home/leon/test1.img' },
				target: { dev: 'vda', bus: 'virtio' }
			};

			expect(actualDiskDesc).to.deep.equal(expectedDiskDesc);
		});
	});

	describe('Optional field handling', () => {
		it('should handle missing optional fields in disk XML serialization', () => {
			const diskDesc: DomainDiskDesc = {
				type: 'file'
			};
			const xml = domainDiskXml.serialize(diskDesc);
			expect(xml).to.deep.equal({
				$: {
					type: 'file'
				}
			});
		});

		it('should handle missing optional fields in disk XML deserialization', () => {
			const xml = {
				$: {
					type: 'file'
				}
			};
			const diskDesc = domainDiskXml.deserialize(xml);
			expect(diskDesc).to.deep.equal({
				type: 'file'
			});
		});

		it('should handle all optional fields in disk XML serialization', () => {
			const diskDesc: DomainDiskDesc = {
				type: 'file',
				device: 'disk',
				driver: {
					name: 'qemu',
					type: 'qcow2'
				},
				source: {
					file: '/path/to/disk.img'
				},
				target: {
					dev: 'vda',
					bus: 'virtio'
				}
			};
			const xml = domainDiskXml.serialize(diskDesc);
			expect(xml).to.deep.equal({
				$: {
					type: 'file',
					device: 'disk'
				},
				driver: {
					$: {
						name: 'qemu',
						type: 'qcow2'
					}
				},
				source: {
					$: {
						file: '/path/to/disk.img'
					}
				},
				target: {
					$: {
						dev: 'vda',
						bus: 'virtio'
					}
				}
			});
		});

		it('should handle all optional fields in disk XML deserialization', () => {
			const xml = {
				$: {
					type: 'file',
					device: 'disk'
				},
				driver: [{
					$: {
						name: 'qemu',
						type: 'qcow2'
					}
				}],
				source: [{
					$: {
						file: '/path/to/disk.img'
					}
				}],
				target: [{
					$: {
						dev: 'vda',
						bus: 'virtio'
					}
				}]
			};
			const diskDesc = domainDiskXml.deserialize(xml);
			expect(diskDesc).to.deep.equal({
				type: 'file',
				device: 'disk',
				driver: {
					name: 'qemu',
					type: 'qcow2'
				},
				source: {
					file: '/path/to/disk.img'
				},
				target: {
					dev: 'vda',
					bus: 'virtio'
				}
			});
		});

		it('should handle partial disk XML serialization', () => {
			const diskDesc: DomainDiskDesc = {
				type: 'file',
				driver: {
					name: 'qemu'
				},
				source: {
					file: '/path/to/disk.img'
				},
				target: {
					dev: 'vda'
				}
			};
			const xml = domainDiskXml.serialize(diskDesc);
			expect(xml).to.deep.equal({
				$: {
					type: 'file'
				},
				driver: {
					$: {
						name: 'qemu'
					}
				},
				source: {
					$: {
						file: '/path/to/disk.img'
					}
				},
				target: {
					$: {
						dev: 'vda'
					}
				}
			});
		});

		it('should handle partial disk XML deserialization', () => {
			const xml = {
				$: {
					type: 'file'
				},
				driver: [{
					$: {
						name: 'qemu'
					}
				}],
				source: [{
					$: {
						file: '/path/to/disk.img'
					}
				}],
				target: [{
					$: {
						dev: 'vda'
					}
				}]
			};
			const diskDesc = domainDiskXml.deserialize(xml);
			expect(diskDesc).to.deep.equal({
				type: 'file',
				driver: {
					name: 'qemu'
				},
				source: {
					file: '/path/to/disk.img'
				},
				target: {
					dev: 'vda'
				}
			});
		});
	});

	it('should handle disk XML serialization with empty objects', () => {
		const diskDesc: DomainDiskDesc = {
			type: 'file',
			driver: {},
			source: {},
			target: {}
		};
		const xml = domainDiskXml.serialize(diskDesc);
		expect(xml).to.deep.equal({
			$: {
				type: 'file'
			},
			driver: {
				$: {}
			},
			source: {
				$: {}
			},
			target: {
				$: {}
			}
		});
	});

	it('should handle disk XML deserialization with empty objects', () => {
		const xml = {
			$: {
				type: 'file'
			},
			driver: [{
				$: {}
			}],
			source: [{
				$: {}
			}],
			target: [{
				$: {}
			}]
		};
		const diskDesc = domainDiskXml.deserialize(xml);
		expect(diskDesc).to.deep.equal({
			type: 'file',
			driver: {},
			source: {},
			target: {}
		});
	});
});

describe('DomainInterface', () => {
	describe('serialize', () => {
		it('should work', () => {
			const iface = domainInterfaceXml.serialize({
				type: 'network',
				source: { network: 'default' },
				mac: { address: '52:54:00:8e:c6:5f' },
				model: { type: 'virtio' }
			});

			const builder = new xml2js.Builder({ headless: true });
			const actualXml = builder.buildObject({ interface: iface });

			const expectedXml =
`<interface type="network">
  <source network="default"/>
  <mac address="52:54:00:8e:c6:5f"/>
  <model type="virtio"/>
</interface>`;

			expect(actualXml).to.equal(expectedXml);
		});

		it('should handle missing type field', () => {
			const iface = domainInterfaceXml.serialize({
				source: {
					network: 'default'
				},
				mac: {
					address: '52:54:00:12:34:56'
				},
				model: {
					type: 'virtio'
				}
			});

			const builder = new xml2js.Builder({ headless: true });
			const actualXml = builder.buildObject({ interface: iface });

			const expectedXml =
`<interface>
  <source network="default"/>
  <mac address="52:54:00:12:34:56"/>
  <model type="virtio"/>
</interface>`;

			expect(actualXml).to.equal(expectedXml);
		});
	});

	describe('deserialize', () => {
		it('should work', async () => {
			const parsed = await xml2js.parseStringPromise(
				`<interface type="network">
<source network="default"/>
<mac address="52:54:00:8e:c6:5f"/>
<model type="virtio"/>
</interface>`) as Record<string, any>;
			const actualInterfaceDesc = domainInterfaceXml
				.deserialize(parsed.interface);

			const expectedInterfaceDesc: DomainInterfaceDesc = {
				type: 'network',
				source: { network: 'default' },
				mac: { address: '52:54:00:8e:c6:5f' },
				model: { type: 'virtio' }
			};

			expect(actualInterfaceDesc).to.deep.equal(expectedInterfaceDesc);
		});
	});

	describe('Optional field handling', () => {
		it('should handle missing optional fields in interface XML serialization', () => {
			const interfaceDesc: DomainInterfaceDesc = {
				type: 'network'
			};
			const xml = domainInterfaceXml.serialize(interfaceDesc);
			expect(xml).to.deep.equal({
				$: {
					type: 'network'
				}
			});
		});

		it('should handle missing optional fields in interface XML deserialization', () => {
			const xml = {
				$: {
					type: 'network'
				}
			};
			const interfaceDesc = domainInterfaceXml.deserialize(xml);
			expect(interfaceDesc).to.deep.equal({
				type: 'network'
			});
		});

		it('should handle all optional fields in interface XML serialization', () => {
			const interfaceDesc: DomainInterfaceDesc = {
				type: 'network',
				source: {
					network: 'default'
				},
				mac: {
					address: '52:54:00:12:34:56'
				},
				model: {
					type: 'virtio'
				}
			};
			const xml = domainInterfaceXml.serialize(interfaceDesc);
			expect(xml).to.deep.equal({
				$: {
					type: 'network'
				},
				source: {
					$: {
						network: 'default'
					}
				},
				mac: {
					$: {
						address: '52:54:00:12:34:56'
					}
				},
				model: {
					$: {
						type: 'virtio'
					}
				}
			});
		});

		it('should handle all optional fields in interface XML deserialization', () => {
			const xml = {
				$: {
					type: 'network'
				},
				source: [{
					$: {
						network: 'default'
					}
				}],
				mac: [{
					$: {
						address: '52:54:00:12:34:56'
					}
				}],
				model: [{
					$: {
						type: 'virtio'
					}
				}]
			};
			const interfaceDesc = domainInterfaceXml.deserialize(xml);
			expect(interfaceDesc).to.deep.equal({
				type: 'network',
				source: {
					network: 'default'
				},
				mac: {
					address: '52:54:00:12:34:56'
				},
				model: {
					type: 'virtio'
				}
			});
		});

		it('should handle partial interface XML serialization', () => {
			const interfaceDesc: DomainInterfaceDesc = {
				type: 'network',
				source: {},
				mac: {},
				model: {}
			};
			const xml = domainInterfaceXml.serialize(interfaceDesc);
			expect(xml).to.deep.equal({
				$: {
					type: 'network'
				},
				source: {
					$: {}
				},
				mac: {
					$: {}
				},
				model: {
					$: {}
				}
			});
		});

		it('should handle partial interface XML deserialization', () => {
			const xml = {
				$: {
					type: 'network'
				},
				source: [{
					$: {}
				}],
				mac: [{
					$: {}
				}],
				model: [{
					$: {}
				}]
			};
			const interfaceDesc = domainInterfaceXml.deserialize(xml);
			expect(interfaceDesc).to.deep.equal({
				type: 'network',
				source: {},
				mac: {},
				model: {}
			});
		});
	});
});

describe('DomainGraphics', () => {
	describe('serialize', () => {
		it('should work', () => {
			const graphics = domainGraphicsXml.serialize({
				type: 'vnc',
				port: -1,
				listen: '0.0.0.0',
				passwd: 'test1'
			});

			const builder = new xml2js.Builder({ headless: true });
			const actualXml = builder.buildObject({ graphics });

			const expectedXml =
'<graphics type="vnc" port="-1" listen="0.0.0.0" passwd="test1"/>';

			expect(actualXml).to.equal(expectedXml);
		});
	});

	describe('deserialize', () => {
		it('should work', async () => {
			const parsed = await xml2js.parseStringPromise('<graphics type="vnc" port="-1" listen="0.0.0.0" passwd="test1"/>') as Record<string, any>;
			const actualGraphicsDesc = domainGraphicsXml
				.deserialize(parsed.graphics);

			const expectedGraphicsDesc: DomainGraphicsDesc = {
				type: 'vnc',
				port: -1,
				listen: '0.0.0.0',
				passwd: 'test1'
			};

			expect(actualGraphicsDesc).to.deep.equal(expectedGraphicsDesc);
		});
	});

	describe('Optional field handling', () => {
		it('should handle missing optional fields in graphics XML serialization', () => {
			const graphicsDesc: DomainGraphicsDesc = {
				type: 'vnc'
			};
			const xml = domainGraphicsXml.serialize(graphicsDesc);
			expect(xml).to.deep.equal({
				$: {
					type: 'vnc'
				}
			});
		});

		it('should handle missing optional fields in graphics XML deserialization', () => {
			const xml = {
				$: {
					type: 'vnc' as const
				}
			};
			const graphicsDesc = domainGraphicsXml.deserialize(xml);
			expect(graphicsDesc).to.deep.equal({
				type: 'vnc'
			});
		});

		it('should handle all optional fields in graphics XML serialization', () => {
			const graphicsDesc: DomainGraphicsDesc = {
				type: 'vnc',
				port: 5900,
				listen: '0.0.0.0',
				passwd: 'secret'
			};
			const xml = domainGraphicsXml.serialize(graphicsDesc);
			expect(xml).to.deep.equal({
				$: {
					type: 'vnc',
					port: 5900,
					listen: '0.0.0.0',
					passwd: 'secret'
				}
			});
		});

		it('should handle all optional fields in graphics XML deserialization', () => {
			const xml = {
				$: {
					type: 'vnc' as const,
					port: 5900,
					listen: '0.0.0.0',
					passwd: 'secret'
				}
			};
			const graphicsDesc = domainGraphicsXml.deserialize(xml);
			expect(graphicsDesc).to.deep.equal({
				type: 'vnc',
				port: 5900,
				listen: '0.0.0.0',
				passwd: 'secret'
			});
		});

		it('should handle empty graphics XML serialization', () => {
			const graphicsDesc: DomainGraphicsDesc = {};
			const xml = domainGraphicsXml.serialize(graphicsDesc);
			expect(xml).to.deep.equal({
				$: {}
			});
		});

		it('should handle empty graphics XML deserialization', () => {
			const xml = {
				$: {}
			};
			const graphicsDesc = domainGraphicsXml.deserialize(xml);
			expect(graphicsDesc).to.deep.equal({});
		});
	});
});

describe('domainDescToXml', () => {
	it('should work', () => {
		const domain: DomainDesc = {

			type: 'kvm',

			name: 'test1',
			uuid: '148d0864-2354-4c27-b82c-731bdd3f320c',

			memory: { value: 1048576 },
			currentMemory: { value: 1048576 },

			vcpu: { value: 1 },

			os: {
				type: { arch: 'x86_64', machine: 'q35', value: 'hvm' },
				boot: { dev: 'hd' }
			},

			devices: [

				{
					type: 'emulator',
					emulator: { value: '/usr/bin/qemu-system-x86_64' }
				},

				{
					type: 'disk',
					disk: {
						type: 'file', device: 'disk',
						driver: { name: 'qemu', type: 'qcow2' },
						source: { file: '/home/leon/test1.img' },
						target: { dev: 'vda', bus: 'virtio' }
					}
				},

				{
					type: 'interface',
					interface: {
						type: 'network',
						source: { network: 'default' },
						mac: { address: '52:54:00:8e:c6:5f' },
						model: { type: 'virtio' }
					}
				},

				{
					type: 'console',
					console: { type: 'pty' }
				},

				{
					type: 'graphics',
					graphics: {
						type: 'vnc',
						port: -1,
						listen: '0.0.0.0',
						passwd: 'test1'
					}
				}

			]

		};

		const actualXml = domainDescToXml(domain);

		const expectedXml =
`<domain type="kvm">
  <name>test1</name>
  <uuid>148d0864-2354-4c27-b82c-731bdd3f320c</uuid>
  <memory>1048576</memory>
  <currentMemory>1048576</currentMemory>
  <vcpu>1</vcpu>
  <os>
    <type arch="x86_64" machine="q35">hvm</type>
    <boot dev="hd"/>
  </os>
  <devices>
    <emulator>/usr/bin/qemu-system-x86_64</emulator>
    <disk type="file" device="disk">
      <driver name="qemu" type="qcow2"/>
      <source file="/home/leon/test1.img"/>
      <target dev="vda" bus="virtio"/>
    </disk>
    <interface type="network">
      <source network="default"/>
      <mac address="52:54:00:8e:c6:5f"/>
      <model type="virtio"/>
    </interface>
    <console type="pty"/>
    <graphics type="vnc" port="-1" listen="0.0.0.0" passwd="test1"/>
  </devices>
</domain>`;

		expect(actualXml).to.equal(expectedXml);
	});
});

describe('domainDescFromXml', () => {
	it('should work', async () => {
		const xml =
`<domain type="kvm">
  <name>test1</name>
  <uuid>148d0864-2354-4c27-b82c-731bdd3f320c</uuid>
  <memory>1048576</memory>
  <currentMemory>1048576</currentMemory>
  <vcpu>1</vcpu>
  <os>
    <type arch="x86_64" machine="q35">hvm</type>
    <boot dev="hd"/>
  </os>
  <devices>
    <emulator>/usr/bin/qemu-system-x86_64</emulator>
    <disk type="file" device="disk">
      <driver name="qemu" type="qcow2"/>
      <source file="/home/leon/test1.img"/>
      <target dev="vda" bus="virtio"/>
    </disk>
    <interface type="network">
      <source network="default"/>
      <mac address="52:54:00:8e:c6:5f"/>
      <model type="virtio"/>
    </interface>
    <console type="pty"/>
    <graphics type="vnc" port="-1" listen="0.0.0.0" passwd="test1"/>
  </devices>
</domain>`;

		const actualDomainDesc = await domainDescFromXml(xml);

		const expectedDomainDesc: DomainDesc = {

			type: 'kvm',

			name: 'test1',
			uuid: '148d0864-2354-4c27-b82c-731bdd3f320c',

			memory: { value: 1048576 },
			currentMemory: { value: 1048576 },

			vcpu: { value: 1 },

			os: {
				type: { arch: 'x86_64', machine: 'q35', value: 'hvm' },
				boot: { dev: 'hd' }
			},

			devices: [

				{
					type: 'emulator',
					emulator: { value: '/usr/bin/qemu-system-x86_64' }
				},

				{
					type: 'disk',
					disk: {
						type: 'file', device: 'disk',
						driver: { name: 'qemu', type: 'qcow2' },
						source: { file: '/home/leon/test1.img' },
						target: { dev: 'vda', bus: 'virtio' }
					}
				},

				{
					type: 'interface',
					interface: {
						type: 'network',
						source: { network: 'default' },
						mac: { address: '52:54:00:8e:c6:5f' },
						model: { type: 'virtio' }
					}
				},

				{
					type: 'console',
					console: { type: 'pty' }
				},

				{
					type: 'graphics',
					graphics: {
						type: 'vnc',
						port: -1,
						listen: '0.0.0.0',
						passwd: 'test1'
					}
				}

			]

		};

		expect(actualDomainDesc).to.deep.equal(expectedDomainDesc);
	});

	it('should handle string memory value', async () => {
		const xml = `<domain type="kvm">
			<memory>2048</memory>
		</domain>`;
		const desc = await domainDescFromXml(xml);
		expect(desc.memory).to.deep.equal({
			value: 2048
		});
	});

	it('should handle string currentMemory value', async () => {
		const xml = `<domain type="kvm">
			<currentMemory>1024</currentMemory>
		</domain>`;
		const desc = await domainDescFromXml(xml);
		expect(desc.currentMemory).to.deep.equal({
			value: 1024
		});
	});

	it('should handle string vcpu value', async () => {
		const xml = `<domain type="kvm">
			<vcpu>2</vcpu>
		</domain>`;
		const desc = await domainDescFromXml(xml);
		expect(desc.vcpu).to.deep.equal({
			value: 2
		});
	});

	it('should handle memory with unit', async () => {
		const xml = `<domain type="kvm">
			<memory unit="KiB">2048</memory>
		</domain>`;
		const desc = await domainDescFromXml(xml);
		expect(desc.memory).to.deep.equal({
			value: 2048,
			unit: 'KiB'
		});
	});

	it('should handle currentMemory with unit', async () => {
		const xml = `<domain type="kvm">
			<currentMemory unit="KiB">1024</currentMemory>
		</domain>`;
		const desc = await domainDescFromXml(xml);
		expect(desc.currentMemory).to.deep.equal({
			value: 1024,
			unit: 'KiB'
		});
	});

	it('should handle vcpu with placement', async () => {
		const xml = `<domain type="kvm">
			<vcpu placement="static">2</vcpu>
		</domain>`;
		const desc = await domainDescFromXml(xml);
		expect(desc.vcpu).to.deep.equal({
			value: 2,
			placement: 'static'
		});
	});

	it('should throw error for invalid XML', async () => {
		const xml = `<invalid>`;
		try {
			await domainDescFromXml(xml);
			expect.fail('Should have thrown an error');
		} catch (error) {
			expect(error.message).to.include('Unclosed root tag');
		}
	});
});

describe('domain-xml', () => {
	it('should handle domain with loader configuration', async () => {
		const desc: DomainDesc = {
			type: 'qemu',
			name: 'test-vm',
			os: {
				type: {
					arch: 'x86_64',
					machine: 'q35',
					value: 'hvm'
				},
				boot: {
					dev: 'hd'
				},
				loader: {
					readonly: 'yes',
					type: 'pflash',
					value: '/usr/share/OVMF/OVMF_CODE.fd'
				}
			}
		};

		const xml = domainDescToXml(desc);
		const parsedDesc = await domainDescFromXml(xml);

		expect(parsedDesc.os?.loader).to.deep.equal({
			readonly: 'yes',
			type: 'pflash',
			value: '/usr/share/OVMF/OVMF_CODE.fd'
		});
	});

	it('should handle domain with multiple loaders', async () => {
		const desc: DomainDesc = {
			type: 'qemu',
			name: 'test-vm',
			os: {
				type: {
					arch: 'x86_64',
					machine: 'q35',
					value: 'hvm'
				},
				boot: {
					dev: 'hd'
				},
				loader: [
					{
						readonly: 'yes',
						type: 'pflash',
						value: '/usr/share/OVMF/OVMF_CODE.fd'
					},
					{
						readonly: 'no',
						type: 'pflash',
						value: '/usr/share/OVMF/OVMF_VARS.fd'
					}
				]
			}
		};

		const xml = domainDescToXml(desc);
		expect(xml).to.include('readonly="yes"');
		expect(xml).to.include('type="pflash"');
		expect(xml).to.include('/usr/share/OVMF/OVMF_CODE.fd');
		expect(xml).to.include('/usr/share/OVMF/OVMF_VARS.fd');
	});

	it('should convert domain description to XML and back', async () => {
		const desc: DomainDesc = {
			type: 'qemu',
			name: 'test-vm',
			uuid: '123e4567-e89b-12d3-a456-426614174000',
			memory: {
				unit: 'KiB',
				value: 1024 * 1024 // 1GB
			},
			currentMemory: {
				unit: 'KiB',
				value: 512 * 1024 // 512MB
			},
			vcpu: {
				placement: 'static',
				value: 2
			},
			os: {
				type: {
					arch: 'x86_64',
					machine: 'q35',
					value: 'hvm'
				},
				boot: {
					dev: 'hd'
				}
			},
			devices: [
				{
					type: 'disk',
					disk: {
						type: 'file',
						device: 'disk',
						source: { file: '/tmp/test.img' },
						target: { dev: 'vda', bus: 'virtio' }
					}
				},
				{
					type: 'interface',
					interface: {
						type: 'network',
						source: { network: 'default' },
						model: { type: 'virtio' }
					}
				},
				{
					type: 'graphics',
					graphics: {
						type: 'vnc',
						port: 5900,
						listen: '0.0.0.0'
					}
				}
			]
		};

		const xml = domainDescToXml(desc);
		const parsedDesc = await domainDescFromXml(xml);

		// Compare the descriptions, ignoring undefined values
		expect(parsedDesc.type).to.equal(desc.type);
		expect(parsedDesc.name).to.equal(desc.name);
		expect(parsedDesc.uuid).to.equal(desc.uuid);
		expect(parsedDesc.memory).to.deep.equal(desc.memory);
		expect(parsedDesc.currentMemory).to.deep.equal(desc.currentMemory);
		expect(parsedDesc.vcpu).to.deep.equal(desc.vcpu);
		expect(parsedDesc.os).to.deep.equal(desc.os);
		if (parsedDesc.devices && desc.devices) {
			expect(parsedDesc.devices).to.have.length(desc.devices.length);
		}
	});

	it('should handle memory values without units', async () => {
		const xml = `
			<domain type="qemu">
				<name>test-vm</name>
				<memory>1048576</memory>
				<currentMemory>524288</currentMemory>
				<vcpu placement="static">2</vcpu>
			</domain>
		`;

		const desc = await domainDescFromXml(xml);
		expect(desc.memory).to.deep.equal({ value: 1048576 });
		expect(desc.currentMemory).to.deep.equal({ value: 524288 });
	});

	it('should handle memory values with units', async () => {
		const xml = `
			<domain type="qemu">
				<name>test-vm</name>
				<memory unit="KiB">1048576</memory>
				<currentMemory unit="KiB">524288</currentMemory>
				<vcpu placement="static">2</vcpu>
			</domain>
		`;

		const desc = await domainDescFromXml(xml);
		expect(desc.memory).to.deep.equal({ value: 1048576, unit: 'KiB' });
		expect(desc.currentMemory).to.deep.equal({ value: 524288, unit: 'KiB' });
	});

	it('should handle vcpu without placement', async () => {
		const xml = `
			<domain type="qemu">
				<name>test-vm</name>
				<memory>1048576</memory>
				<vcpu>2</vcpu>
			</domain>
		`;

		const desc = await domainDescFromXml(xml);
		expect(desc.vcpu).to.deep.equal({ value: 2 });
	});

	it('should handle vcpu with placement', async () => {
		const xml = `
			<domain type="qemu">
				<name>test-vm</name>
				<memory>1048576</memory>
				<vcpu placement="static">2</vcpu>
			</domain>
		`;

		const desc = await domainDescFromXml(xml);
		expect(desc.vcpu).to.deep.equal({ value: 2, placement: 'static' });
	});

	it('should throw error for invalid XML', async () => {
		const xml = '<invalid>xml</invalid>';
		try {
			await domainDescFromXml(xml);
			expect.fail('Should have thrown an error');
		} catch (error) {
			expect(error.message).to.equal('Unable to parse domain xml');
		}
	});

	it('should handle empty domain description', () => {
		const desc: DomainDesc = {};
		const xml = domainDescToXml(desc);
		expect(xml).to.equal('<domain/>');
	});

	it('should handle domain with only basic attributes', () => {
		const desc: DomainDesc = {
			type: 'qemu',
			name: 'test-vm'
		};
		const xml = domainDescToXml(desc);
		expect(xml).to.include('type="qemu"');
		expect(xml).to.include('<name>test-vm</name>');
	});
});

describe('Device handling edge cases', () => {
	it('should handle unknown device types gracefully', () => {
		// Create a device array with a type assertion to test unknown type handling
		const devices = [{
			type: 'unknown',
			unknown: {}
		}] as unknown as DomainDesc['devices'];

		const desc: DomainDesc = { devices };
		const xml = domainDescToXml(desc);
		expect(xml).contain('<domain>');
		expect(xml).contain('<devices/>');
		expect(xml).not.contain('unknown');
	});

	it('should handle ACPI device type', () => {
		const desc: DomainDesc = {
			devices: [{
				type: 'acpi',
				acpi: {}
			}]
		};
		const xml = domainDescToXml(desc);
		expect(xml).contain('<acpi/>');
	});
});

describe('Domain ID handling', () => {
	it('should handle domain ID in XML conversion', () => {
		const desc: DomainDesc = {
			id: 123
		};
		const xml = domainDescToXml(desc);
		expect(xml).contain('id="123"');
	});

	it('should parse domain ID from XML', async () => {
		const xml = '<domain id="123"></domain>';
		const desc = await domainDescFromXml(xml);
		expect(desc.id).equal('123');
	});
});