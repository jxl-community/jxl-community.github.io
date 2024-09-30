defmodule Jpegxl.Faq do
  use JpegxlWeb, :html

  defp markdown(l) do
    Enum.map(
      l,
      &{elem(&1, 0),
       elem(&1, 1)
       |> Earmark.as_html!()
       |> Phoenix.HTML.raw()}
    )
  end

  def general(_assigns) do
    [
      {"What is JPEG XL?",
       """
       JPEG XL is a next-generation image compression format designed to provide efficient compression with significant improvements over traditional JPEGs, WebP, HEIC and AVIF images in both quality and file size. It is optimized for images delivered at web quality through lossless levels.
       The codec was designed to allow its users to balance three primary criteria:
       - high fidelity to the source image
       - encoding and decoding speed
       - compression ratio (typically 20:1 to 50:1)
       """},
      {"How does JPEG XL work?",
       """
       JPEG XL uses more advanced compression techniques compared to JPEG. It uses the most modern, advanced algorithms to achieve better compression and image quality.
       """},
      {"What are the benefits of using JPEG XL?",
       """
       - Smaller file sizes: This translates to faster loading times for web pages and reduced storage requirements – often up to 65% smaller.
       - Improved image quality: JPEG XL offers better image fidelity than all current compression algorithms.
       - Support for forward-looking features:
         - lossless compression
         - visually lossless compression
         - transparency
         - animation, layers & thumbnails
         - web-friendly progressive encoding and decoding
         - improved color accuracy and color gamut through HDR (high dynamic range) and high bit depth support
       """},
      {"Is JPEG XL replacing JPEG?",
       """
       JPEG XL makes a great replacement for JPEG, as it includes several features that ease the transition from the legacy JPEG format. Most critically, it supports lossless JPEG transcoding, converting any ‘classic’ JPEG into JPEG XL with bit-for-bit quality while saving an average 20% in file size. If needed, these files can be restored to the exact original JPEG, ensuring backward compatibility with existing JPEG-based applications

       It will take time for JPEG XL to be fully adopted. Because it offers significant advantages to all competing formats, it will likely become the new standard for image compression.
       """},
      {"Is JPEG XL free?",
       """
       Yes, JPEG XL is free to use and fully open sourced. The [reference encoder can be found here](https://github.com/libjxl/libjxl).
       """},
      {"What is JPEG XL not good for?",
       """
       JPEG XL is not optimized for very low-quality compression levels. At such file sizes, video codecs like AVIF tend to produce better results due to their specialized algorithms for low-bitrate compression.
       """},
      {"What is jpegxl.info?",
       """
       This site – jpegxl.info – is a community website dedicated to providing information, tools, and resources about JPEG XL. It offers current information about the format, its benefits, and how to use it. [Feel free to add to it!](https://github.com/jxl-community/jxl-community.github.io)
       """},
      {"What are the environmental benefits of using JPEG XL?",
       """
       Smaller file sizes lead to reduced bandwidth usage and energy consumption during storage and transmission.
       """}
    ]
    |> markdown()
  end

  def usage(_assigns) do
    [
      {"Where can I use JPEG XL images?",
       """
       JPEG XL is well-suited for applications where both image quality and file size are critical, including websites, photography, and graphic design. It enjoys wide support within the Apple ecosystem, Adobe’s photography tools, and various image libraries. For a comprehensive list of supported platforms, refer to [this Github page.](https://github.com/libjxl/libjxl/blob/main/doc/software_support.md)
       """},
      {"Are there any limitations to using JPEG XL?",
       """
       While JPEG XL offers numerous benefits, there are some limitations to consider. The most significant limitation is that browser support for JPEG XL is still evolving, meaning not all browsers can display JPEG XL images natively. Additionally, some existing image editing software might not yet offer native support for JPEG XL, requiring updates or plugins to handle the format. Therefore, users may need to rely on compatible software and browsers to fully utilize JPEG XL’s capabilities.
       """},
      {"Can I use JPEG XL on my web browser?",
       """
       Support for JPEG XL in web browsers is still evolving – many modern browsers offer support, but it’s not yet universally adopted. It’s fully supported in Safari, Thorium, Basilisk, Pale Moon, and Waterfox. Support behind a flag was added in Chromium version 91, but subsequently removed in Chromium version 109. It’s behind a flag in Firefox and Opera. You can check [https://caniuse.com/jpegxl](https://caniuse.com/jpegxl) for the latest browser compatibility information.
       """},
      {"How can I learn more about using JPEG XL?",
       """
       jpegxl.info offers documentation, tutorials, resources to help you learn more about using JPEG XL format. You can also find many links to relevant articles and tools on the site.

       The official JPEG committee JPEG XL site can be found here: [https://jpeg.org/jpegxl/](https://jpeg.org/jpegxl/)

       There is a [subreddit about JPEG XL](https://www.reddit.com/r/jpegxl/), and informal chatting with developers and early adopters of `libjxl` can be done on the [JPEG XL Discord server](https://discord.gg/DqkQgDRTFu).
       """},
      {"How do I report issues or bugs with JPEG XL?",
       """
       You can report issues or bugs with JPEG XL to the JPEG XL community of developers through its [Github page.](https://github.com/libjxl/libjxl/issues)
       """}
    ]
    |> markdown()
  end

  def technical(_assigns) do
    [
      {"How can I convert images to JPEG XL?",
       """
       There are various tools and online converters available that can convert images to JPEG XL format. Some image editing software may also offer JPEG XL export options. For example, recent versions of open-source software such as Gimp, Krita, and darktable, as well as proprietary software such as Adobe Camera Raw and Affinity Photo have all added support for JPEG XL. The reference software [libjxl](https://github.com/libjxl/libjxl) comes with command-line tools (`cjxl` and `djxl`) to convert images from other formats to JPEG XL and back. Various other popular command line tools such as ImageMagick’s `convert` or FFmpeg also have added JPEG XL support.
       """},
      {"Do I need special hardware?",
       """
       Not at all! JPEG XL is designed for computationally efficient encoding and decoding using software implementations – on today’s hardware – without the need for additional hardware acceleration, even on mobile devices.
       """},
      {"How does JPEG XL compare to WebP?",
       """
       Both JPEG XL and WebP offer significant improvements over JPEG. However, they have some key differences:

       - **Inherent Limitations:** WebP’s maximum of 8 bits per channel and its mandatory use of 4:2:0 chroma subsampling in lossy images restrict its suitability for high-quality image applications. In practice, lossy WebP operates at 6.5 bits per pixel rather than 8 bits. While the green channel retains approximately 7 bits of precision, the red and blue channels lose more than one bit of accuracy due to their conversion into a limited-range YUV format. WebP also limits image width and height to 16,383 pixels. While this may suffice for most web use cases, it is not practical for authoring workflows and other applications where larger image dimensions are required.
       - **Compression algorithms:** JPEG XL employs a more complex compression pipeline compared to WebP, leading to better compression ratios versus compression speed at all levels. [link]
       - **Feature support:** JPEG XL offers a wider range of critical modern features like HDR & wide gamut support, 32 bits per channel, progressive decoding, extra channels, and CMYK support, making it more versatile for various applications.
       - **Browser adoption:** WebP currently has wider browser support compared to JPEG XL.
       """},
      {"What is the maximum file size supported by JPEG XL?",
       """
       JPEG XL itself doesn't have a pre-defined maximum file size. There are theoretical limits based on the way the format works, but in practical terms, the maximum size is more likely to be restricted by other factors like software and storage limitations.
       """},
      {"What is the maximum resolution supported by JPEG XL?",
       """
       JPEG XL supports images up to 1,073,741,823 × 1,073,741,823 in resolution, making it suitable for high-resolution images and the most demanding applications.
       """},
      {"What is the compression efficiency of JPEG XL compared to JPEG?",
       """
       JPEG XL achieves an average compression efficiency of 1.3 to 2 times better than JPEG for equivalent quality images. This can vary depending on the type of image.
       """},
      {"Does JPEG XL support various color gamut?",
       """
       Yes, JPEG XL absolutely supports various color gamuts! This is one of its key advantages over traditional JPEGs (and WebP).

       Here’s a breakdown of its capabilities:

       - **Wide Color Gamut Support:** JPEG XL is designed to handle images with a wider color range than the standard sRGB color space. This allows for more accurate representation of colors, especially those seen in high-quality photographs or graphics.
       - **ICC Profiles:** It supports embedding ICC profiles within the image file. These profiles define the specific color space used, ensuring consistent color interpretation across different devices. This is crucial for professional applications where accurate color reproduction is essential.
       - **Flexibility:** JPEG XL is flexible in handling various color depths with support for bit depths up to 32 bits per channel. 
       """},
      {"What is the bit depth supported by JPEG XL?",
       """
       JPEG XL can handle images with 8-bit, 10-bit, 16-bit, or even 32-bits per color channel, significantly enhancing color accuracy and dynamic range. This capability makes it ideal for high-dynamic-range (HDR) and wide color gamut images. Its precision makes JPEG XL suitable not only for web delivery but also for authoring workflows.
       """},
      {"What is the encoding speed of JPEG XL compared to JPEG?",
       """
       While JPEG encoding is generally faster on the surface, the truth is more nuanced.

       - **Configurable Compression:** Just like JPEG has different encoders with varying speed and quality options (like the slower but higher-quality [MozJPEG](https://github.com/mozilla/mozjpeg) compared to [libjpeg-turbo](https://www.libjpeg-turbo.org)), JPEG XL’s `libjxl` lets you fine-tune the balance between speed and compression. It offers settings to prioritize getting the job done quickly, even if it means sacrificing some compression. This can be helpful when you need to encode images quickly, like for real-time applications.
       - **Modern Hardware :** Both JPEG and JPEG XL encoding are very fast on modern hardware, making the speed difference often insignificant.
       - **Multi-Core Support:** Unlike JPEG, JPEG XL excels at utilizing multiple cores, making it potentially faster for encoding and decoding on multi-core CPUs. This means with enough cores, JPEG XL can compress faster than jpeg.
       """},
      {"What is the decoding speed of JPEG XL compared to JPEG?",
       """
       JPEG decoding is faster than JPEG XL decoding, but JPEG XL is designed to be highly parallelizable. Both decode in the blink of an eye. JPEG XL decoding is still under development and is expected to see further optimizations in the future, potentially narrowing any gap.
       """},
      {"What is the error resilience of JPEG XL?",
       """
       JPEG XL includes some error resilience features, in particular it can detect errors in transmission or storage. Like most other compression codecs, it does not have error *correction* features since that requires redundant storage of image data which is inherently contradictory to the goal of improving compression. It is considered a problem best handled at another system layer — e.g. at the level of the transfer protocol or storage medium itself — since the type, amplitude, and likelihood of errors can vary substantially.
       """},
      {"Is metadata supported in JPEG XL?",
       """
       JPEG XL supports metadata standards such as EXIF, XMP, JUMBF, and [JPEG Trust](https://jpeg.org/jpegtrust/) / C2PA, making it suitable for applications requiring metadata management. Moreover it supports (optional) [Brotli compression](https://en.wikipedia.org/wiki/Brotli) of metadata, in contrast to JPEG, for example, which only supports uncompressed metadata.
       """},
      {"What is the support for animated images in JPEG XL?",
       """
       JPEG XL supports animation, image sequences, photo bursts, and multi-pages.
       """},
      {"What is the support for alpha channels in JPEG XL?",
       """
       JPEG XL supports not just alpha channels (it’s even possible to add alpha to existing JPEGs!), but depth maps, thermal channels, spot colors and selection masks. The extra channels can optionally be subsampled. JPEG XL also allows creating layered images, where the layers are blended according to the alpha channel.
       """},
      {"Is Lossless JPEG Transcoding really bit-for-bit accurate?",
       """
       Converting a JPEG to JPEG XL using `cjxl` and then back to JPEG with `djxl` results in a bit-identical copy of the original JPEG image. However, it’s important to note JPEG standard leaves room for some interpretation, leading to potential minor variations between different decoders.
       """},
      {"Do other JPEG XL tools support Lossless JPEG Transcoding?",
       """
       Other encoders may not support lossless transcoding, so it’s best to check any support documention to verify. Note that lossless encoding of a JPEG file to JPEG XL is **not** the same as lossless transcoding. Transcoding uses a specific mode to achieve its 20% size gain while maintaining pixel-level accuracy.
       """},
      {"What are the ongoing developments for JPEG XL?",
       """
       The JPEG XL format is under continuous development, with efforts towards:

       - **Improving encoding/decoding speed:** Although already leading against all other compression formats in compression size vs compression speed, the team aims to further optimize the algorithms to achieve faster processing times for both encoding and decoding.
       - **Improving compression density**: JPEG XL boasts a highly flexible bitstream, opening doors for exciting encoder advancements. This flexibility allows researchers to explore new techniques for optimizing trade-offs between image quality and file size. For lossless compression, it paves the way for further improvements in both file size and compression speed.
       - **Expanding browser support:** Collaborating with browser vendors to ensure broader browser compatibility for JPEG XL images.
       - **Enabling broad software support:** We’re actively working with software vendors to integrate JPEG XL encoding and decoding capabilities into their applications, facilitating wider adoption across various workflows.
       """}
    ]
    |> markdown()
  end
end
