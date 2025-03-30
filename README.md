![Cover image][cover]

# Unraid / libvirt bindings

![Alpha badge][alphabadge]
![CI badge][cibadge]
![Tests badge][testsbadge]
![Coverage badge][coveragebadge]
![License badge][licensebadge]
![Contributors badge][contribadge]
![Issues badge][issuesbadge]
![PR badge][prbadge]
![NPM Version][npmbadge]
![Last Update][lastcommitbadge]

Libvirt bindings for Node.js®.

## Example Usage

```typescript
import libvirt, {
  DomainBuilder,
  domainDescToXml,
  domainDescFromXml,
} from "@unraid/libvirt";

const uri = process.env.LIBVIRT_URI || "qemu:///system";
const hypervisor = new libvirt.Hypervisor({ uri });

(async () => {
  await hypervisor.connectOpen();

  // parse xml template
  const template = await domainDescFromXml("<domain>...</domain>");

  // build new domain description
  const domain = new DomainBuilder()
    .fromTemplate(template)

    .setName("test1")
    .setUUID("148d0864-2354-4c27-b82c-731bdd3f320c")

    .addDisk({
      type: "file",
      device: "disk",
      driver: { name: "qemu", type: "qcow2" },
      source: { file: "/home/leon/test1.img" },
      target: { dev: "vda", bus: "virtio" },
    })

    .addInterface({
      type: "network",
      source: { network: "default" },
      mac: { address: "52:54:00:8e:c6:5f" },
      model: { type: "virtio" },
    })

    .build();

  // define and boot domain
  const xml = domainDescToXml(domain);
  await hypervisor.domainCreateXML(xml);

  // list active domains
  const activeDomains = await hypervisor.connectListAllDomains(
    libvirt.ConnectListAllDomainsFlags.ACTIVE
  );

  // log active domain names
  const activeDomainNames = await Promise.all(
    activeDomains.map((domain) => hypervisor.domainGetName(domain))
  );
  console.log(activeDomainNames);

  await hypervisor.connectClose();
})();
```

## Install

### Debian / Ubuntu

```bash
sudo apt install build-essential libvirt-dev qemu-system
npm i @unraid/libvirt
```

### MacOS

Install Homebrew and Xcode first if not already installed.

```bash
brew install libvirt qemu
npm i @unraid/libvirt
```

## Development

This project uses pnpm as the package manager. Make sure you have it installed:

```bash
npm install -g pnpm
```

### Building

```bash
pnpm install
pnpm build
```

### Testing

The project uses Vitest for testing. You can run tests using:

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests with UI
pnpm test:ui
```

### Examples

The project includes several example scripts that demonstrate different features:

```bash
# List all domains
pnpm examples/list

# Start a domain
pnpm examples/start

# Shutdown a domain
pnpm examples/shutdown

# Create a domain using the builder pattern
pnpm examples/builder
```

## Contribute

Any contribution is welcome! To check whether your contribution conforms to our style guide, run the following tasks:

```bash
# Install dependencies
pnpm install

# Run linting
pnpm lint

# Run tests
pnpm test
```

---

MIT License

Copyright (c) 2019 Leon Rinkel <leon@rinkel.me> and vmngr/libvirt contributers

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

[cover]: cover.png "Cover image"
[alphabadge]: https://img.shields.io/badge/-alpha-green "Alpha badge"
[licensebadge]: https://img.shields.io/github/license/unraid/libvirt "License badge"
[cibadge]: https://github.com/unraid/libvirt/workflows/CI/badge.svg "CI badge"
[testsbadge]: https://img.shields.io/github/actions/workflow/status/unraid/libvirt/integration-test.yml?label=tests "Tests badge"
[coveragebadge]: https://img.shields.io/github/actions/workflow/status/unraid/libvirt/integration-test.yml?label=coverage "Coverage badge"
[contribadge]: https://img.shields.io/github/contributors/unraid/libvirt "Contributors badge"
[issuesbadge]: https://img.shields.io/github/issues/unraid/libvirt "Issues badge"
[prbadge]: https://img.shields.io/github/issues-pr/unraid/libvirt "PR badge"
[npmbadge]: https://img.shields.io/npm/v/@unraid/libvirt "NPM Version badge"
[lastcommitbadge]: https://img.shields.io/github/last-commit/unraid/libvirt "Last Commit badge"
