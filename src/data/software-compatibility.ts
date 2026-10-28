import type { CatalogLink } from './software';

type IconLink = CatalogLink & { logo?: string };
type CompatibilityEntry = { name: string; support: string; source: CatalogLink; logo?: string };
type BrowserEntry = CompatibilityEntry & { supported: boolean; animation: boolean; hdr: boolean };

// Keep release requirements visible and link to the vendor's announcement.
export const browsers: BrowserEntry[] = [
  {
    name: 'Chrome',
    logo: '/images/Logo-Google-Chrome.svg',
    support: 'Chrome 155 and newer.',
    source: {
      label: 'Chrome announcement',
      url: 'https://developer.chrome.com/blog/jpeg-xl-in-chrome',
    },
    supported: true,
    animation: true,
    hdr: true,
  },
  {
    name: 'Firefox',
    logo: '/images/Logo-Firefox.svg',
    support: 'Firefox 158 and newer.',
    source: {
      label: 'Firefox 158 release notes',
      url: 'https://www.firefox.com/en-US/firefox/158.0/releasenotes/',
    },
    supported: true,
    animation: true,
    hdr: false,
  },
  {
    name: 'Safari',
    logo: '/images/sw_safari.svg',
    support: 'Safari 17 and newer.',
    source: {
      label: 'Safari 17 features',
      url: 'https://webkit.org/blog/14445/webkit-features-in-safari-17-0/#jpeg-xl',
    },
    supported: true,
    animation: false,
    hdr: true,
  },
  {
    name: 'Edge',
    logo: '/images/Logo-Microsoft-Edge.svg',
    support: 'Not supported in Microsoft Edge.',
    source: { label: 'Can I use: JPEG XL', url: 'https://caniuse.com/jpegxl' },
    supported: false,
    animation: false,
    hdr: false,
  },
];
export const otherBrowsers: (IconLink & { note: string })[] = [
  {
    label: 'Basilisk',
    note: 'Goanna engine',
    url: 'https://www.basilisk-browser.org',
    logo: '/images/BasiliskLogo.webp',
  },
  {
    label: 'Brave',
    note: '1.97.56+ desktop · Chromium 155',
    logo: '/images/Logo-Brave.svg',
    url: 'https://github.com/brave/brave-browser/releases/tag/v1.97.56',
  },
  {
    label: 'Ladybird',
    note: 'Independent engine',
    url: 'https://ladybird.org/',
    logo: '/images/sw_ladybird.png',
  },
  { label: 'Orion', note: 'WebKit', url: 'https://kagi.com/orion/', logo: '/images/sw_orion.webp' },
  {
    label: 'Pale Moon',
    note: 'Goanna engine',
    url: 'https://www.palemoon.org',
    logo: '/images/sw_palemoon.webp',
  },
  { label: 'Thorium', note: 'Chromium', url: 'https://thorium.rocks', logo: '/images/sw_thorium.svg' },
  {
    label: 'Waterfox',
    note: 'Firefox-based',
    url: 'https://www.waterfox.net',
    logo: '/images/sw_waterfox.svg',
  },
  { label: 'Zen', note: 'Firefox-based', url: 'https://zen-browser.app/', logo: '/images/sw_zen.svg' },
];
export const systems: CompatibilityEntry[] = [
  {
    name: 'Apple platforms',
    support:
      'System image support starts with macOS 14 Sonoma and iOS / iPadOS 17. Available features depend on the app.',
    source: {
      label: 'Apple image formats',
      url: 'https://developer.apple.com/videos/play/wwdc2023/10122/',
    },
  },
  {
    name: 'Windows',
    support:
      'Desktop apps can add their own support. A WIC codec or thumbnail handler can add integration for compatible apps and File Explorer.',
    source: { label: 'JPEG XL WIC codec', url: 'https://github.com/mirillis/jpegxl-wic' },
  },
  {
    name: 'Linux',
    support:
      'Libraries and tools are packaged by major distributions. Image viewing and thumbnails depend on the app, desktop plugins, and installed build.',
    source: { label: 'libjxl packages and plugins', url: 'https://github.com/libjxl/libjxl' },
  },
];
export const linuxPackages: IconLink[] = [
  {
    label: 'Arch, Manjaro & EndeavourOS',
    url: 'https://archlinux.org/packages/extra/x86_64/libjxl/',
  },
  { label: 'Debian 12+', url: 'https://packages.debian.org/bookworm/libjxl-tools' },
  { label: 'Fedora', url: 'https://packages.fedoraproject.org/pkgs/jpegxl/' },
  { label: 'KaOS', url: 'https://kaosx.us/', logo: '/images/sw_kaos.svg' },
  {
    label: 'OpenMandriva',
    url: 'https://www.openmandriva.org/',
    logo: '/images/sw_openmandriva.svg',
  },
  { label: 'openSUSE', url: 'https://software.opensuse.org/package/libjxl' },
  { label: 'Ubuntu 24.04 LTS+', url: 'https://packages.ubuntu.com/noble/libjxl-dev' },
];
