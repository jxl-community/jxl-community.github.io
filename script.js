document.addEventListener('DOMContentLoaded', function () {
    function loadImagesData(section, offset) {
        const imagesDataPath = section.dataset.json;
        const imagesFolder = section.dataset.folder;
        let imagesData = [];
        let currentIndex = 0;
        let interval;
        let isTransitioning = false;

        fetch(imagesDataPath)
            .then(response => response.json())
            .then(data => {
                imagesData = data;
                preloadImages(imagesData, imagesFolder, () => {
                    initializeDots(section);
                    showImages(currentIndex, section, imagesData, imagesFolder, false);
                    startAutoChange(section, imagesData, imagesFolder, offset);
                });
            })
            .catch(error => console.error('Error fetching data:', error));

        function preloadImages(imagesData, imagesFolder, callback) {
            let loadedCount = 0;
            const totalImages = imagesData.length;

            imagesData.forEach(image => {
                const img = new Image();
                img.src = `./${imagesFolder}/${image.FileName}`;
                if (image.FallbackFile) {
                    const fallback = new Image();
                    fallback.src = `./${imagesFolder}/${image.FallbackFile}`;
                }
                img.onload = img.onerror = () => {
                    loadedCount++;
                    if (loadedCount === totalImages) {
                        callback();
                    }
                };
            });
        }

        function initializeDots(section) {
            const dotsContainer = section.querySelector('.dots');
            const uniqueTitles = [...new Set(imagesData.map(image => image.Title))];
            uniqueTitles.forEach((title, index) => {
                const dot = document.createElement('span');
                dot.classList.add('dot');
                dot.addEventListener('click', () => {
                    if (isTransitioning) return;
                    currentIndex = index;
                    showImages(currentIndex, section, imagesData, imagesFolder, true);
                    resetAutoChange(section, imagesData, imagesFolder, offset);
                });
                dotsContainer.appendChild(dot);
            });
            updateDots(section, currentIndex);
        }

        function showImages(index, section, imagesData, imagesFolder, animate) {
            const uniqueTitles = [...new Set(imagesData.map(image => image.Title))];
            const jpegImage = imagesData.find(image => image.Title === uniqueTitles[index] && image.Type === "JPEG");
            const jxlImage = imagesData.find(image => image.Title === uniqueTitles[index] && image.Type === "JXL");

            if (!jpegImage || !jxlImage) return;

            const jpegElement = section.querySelector('.jpeg-image');
            const jxlPicture = section.querySelector('.jxl-image');

            const jpegFileSizeKB = (jpegImage["File Size"] / 1024).toFixed(1);
            const jxlFileSizeKB = (jxlImage["File Size"] / 1024).toFixed(1);

            if (!animate) {
                jpegElement.src = `./${imagesFolder}/${jpegImage.FileName}`;
                jpegElement.alt = jpegImage.Title;
                updatePicture(jxlPicture, imagesFolder, jxlImage, jpegImage);
                updateMetadata(section, jpegImage, jxlImage, jpegFileSizeKB, jxlFileSizeKB);
                updateDots(section, index);
                return;
            }

            // Crossfade: fade out, swap while hidden, fade in
            isTransitioning = true;
            jpegElement.classList.add('fade');
            jxlPicture.classList.add('fade');

            setTimeout(() => {
                jpegElement.src = `./${imagesFolder}/${jpegImage.FileName}`;
                jpegElement.alt = jpegImage.Title;
                updatePicture(jxlPicture, imagesFolder, jxlImage, jpegImage);
                updateMetadata(section, jpegImage, jxlImage, jpegFileSizeKB, jxlFileSizeKB);

                requestAnimationFrame(() => {
                    jpegElement.classList.remove('fade');
                    jxlPicture.classList.remove('fade');
                    setTimeout(() => {
                        isTransitioning = false;
                    }, 600);
                });
            }, 600);

            updateDots(section, index);
        }

        function updatePicture(pictureEl, folder, jxlImage, jpegImage) {
            let source = pictureEl.querySelector('source');
            let img = pictureEl.querySelector('img');

            if (!source) {
                source = document.createElement('source');
                source.type = 'image/jxl';
                pictureEl.prepend(source);
            }
            if (!img) {
                img = document.createElement('img');
                pictureEl.append(img);
            }

            source.srcset = `./${folder}/${jxlImage.FileName}`;
            img.src = `./${folder}/${jxlImage.FallbackFile || jpegImage.FileName}`;
            img.alt = jxlImage.Title;
        }

        function updateMetadata(section, jpegImage, jxlImage, jpegSizeKB, jxlSizeKB) {
            setFileSize(section.querySelector('.jpeg-file-size'), jpegSizeKB);
            section.querySelector('.jpeg-bpp').textContent = `BPP: ${jpegImage["BPP"].toFixed(2)}`;
            setFileSize(section.querySelector('.jxl-file-size'), jxlSizeKB);
            section.querySelector('.jxl-bpp').textContent = `BPP: ${jxlImage["BPP"].toFixed(2)}`;
            section.querySelector('.size-reduction').textContent = jxlImage.Smaller ? `${jxlImage.Smaller} Smaller` : '';
        }

        function setFileSize(element, sizeKB) {
            element.innerHTML = `${sizeKB} <span class="headline-s-semibold white add-padding-bottom">KB</span>`;
        }

        function updateDots(section, index) {
            const dots = section.querySelectorAll('.dot');
            dots.forEach((dot, dotIndex) => {
                dot.classList.toggle('active', dotIndex === index);
            });
        }

        function startAutoChange(section, imagesData, imagesFolder, offset) {
            interval = setInterval(() => {
                if (isTransitioning) return;
                currentIndex = (currentIndex + 1) % (imagesData.length / 2);
                showImages(currentIndex, section, imagesData, imagesFolder, true);
            }, 6000 + offset);
        }

        function resetAutoChange(section, imagesData, imagesFolder, offset) {
            clearInterval(interval);
            startAutoChange(section, imagesData, imagesFolder, offset);
        }
    }

    const sections = document.querySelectorAll('section');
    sections.forEach((section, index) => {
        if (section.dataset.json && section.dataset.folder) {
            loadImagesData(section, index * 3000);
        }
    });
});
