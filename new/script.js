document.addEventListener('DOMContentLoaded', function () {
    function loadImagesData(section, offset) {
        const imagesDataPath = section.dataset.json;
        const imagesFolder = section.dataset.folder;
        let imagesData = [];
        let currentIndex = 0;
        let interval;

        fetch(imagesDataPath)
            .then(response => response.json())
            .then(data => {
                imagesData = data;
                preloadImages(imagesData, imagesFolder, () => {
                    initializeDots(section);
                    showImages(currentIndex, section, imagesData, imagesFolder);
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
                    currentIndex = index;
                    showImages(currentIndex, section, imagesData, imagesFolder);
                    resetAutoChange(section, imagesData, imagesFolder, offset);
                });
                dotsContainer.appendChild(dot);
            });
            updateDots(section, currentIndex);
        }

        function showImages(index, section, imagesData, imagesFolder) {
            const uniqueTitles = [...new Set(imagesData.map(image => image.Title))];
            const jpegImage = imagesData.find(image => image.Title === uniqueTitles[index] && image.Type === "JPEG");
            const jxlImage = imagesData.find(image => image.Title === uniqueTitles[index] && image.Type === "JXL");

            if (jpegImage && jxlImage) {
                const jpegElement = section.querySelector('.jpeg-image');
                const jxlPicture = section.querySelector('.jxl-image');

                const jpegFileSizeKB = (jpegImage["File Size"] / 1024).toFixed(1);
                const jxlFileSizeKB = (jxlImage["File Size"] / 1024).toFixed(1);

                jpegElement.src = `./${imagesFolder}/${jpegImage.FileName}`;
                setFileSize(section.querySelector('.jpeg-file-size'), jpegFileSizeKB);
                section.querySelector('.jpeg-bpp').textContent = `BPP: ${jpegImage["BPP"].toFixed(2)}`;

                jxlPicture.innerHTML = `
                    <source srcset="./${imagesFolder}/${jxlImage.FileName}" type="image/jxl">
                    <img src="./${imagesFolder}/${jxlImage.FallbackFile || jpegImage.FileName}" alt="${jxlImage.Title}">
                `;
                setFileSize(section.querySelector('.jxl-file-size'), jxlFileSizeKB);
                section.querySelector('.jxl-bpp').textContent = `BPP: ${jxlImage["BPP"].toFixed(2)}`;
                section.querySelector('.size-reduction').textContent = jxlImage.Smaller ? `${jxlImage.Smaller} Smaller` : '';
            }

            updateDots(section, index);
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
                currentIndex = (currentIndex + 1) % (imagesData.length / 2); // Each pair of images (JPEG and JXL) has the same title
                showImages(currentIndex, section, imagesData, imagesFolder);
            }, 6000 + offset);
        }

        function resetAutoChange(section, imagesData, imagesFolder, offset) {
            clearInterval(interval);
            startAutoChange(section, imagesData, imagesFolder, offset);
        }
    }

    const sections = document.querySelectorAll('section');
    sections.forEach((section, index) => {
        // Check if the section has the necessary data attributes
        if (section.dataset.json && section.dataset.folder) {
            loadImagesData(section, index * 3000); // 3 second offset
        }
    });
});
