// Shared catalog for Software Support and Demos & experiments.
// See docs/software-directory.md before adding or changing an entry.
export const platforms = {
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
  android: 'Android',
  ios: 'iOS & iPadOS',
  browser: 'Browser',
  cloud: 'Cloud service',
  runtime: 'See runtime requirements',
} as const;
export const capabilities = {
  open: 'Opens JXL',
  export: 'Exports JXL',
  'jpeg-reconstruction': 'Lossless JPEG reconstruction',
  animation: 'Animation',
  metadata: 'Metadata',
} as const;
export type Platform = keyof typeof platforms;
export type Capability = keyof typeof capabilities;
export type Category = 'view' | 'edit' | 'convert' | 'build' | 'deliver' | 'utilities' | 'demo';
export type CatalogLink = { label: string; url: string };
export type SoftwareEntry = {
  id: string;
  name: string;
  url: string;
  category: Category;
  platforms: Platform[];
  description: string;
  capabilities?: Capability[];
  requirements?: string;
  logo?: string;
  keywords?: string[];
  // Additional task categories that also list this entry.
  also?: Exclude<Category, 'demo'>[];
  sources: CatalogLink[];
  links?: CatalogLink[];
  contributors?: { name: string; url: string }[];
  etAl?: boolean;
};
export const categories: {
  id: Exclude<Category, 'demo'>;
  title: string;
  description: string;
  note?: string;
}[] = [
  {
    id: 'view',
    title: 'View & preview',
    description:
      'Open images, preview files, and add JPEG XL support to your desktop and toolkits.',
    note: 'Desktop support depends on the application and installed plugins. Qt viewers include Gwenview, digiKam, KolourPaint, KPhotoAlbum, LXImage-Qt, qimgv, qView, nomacs, VookiImageViewer, and PhotoQt. GTK viewers include Eye of GNOME (eog), gThumb, and Geeqie. EFL viewers include entice and ephoto.',
  },
  {
    id: 'edit',
    title: 'Edit & manage',
    description: 'Retouch photos, paint, and organize an image collection.',
  },
  {
    id: 'convert',
    title: 'Convert & compress',
    description: 'Create JPEG XL files and compare compression results.',
    note: 'Command-line tools from Build & integrate are listed here too.',
  },
  {
    id: 'build',
    title: 'Build & integrate',
    description: 'Add JPEG XL to your application or command-line workflow.',
  },
  {
    id: 'deliver',
    title: 'Deliver on the web',
    description: 'Optimize and serve images through a hosting or delivery service.',
  },
  {
    id: 'utilities',
    title: 'Metadata & utilities',
    description: 'Inspect metadata and manage image files.',
  },
];
export const software: SoftwareEntry[] = [
  {
    id: 'aspect',
    name: 'Aspect',
    url: 'https://aspect.bildhuus.com/',
    category: 'edit',
    platforms: ['windows', 'macos', 'linux'],
    description: 'Photo organization and image viewing.',
    sources: [
      {
        label: 'Support details',
        url: 'https://aspect.bildhuus.com/',
      },
    ],
    logo: '/images/sw_aspect.png',
  },
  {
    id: 'imageglass',
    name: 'ImageGlass',
    url: 'https://imageglass.org/',
    category: 'view',
    platforms: ['windows'],
    description: 'Image viewer for Windows.',
    sources: [
      {
        label: 'Support details',
        url: 'https://imageglass.org/',
      },
    ],
    capabilities: ['open'],
    logo: '/images/sw_imageglass.svg',
  },
  {
    id: 'irfanview',
    name: 'IrfanView',
    url: 'https://www.irfanview.com/',
    category: 'view',
    platforms: ['windows'],
    description: 'Image viewing with a JPEG XL plugin.',
    sources: [
      {
        label: 'Support details',
        url: 'https://www.irfanview.com/',
      },
    ],
    capabilities: ['open'],
    requirements: 'JPEG XL support since 4.59; install and enable the plugin.',
    links: [
      {
        label: 'Download plugins',
        url: 'https://www.irfanview.com/plugins.htm',
      },
    ],
    logo: '/images/sw_irfanview.png',
  },
  {
    id: 'jpegview',
    name: 'JPEGView',
    url: 'https://github.com/sylikc/jpegview/releases',
    category: 'view',
    platforms: ['windows'],
    description: 'Lightweight image viewer.',
    sources: [
      {
        label: 'Support details',
        url: 'https://github.com/sylikc/jpegview/releases',
      },
    ],
    capabilities: ['open'],
    logo: '/images/sw_jpegview.png',
  },
  {
    id: 'jxlook',
    name: 'JXLook',
    url: 'https://github.com/yllan/JXLook',
    category: 'view',
    platforms: ['macos'],
    description: 'JPEG XL previews in macOS Quick Look.',
    sources: [
      {
        label: 'Support details',
        url: 'https://github.com/yllan/JXLook',
      },
    ],
    capabilities: ['open'],
    requirements: 'Requires a Quick Look plugin.',
    logo: '/images/sw_jxlook.png',
  },
  {
    id: 'lookquick',
    name: 'LookQuick',
    url: 'https://apps.apple.com/us/app/lookquick/id6759767692?mt=12',
    category: 'view',
    platforms: ['macos'],
    description: 'Quick Look previews with animated JPEG XL playback and adjustable frame rate.',
    sources: [
      {
        label: 'Support details',
        url: 'https://github.com/jxl-community/jxl-community.github.io/pull/119',
      },
    ],
    capabilities: ['open', 'animation'],
    requirements: 'Install the macOS Quick Look plugin.',
  },
  {
    id: 'mihon',
    name: 'Mihon',
    url: 'https://mihon.app/',
    category: 'view',
    platforms: ['android'],
    description: 'Comic and manga reader.',
    sources: [
      {
        label: 'Support details',
        url: 'https://mihon.app/',
      },
    ],
    capabilities: ['open'],
    logo: '/images/sw_mihon.png',
  },
  {
    id: 'swayimg',
    name: 'Swayimg',
    url: 'https://github.com/artemsen/swayimg',
    category: 'view',
    platforms: ['linux'],
    description: 'Image viewer for Wayland.',
    sources: [
      {
        label: 'Support details',
        url: 'https://github.com/artemsen/swayimg',
      },
    ],
    capabilities: ['open'],
    logo: '/images/sw_swayimg.png',
  },
  {
    id: 'xnview',
    name: 'XnView',
    url: 'https://www.xnview.com/en/',
    category: 'view',
    platforms: ['windows', 'macos', 'linux'],
    description: 'Image viewing and organization; platform availability depends on the edition.',
    sources: [
      {
        label: 'Support details',
        url: 'https://www.xnview.com/en/',
      },
    ],
    capabilities: ['open'],
    logo: '/images/sw_xnview.png',
  },
  {
    id: 'jpegxl-wic',
    name: 'JPEG XL WIC codec',
    url: 'https://github.com/mirillis/jpegxl-wic',
    category: 'view',
    platforms: ['windows'],
    description: 'JPEG XL decoding for applications that use Windows Imaging Component.',
    sources: [
      {
        label: 'Support details',
        url: 'https://github.com/mirillis/jpegxl-wic',
      },
    ],
    capabilities: ['open'],
    requirements: 'Install the WIC codec; support depends on the application.',
  },
  {
    id: 'jxl-winthumb',
    name: 'Windows Thumbnail Handler',
    url: 'https://github.com/saschanaz/jxl-winthumb',
    category: 'view',
    platforms: ['windows'],
    description: 'JPEG XL thumbnails in File Explorer.',
    sources: [
      {
        label: 'Support details',
        url: 'https://github.com/saschanaz/jxl-winthumb',
      },
    ],
    capabilities: ['open'],
    requirements: 'Install the thumbnail handler.',
  },
  {
    id: 'qt-plugin',
    name: 'Qt / KDE image plugin',
    url: 'https://github.com/novomesk/qt-jpegxl-image-plugin',
    category: 'view',
    platforms: ['windows', 'macos', 'linux'],
    description: 'JPEG XL support for Qt-based viewers and desktop applications.',
    sources: [
      {
        label: 'Support details',
        url: 'https://github.com/novomesk/qt-jpegxl-image-plugin',
      },
    ],
    capabilities: ['open'],
    requirements: 'Requires the JPEG XL image plugin and a compatible application.',
    keywords: [
      'Gwenview',
      'digiKam',
      'KolourPaint',
      'KPhotoAlbum',
      'LXImage-Qt',
      'qimgv',
      'qView',
      'nomacs',
      'VookiImageViewer',
      'PhotoQt',
    ],
  },
  {
    id: 'gdk-pixbuf',
    name: 'GDK-pixbuf plugin',
    url: 'https://github.com/libjxl/libjxl/tree/main/plugins',
    category: 'view',
    platforms: ['linux'],
    description: 'JPEG XL loading for applications that use GDK-pixbuf.',
    sources: [
      {
        label: 'Support details',
        url: 'https://github.com/libjxl/libjxl/tree/main/plugins',
      },
    ],
    capabilities: ['open'],
    requirements: 'Install the plugin for your distribution.',
    keywords: ['Eye of GNOME', 'eog', 'gThumb', 'Geeqie'],
  },
  {
    id: 'acdsee',
    name: 'ACDSee',
    url: 'https://www.acdsee.com/en/photo-studio/whats-new/',
    category: 'edit',
    platforms: ['windows'],
    description: 'Photo editing and organization.',
    sources: [
      {
        label: 'Support details',
        url: 'https://www.acdsee.com/en/photo-studio/whats-new/',
      },
    ],
    logo: '/images/sw_acdsee.png',
    requirements:
      'Photo Studio 2027 supports JPEG XL compression inside DNG files. Standalone .jxl support is not documented.',
  },
  {
    id: 'acorn',
    name: 'Acorn',
    url: 'https://flyingmeat.com/acorn/',
    category: 'edit',
    platforms: ['macos'],
    description: 'Image editing for macOS.',
    sources: [
      {
        label: 'Support details',
        url: 'https://flyingmeat.com/acorn/',
      },
    ],
    logo: '/images/sw_acorn.png',
    capabilities: ['open', 'export'],
  },
  {
    id: 'affinity',
    name: 'Affinity',
    url: 'https://www.affinity.studio',
    category: 'edit',
    platforms: ['windows', 'macos'],
    description: 'Photo editing and design.',
    sources: [
      {
        label: 'Affinity supported file formats',
        url: 'https://affinity.help/photo2/en-US.lproj/pages/Appendix/fileformat.html',
      },
    ],
    logo: '/images/sw_affinity.svg',
    capabilities: ['open', 'export'],
  },
  {
    id: 'camera-raw',
    name: 'Adobe Camera Raw',
    url: 'https://helpx.adobe.com/ca/camera-raw/using/introduction-camera-raw.html',
    category: 'edit',
    platforms: ['windows', 'macos'],
    description: 'Raw photo processing. Check the version for JPEG XL workflows.',
    sources: [
      {
        label: 'Support details',
        url: 'https://helpx.adobe.com/ca/camera-raw/using/introduction-camera-raw.html',
      },
    ],
    logo: '/images/sw_adobe_camera_raw.png',
  },
  {
    id: 'darktable',
    name: 'darktable',
    url: 'https://www.darktable.org',
    category: 'edit',
    platforms: ['windows', 'macos', 'linux'],
    description: 'Raw photo development and workflow management.',
    sources: [
      {
        label: 'darktable 4.2.0 release notes',
        url: 'https://www.darktable.org/2022/12/darktable-4.2.0-released/',
      },
    ],
    logo: '/images/sw_darktable.svg',
    capabilities: ['open', 'export'],
    requirements: 'JPEG XL support since 4.2.',
  },
  {
    id: 'gimp',
    name: 'GIMP',
    url: 'https://www.gimp.org',
    category: 'edit',
    platforms: ['windows', 'macos', 'linux'],
    description: 'Image editing and retouching.',
    sources: [
      {
        label: 'GIMP 3.0 release notes',
        url: 'https://www.gimp.org/release-notes/gimp-3.0.html',
      },
    ],
    logo: '/images/sw_gimp.svg',
    capabilities: ['open', 'export'],
    requirements: 'JPEG XL import and export, including CMYK, in GIMP 3.0.',
  },
  {
    id: 'graphicconverter',
    name: 'GraphicConverter',
    url: 'https://www.lemkesoft.de/en/products/graphicconverter/',
    category: 'edit',
    platforms: ['macos'],
    description: 'Image editing and conversion.',
    sources: [
      {
        label: 'Support details',
        url: 'https://www.lemkesoft.de/en/products/graphicconverter/',
      },
    ],
    requirements: 'JPEG XL support since 11.5.',
    logo: '/images/sw_graphicconverter.png',
  },
  {
    id: 'image-toolbox',
    name: 'Image Toolbox',
    url: 'https://github.com/T8RIN/ImageToolbox',
    category: 'edit',
    platforms: ['android'],
    description: 'Image editing and conversion on Android.',
    sources: [
      {
        label: 'Support details',
        url: 'https://github.com/T8RIN/ImageToolbox',
      },
    ],
    requirements: 'JPEG XL support since 2.6.0.',
    capabilities: ['open', 'export', 'animation'],
    logo: '/images/sw_image-toolbox.png',
  },
  {
    id: 'iridient-developer',
    name: 'Iridient Developer',
    url: 'https://www.iridientdigital.com/products/iridientdeveloper.html',
    category: 'edit',
    platforms: ['macos'],
    description: 'Raw photo development with lossless, near-lossless, and lossy JPEG XL export.',
    sources: [
      {
        label: 'Support details',
        url: 'https://www.iridientdigital.com/products/iridientdeveloper.html',
      },
    ],
    capabilities: ['export'],
    requirements: 'JPEG XL export since version 5.',
    logo: '/images/sw_iridient-developer.png',
  },
  {
    id: 'krita',
    name: 'Krita',
    url: 'https://krita.org/en/',
    category: 'edit',
    platforms: ['windows', 'macos', 'linux'],
    description: 'Digital painting and image editing.',
    sources: [
      {
        label: 'Krita JPEG XL documentation',
        url: 'https://docs.krita.org/en/general_concepts/file_formats/file_jxl.html',
      },
    ],
    logo: '/images/Krita-icon---2021.svg',
    capabilities: ['export', 'animation', 'metadata'],
  },
  {
    id: 'lightroom',
    name: 'Lightroom',
    url: 'https://lightroom.adobe.com',
    category: 'edit',
    platforms: ['windows', 'macos'],
    description: 'Photo editing and management. JPEG XL workflows vary by Lightroom edition.',
    sources: [
      {
        label: 'Lightroom Classic HDR output',
        url: 'https://helpx.adobe.com/lightroom-classic/desktop/process-and-develop-photos/hdr-output.html',
      },
    ],
    logo: '/images/sw_lightroom.svg',
    capabilities: ['open', 'export'],
    requirements: 'JPEG XL in Lightroom Classic 13 and newer; workflows vary by Lightroom edition.',
  },
  {
    id: 'paint-net',
    name: 'Paint.NET',
    url: 'https://www.getpaint.net/index.html',
    category: 'edit',
    platforms: ['windows'],
    description: 'Image editing with native JPEG XL support.',
    sources: [
      {
        label: 'paint.net 5.1.5 release notes',
        url: 'https://blog.paint.net/2025/03/11/paint-net-5-1-5-is-now-available/',
      },
    ],
    requirements: 'Native support since 5.1.5; older versions from 4.3.12 can use a plugin.',
    links: [
      {
        label: 'Plugin for older versions',
        url: 'https://github.com/0xC0000054/pdn-jpegxl',
      },
    ],
    capabilities: ['open', 'export'],
    logo: '/images/sw_paint-net.png',
  },
  {
    id: 'photopea',
    name: 'Photopea',
    url: 'https://www.photopea.com/',
    category: 'edit',
    platforms: ['browser'],
    description: 'Browser image editor with JPEG XL import and plugin-based export.',
    sources: [
      {
        label: 'Support details',
        url: 'https://www.photopea.com/',
      },
    ],
    capabilities: ['open', 'export'],
    requirements: 'Export requires a plugin.',
    logo: '/images/sw_photopea.png',
  },
  {
    id: 'photoshop',
    name: 'Photoshop',
    url: 'https://www.adobe.com/products/photoshop.html',
    category: 'edit',
    platforms: ['windows', 'macos'],
    description: 'Image editing with native JPEG XL open and save.',
    sources: [
      {
        label: 'Photoshop June 2025 feature summary',
        url: 'https://helpx.adobe.com/photoshop/using/whats-new/2025-6.html',
      },
    ],
    logo: '/images/sw_photoshop.svg',
    links: [
      {
        label: 'JPEG XL plugin for Photoshop 2020+ on Windows',
        url: 'https://gitlab.com/SuperSaltyGamer/jpegxlformat',
      },
    ],
    capabilities: ['open', 'export'],
    requirements: 'Native support since Photoshop 26.8 (June 2025); save with File > Save a Copy.',
  },
  {
    id: 'rawtherapee',
    name: 'RawTherapee',
    url: 'https://github.com/Beep6581/RawTherapee',
    category: 'edit',
    platforms: ['windows', 'macos', 'linux'],
    description: 'Raw photo processing with JPEG XL import.',
    sources: [
      {
        label: 'Support details',
        url: 'https://github.com/Beep6581/RawTherapee',
      },
    ],
    capabilities: ['open'],
    requirements: 'Import since 5.11; consult the export development status for your release.',
    links: [
      {
        label: 'Export development status',
        url: 'https://github.com/Beep6581/RawTherapee/pull/7097',
      },
    ],
    logo: '/images/sw_rawtherapee.svg',
  },
  {
    id: 'incredible-tools',
    name: 'incredible.tools',
    url: 'https://incredible.tools/jxl-to-jpg',
    category: 'convert',
    platforms: ['browser'],
    description: 'Convert between JPEG XL, JPEG, and PNG in your browser.',
    sources: [
      {
        label: 'Support details',
        url: 'https://github.com/jxl-community/jxl-community.github.io/pull/120',
      },
    ],
    capabilities: ['open', 'export'],
    requirements: 'Runs locally on your device using native decoding or WebAssembly; no sign-up.',
    logo: '/images/sw_incredible-tools.svg',
  },
  {
    id: 'jpegxl-io',
    name: 'jpegxl.io',
    url: 'https://jpegxl.io/',
    category: 'convert',
    platforms: ['browser'],
    description: 'Web-based JPEG XL conversion.',
    sources: [
      {
        label: 'Support details',
        url: 'https://jpegxl.io/',
      },
    ],
    logo: '/images/sw_jpegxl-io.png',
  },
  {
    id: 'jpeg-xl-toolbox',
    name: 'JPEG XL Toolbox',
    url: 'https://apps.apple.com/app/jpeg-xl-toolbox/id6470681357',
    category: 'convert',
    platforms: ['ios'],
    description: 'Convert photos and ProRAW files to JPEG XL on iPhone and iPad.',
    sources: [
      {
        label: 'Support details',
        url: 'https://apps.apple.com/app/jpeg-xl-toolbox/id6470681357',
      },
    ],
    capabilities: ['export'],
    logo: '/images/sw_jpeg-xl-toolbox.png',
  },
  {
    id: 'karmadisk',
    name: 'KarmaDisk',
    url: 'https://www.karmadisk.eu/',
    category: 'convert',
    platforms: ['macos'],
    description: 'Convert JPEG files to JPEG XL with byte-exact JPEG reconstruction checks.',
    sources: [
      {
        label: 'Support details',
        url: 'https://www.karmadisk.eu/how-photo-cleanup-works/#measured-jpeg-xl',
      },
    ],
    capabilities: ['export', 'jpeg-reconstruction'],
    requirements: 'macOS 15 or newer; freemium.',
    links: [
      {
        label: 'Contribution and evidence',
        url: 'https://github.com/jxl-community/jxl-community.github.io/pull/121',
      },
    ],
    logo: '/images/sw_karmadisk.png',
  },
  {
    id: 'mconverter',
    name: 'MConverter',
    url: 'https://mconverter.eu/',
    category: 'convert',
    platforms: ['browser'],
    description: 'Online file conversion including JPEG XL.',
    sources: [
      {
        label: 'Support details',
        url: 'https://mconverter.eu/',
      },
    ],
    logo: '/images/sw_mconverter.png',
  },
  {
    id: 'pxl-compare',
    name: 'pXL Compare',
    url: 'https://pxlcompare.com',
    category: 'convert',
    platforms: ['macos'],
    description: 'Compare image compression results in a native Mac app.',
    capabilities: ['open', 'export'],
    sources: [
      {
        label: 'Support details',
        url: 'https://pxlcompare.com',
      },
    ],
    contributors: [
      {
        name: 'Kelly Thompson',
        url: 'https://github.com/kkthompson/',
      },
    ],
    logo: '/images/sw_pxl-compare.png',
  },
  {
    id: 'shutter-encoder',
    name: 'Shutter Encoder',
    url: 'https://www.shutterencoder.com',
    category: 'convert',
    platforms: ['windows', 'macos', 'linux'],
    description: 'Desktop media and image conversion.',
    sources: [
      {
        label: 'Support details',
        url: 'https://www.shutterencoder.com',
      },
    ],
    logo: '/images/sw-shutterencoder-logo.png',
  },
  {
    id: 'squash',
    name: 'Squash',
    url: 'https://squash.techie-jim.net/editor',
    category: 'convert',
    platforms: ['browser'],
    description: 'A Squoosh fork for compressing images and comparing codecs.',
    sources: [
      {
        label: 'Support details',
        url: 'https://squash.techie-jim.net/editor',
      },
    ],
    capabilities: ['export'],
    requirements: 'Runs locally on your device.',
    logo: '/images/sw_squash.png',
  },
  {
    id: 'squoosh',
    name: 'Squoosh',
    url: 'https://squoosh.app/index.html',
    category: 'convert',
    platforms: ['browser'],
    description: 'Browser image optimizer with a JPEG XL implementation.',
    sources: [
      {
        label: 'Support details',
        url: 'https://squoosh.app/index.html',
      },
    ],
    capabilities: ['export'],
    requirements:
      'Runs locally. Its JPEG XL implementation is outdated; compare with current encoders.',
    logo: '/images/sw_squoosh.png',
  },
  {
    id: 'xl-converter',
    name: 'XL Converter',
    url: 'https://github.com/JacobDev1/xl-converter',
    category: 'convert',
    platforms: ['windows', 'linux'],
    description: 'Desktop image conversion with lossless JPEG transcoding.',
    sources: [
      {
        label: 'Support details',
        url: 'https://github.com/JacobDev1/xl-converter',
      },
    ],
    capabilities: ['open', 'export', 'jpeg-reconstruction'],
    logo: '/images/sw_xl-converter.svg',
  },
  {
    id: 'efl',
    name: 'EFL',
    url: 'https://www.enlightenment.org/',
    category: 'view',
    platforms: ['linux'],
    description: 'JPEG XL loading for Enlightenment applications.',
    sources: [
      {
        label: 'Support details',
        url: 'https://www.enlightenment.org/',
      },
    ],
    capabilities: ['open'],
    requirements: 'JPEG XL support since 1.27; no external plugin needed.',
    keywords: ['entice', 'ephoto'],
    logo: '/images/sw_efl.png',
  },
  {
    id: 'ffmpeg',
    name: 'FFmpeg',
    url: 'https://www.ffmpeg.org',
    category: 'build',
    platforms: ['windows', 'macos', 'linux'],
    description: 'Command-line media processing and libraries.',
    sources: [
      {
        label: 'libjxl encoder documentation',
        url: 'https://ffmpeg.org/ffmpeg-codecs.html#libjxl',
      },
    ],
    logo: '/images/sw_ffmpeg-icon.svg',
    requirements: 'JPEG XL availability depends on build configuration.',
    capabilities: ['export'],
    also: ['convert'],
  },
  {
    id: 'gdal',
    name: 'GDAL',
    url: 'https://gdal.org/en/latest/drivers/raster/jpegxl.html',
    category: 'build',
    platforms: ['windows', 'macos', 'linux'],
    description: 'JPEG XL driver for geospatial raster data.',
    sources: [
      {
        label: 'Support details',
        url: 'https://gdal.org/en/latest/drivers/raster/jpegxl.html',
      },
    ],
    logo: '/images/sw_gdal.svg',
    capabilities: ['open', 'export', 'jpeg-reconstruction', 'metadata'],
  },
  {
    id: 'graphicsmagick',
    name: 'GraphicsMagick',
    url: 'http://www.graphicsmagick.org/NEWS.html#march-26-2022',
    category: 'build',
    platforms: ['windows', 'macos', 'linux'],
    description: 'Image processing library and command-line tools.',
    sources: [
      {
        label: 'Support details',
        url: 'http://www.graphicsmagick.org/NEWS.html#march-26-2022',
      },
    ],
    requirements: 'JPEG XL support since 1.3.38; depends on the installed build.',
    also: ['convert'],
    logo: '/images/sw_graphicsmagick.png',
  },
  {
    id: 'imagemagick',
    name: 'ImageMagick',
    url: 'https://imagemagick.org',
    category: 'build',
    platforms: ['windows', 'macos', 'linux'],
    description: 'Image conversion and processing from the command line or an API.',
    sources: [
      {
        label: 'ImageMagick supported formats',
        url: 'https://imagemagick.org/formats/',
      },
    ],
    logo: '/images/ImageMagic.svg',
    requirements: 'Requires a build with JPEG XL support.',
    capabilities: ['open', 'export'],
    also: ['convert'],
  },
  {
    id: 'imlib2',
    name: 'Imlib2',
    url: 'https://docs.enlightenment.org/api/imlib2/html/',
    category: 'view',
    platforms: ['linux'],
    description: 'JPEG XL loading for applications that use Imlib2.',
    sources: [
      {
        label: 'Support details',
        url: 'https://docs.enlightenment.org/api/imlib2/html/',
      },
    ],
  },
  {
    id: 'jixel',
    name: 'jixel',
    url: 'https://github.com/awxkee/jixel',
    category: 'build',
    platforms: ['windows', 'macos', 'linux'],
    description: 'Compact JPEG XL encoder written in Rust.',
    sources: [
      {
        label: 'Support details',
        url: 'https://github.com/awxkee/jixel',
      },
    ],
    capabilities: ['export'],
    contributors: [
      {
        name: 'awxkee',
        url: 'https://github.com/awxkee',
      },
    ],
  },
  {
    id: 'jxl-coder',
    name: 'jxl-coder',
    url: 'https://github.com/awxkee/jxl-coder',
    category: 'build',
    platforms: ['android'],
    description: 'JPEG XL encoder and decoder for Android.',
    sources: [
      {
        label: 'Support details',
        url: 'https://github.com/awxkee/jxl-coder',
      },
    ],
    capabilities: ['open', 'export'],
    requirements: 'Android 5.0 / API level 21 or newer.',
  },
  {
    id: 'jxl-coder-swift',
    name: 'jxl-coder-swift',
    url: 'https://github.com/awxkee/jxl-coder-swift',
    category: 'build',
    platforms: ['macos', 'ios'],
    description: 'Swift bindings for JPEG XL encoding and decoding.',
    sources: [
      {
        label: 'Support details',
        url: 'https://github.com/awxkee/jxl-coder-swift',
      },
    ],
    capabilities: ['open', 'export'],
  },
  {
    id: 'jxl-oxide',
    name: 'jxl-oxide',
    url: 'https://github.com/tirr-c/jxl-oxide',
    category: 'build',
    platforms: ['windows', 'macos', 'linux'],
    description: 'Pure Rust JPEG XL decoder, usable as a library or command-line tool.',
    sources: [
      {
        label: 'Support details',
        url: 'https://github.com/tirr-c/jxl-oxide',
      },
    ],
    capabilities: ['open'],
    contributors: [
      {
        name: 'tirr-c',
        url: 'https://github.com/tirr-c',
      },
    ],
  },
  {
    id: 'jxl-rs',
    name: 'jxl-rs',
    url: 'https://github.com/libjxl/jxl-rs',
    category: 'build',
    platforms: ['windows', 'macos', 'linux'],
    description: 'JPEG XL decoder written in Rust.',
    sources: [
      {
        label: 'Support details',
        url: 'https://github.com/libjxl/jxl-rs',
      },
    ],
    capabilities: ['open'],
    contributors: [
      {
        name: 'Luca Versari',
        url: 'https://github.com/veluca93',
      },
      {
        name: 'Helmut Januschka',
        url: 'https://www.januschka.com/',
      },
    ],
    etAl: true,
  },
  {
    id: 'jxlatte',
    name: 'jxlatte',
    url: 'https://github.com/Traneptora/jxlatte',
    category: 'build',
    platforms: ['runtime'],
    description: 'JPEG XL decoder written in Java.',
    sources: [
      {
        label: 'Support details',
        url: 'https://github.com/Traneptora/jxlatte',
      },
    ],
    capabilities: ['open'],
    requirements: 'Requires a compatible Java runtime.',
  },
  {
    id: 'libjxl',
    name: 'libjxl',
    url: 'https://github.com/libjxl/libjxl',
    category: 'build',
    platforms: ['windows', 'macos', 'linux'],
    description:
      'JPEG XL reference implementation in C++, including cjxl and djxl command-line tools.',
    sources: [
      {
        label: 'Support details',
        url: 'https://github.com/libjxl/libjxl',
      },
    ],
    logo: '/images/libjxl-logo.svg',
    capabilities: ['open', 'export', 'jpeg-reconstruction'],
    links: [
      {
        label: 'Nightly development builds',
        url: 'https://artifacts.lucaversari.it/libjxl/libjxl/latest/',
      },
    ],
    also: ['convert'],
  },
  {
    id: 'libvips',
    name: 'libvips',
    url: 'https://libvips.github.io/libvips/',
    category: 'build',
    platforms: ['windows', 'macos', 'linux'],
    description: 'Image processing library.',
    sources: [
      {
        label: 'jxlload',
        url: 'https://www.libvips.org/API/8.17/ctor.Image.jxlload.html',
      },
      {
        label: 'jxlsave',
        url: 'https://www.libvips.org/API/8.17/method.Image.jxlsave.html',
      },
    ],
    requirements: 'JPEG XL support since 8.11; depends on build configuration.',
    capabilities: ['open', 'export'],
    also: ['convert'],
    logo: '/images/sw_libvips.png',
  },
  {
    id: 'sail',
    name: 'SAIL',
    url: 'https://sail.software/',
    category: 'build',
    platforms: ['windows', 'macos', 'linux'],
    description: 'Image decoding and encoding library.',
    sources: [
      {
        label: 'Support details',
        url: 'https://sail.software/',
      },
    ],
    requirements: 'JPEG XL support since 0.9.0.',
  },
  {
    id: 'sdwebimage',
    name: 'SDWebImage JPEGXL Coder',
    url: 'https://github.com/SDWebImage/SDWebImageJPEGXLCoder',
    category: 'build',
    platforms: ['macos', 'ios'],
    description: 'JPEG XL integration for SDWebImage.',
    sources: [
      {
        label: 'Support details',
        url: 'https://github.com/SDWebImage/SDWebImageJPEGXLCoder',
      },
    ],
    requirements: 'Decoding since 0.1.0; encoding since 0.2.0.',
    capabilities: ['open', 'export', 'animation'],
    logo: '/images/sw_sdwebimage.png',
  },
  {
    id: 'cloudinary',
    name: 'Cloudinary',
    url: 'https://cloudinary.com/blog/cloudinary_supports_jpeg_xl',
    category: 'deliver',
    platforms: ['cloud'],
    description: 'Cloud image transformation and delivery.',
    sources: [
      {
        label: 'Support details',
        url: 'https://cloudinary.com/blog/cloudinary_supports_jpeg_xl',
      },
    ],
    capabilities: ['export'],
    requirements: 'Request JPEG XL with f_jxl; f_auto does not select it by default.',
    logo: '/images/sw_cloudinary.png',
  },
  {
    id: 'fastly',
    name: 'Fastly',
    url: 'https://www.fastly.com/blog/level-up-your-images-jpeg-xl-now-supported-by-image-optimizer/',
    category: 'deliver',
    platforms: ['cloud'],
    description: 'JPEG XL delivery through Image Optimizer.',
    sources: [
      {
        label: 'Support details',
        url: 'https://www.fastly.com/blog/level-up-your-images-jpeg-xl-now-supported-by-image-optimizer/',
      },
    ],
    capabilities: ['export'],
    requirements: 'Available to Image Optimizer Professional users.',
  },
  {
    id: 'gumlet',
    name: 'Gumlet',
    url: 'https://www.gumlet.com/blog/jpeg-xl/',
    category: 'deliver',
    platforms: ['cloud'],
    description: 'Image optimization and delivery.',
    sources: [
      {
        label: 'Support details',
        url: 'https://www.gumlet.com/blog/jpeg-xl/',
      },
    ],
    capabilities: ['export'],
    requirements: 'Request JPEG XL with format=jxl.',
    logo: '/images/sw_gumlet.png',
  },
  {
    id: 'antidupl',
    name: 'AntiDupl.NET',
    url: 'https://ermig1979.github.io/AntiDupl/english/download.html',
    category: 'utilities',
    platforms: ['windows'],
    description: 'Find duplicate images, including JPEG XL files.',
    sources: [
      {
        label: 'Support details',
        url: 'https://ermig1979.github.io/AntiDupl/english/download.html',
      },
    ],
  },
  {
    id: 'ashampoo-kim',
    name: 'Ashampoo Kim',
    url: 'https://github.com/ashampoo/kim',
    category: 'utilities',
    platforms: ['runtime'],
    description: 'Image metadata library for Kotlin.',
    sources: [
      {
        label: 'Support details',
        url: 'https://github.com/ashampoo/kim',
      },
    ],
    capabilities: ['metadata'],
    requirements: 'JPEG XL support since 0.10; see the project for supported Kotlin targets.',
  },
  {
    id: 'exif-viewer',
    name: 'EXIF Viewer',
    url: 'https://stefan-oltmann.de/exif-viewer',
    category: 'utilities',
    platforms: ['browser'],
    description: 'Inspect image metadata.',
    sources: [
      {
        label: 'Support details',
        url: 'https://stefan-oltmann.de/exif-viewer',
      },
    ],
    capabilities: ['metadata'],
    logo: '/images/sw_exif-viewer.png',
  },
  {
    id: 'exiftool',
    name: 'ExifTool',
    url: 'https://exiftool.org/',
    category: 'utilities',
    platforms: ['windows', 'macos', 'linux'],
    description: 'Read and write image metadata.',
    sources: [
      {
        label: 'Support details',
        url: 'https://exiftool.org/',
      },
    ],
    capabilities: ['metadata'],
    requirements: 'JPEG XL support since 12.25.',
    logo: '/images/sw_exiftool.svg',
  },
  {
    id: 'exiv2',
    name: 'Exiv2',
    url: 'https://exiv2.org/',
    category: 'utilities',
    platforms: ['windows', 'macos', 'linux'],
    description: 'Image metadata library and command-line utility.',
    sources: [
      {
        label: 'Support details',
        url: 'https://exiv2.org/',
      },
    ],
    capabilities: ['metadata'],
    requirements: 'JPEG XL support since 0.27.4.',
    logo: '/images/sw_exiv2.png',
  },
  {
    id: 'attention-center',
    name: 'Attention Center',
    url: 'https://google.github.io/attention-center/',
    category: 'demo',
    platforms: ['browser'],
    description: 'See how a JPEG XL image appears as partial bytes are loaded.',
    sources: [
      {
        label: 'Support details',
        url: 'https://google.github.io/attention-center/',
      },
    ],
  },
  {
    id: 'jxl-art',
    name: 'JXL Art',
    url: 'https://www.januschka.com/jxl-art/',
    category: 'demo',
    platforms: ['browser'],
    description: 'Write human-readable syntax that compiles to a compact JPEG XL bitstream.',
    sources: [
      {
        label: 'Support details',
        url: 'https://www.januschka.com/jxl-art/',
      },
    ],
    contributors: [
      {
        name: 'Helmut Januschka',
        url: 'https://www.januschka.com/',
      },
    ],
  },
  {
    id: 'jxl-tests',
    name: 'JXL Tests',
    url: 'https://saklistudio.com/jxltests/',
    category: 'demo',
    platforms: ['browser'],
    description: 'Explore a collection of practical JPEG XL browser tests.',
    sources: [
      {
        label: 'Support details',
        url: 'https://saklistudio.com/jxltests/',
      },
    ],
    contributors: [
      {
        name: 'Kampidh',
        url: 'https://saklistudio.com/',
      },
    ],
  },
  {
    id: 'jxltran',
    name: 'jxltran',
    url: 'https://sneyers.info/jxltran/',
    category: 'demo',
    platforms: ['browser'],
    description: 'Crop, rotate, and adjust a JPEG XL image through reversible transforms.',
    sources: [
      {
        label: 'Support details',
        url: 'https://sneyers.info/jxltran/',
      },
    ],
    contributors: [
      {
        name: 'Jon Sneyers',
        url: 'https://sneyers.info',
      },
    ],
  },
];
