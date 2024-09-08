/* Target elements to display image data */
const elements = {
    imageTitle: document.getElementById("image_Title"),
    JPEGCompare_JPEGImage: document.getElementById("JPEGCompare_JPEGImage"),
    JPEGCompare_JXLImage: document.getElementById("JPEGCompare_JXLImage"),

    JPEGCSize_JPEGSize: document.getElementById("JPEGCSize_JPEGSize"),
    JPEGCSize_JPEGSSIMU2: document.getElementById("JPEGCSize_JPEGSSIMU2"),
    JPEGCSize_JXLSize: document.getElementById("JPEGCSize_JXLSize"),
    JPEGCSize_JXLSSIMU2: document.getElementById("JPEGCSize_JXLSSIMU2"),

    JPEGButter: document.getElementById("JPEGButter"),
    JPEGDSSIM: document.getElementById("JPEGDSSIM"),
    JPEGbpp: document.getElementById("JPEGbpp"),
    JPEGQuality: document.getElementById("JPEGQuality"),

    JXLButter: document.getElementById("JXLButter"),
    JXLDSSIM: document.getElementById("JXLDSSIM"),
    JXLbpp: document.getElementById("JXLbpp"),
    JXLDistance: document.getElementById("JXLDistance"),

    JPEGCQuality_JXLSSIMU2: document.getElementById("JPEGCQuality_JXLSSIMU2"),
    JPEGCQuality_JXLSize: document.getElementById("JPEGCQuality_JXLSize"),
    JPEGCQuality_JPEGSSIMU2: document.getElementById("JPEGCQuality_JPEGSSIMU2"),
    JPEGCQuality_JPEGSize: document.getElementById("JPEGCQuality_JPEGSize"),

    mySizeRange: document.getElementById("mySizeRange"),
    myQualityRange: document.getElementById("myQualityRange"),
    imageDots: document.getElementById("imageDots"),

    tooltipJPEGSSIMU2: document.getElementById("tooltipJPEGSSIMU2"),
    tooltipJXLSSIMU2: document.getElementById("tooltipJXLSSIMU2"),
    tooltipJPEGSize: document.getElementById("tooltipJPEGSize"),
    tooltipJXLSize: document.getElementById("tooltipJXLSize"),
};

let imagesSizeObject = {};
let imagesQualityObject = {};
let imagesSizeArray = [];
let imagesQualityArray = [];
let imageIndex = 0;

/* Image Slider Container */
const container = document.querySelector('.comparison-container');
document.querySelector('.image-slider').addEventListener('input', (e) => {
    container.style.setProperty('--position', `${e.target.value}%`);
});

/* Handle Image Slider - Compare Size */
elements.mySizeRange.addEventListener("change", (e) => {
    displayData(imagesSizeArray, e.target.value, 'JPEGCompareSize');
});

/* Handle Image Slider - Compare Quality */
elements.myQualityRange.addEventListener("change", (e) => {
    displayData(imagesQualityArray, e.target.value, 'JPEGCompareQuality');
});

/* Display Data */
const displayData = (array, scrollValue, type) => {
    if (!array.length) return;
    const initialLoadedImageObject = array[imageIndex];
    if (!initialLoadedImageObject) return;
    const sliderValue = getSliderValue(scrollValue, type);
    const obj_key = Object.keys(initialLoadedImageObject)[0];
    if (!obj_key) return;
    elements.imageTitle.textContent = obj_key;
    const data = initialLoadedImageObject[obj_key][sliderValue];
    if (!data) return;

    elements.JPEGCompare_JPEGImage.src = `ComparisonImages/${data.JPEG_FileName}`;

    // Create picture element for JXL with WebP fallback
    const jxlPath = `ComparisonImages/${data.JXL_FileName}`;
    const webpPath = `${jxlPath}.webp`;

    if (elements.JPEGCompare_JXLImage.tagName !== 'PICTURE') {
        const pictureElement = document.createElement('picture');
        const sourceElement = document.createElement('source');
        sourceElement.srcset = jxlPath;
        sourceElement.type = 'image/jxl';
        pictureElement.appendChild(sourceElement);

        const imgElement = document.createElement('img');
        imgElement.src = webpPath;
        imgElement.alt = obj_key;
        pictureElement.appendChild(imgElement);

        elements.JPEGCompare_JXLImage.parentNode.replaceChild(pictureElement, elements.JPEGCompare_JXLImage);
        elements.JPEGCompare_JXLImage = pictureElement;
    } else {
        const sourceElement = elements.JPEGCompare_JXLImage.querySelector('source');
        sourceElement.srcset = jxlPath;
        sourceElement.type = 'image/jxl';

        const imgElement = elements.JPEGCompare_JXLImage.querySelector('img');
        imgElement.src = webpPath;
        imgElement.alt = obj_key;
    }

    const formatSize = (sizeInBytes) => (sizeInBytes / 1024).toFixed(1);
    const formatSSIMU2 = (score) => parseFloat(score).toFixed(1);
    const formatDSSIM = (value) => value ? (value * 1000).toFixed(2) : 'N/A';
    const format2Decimals = (value) => value ? value.toFixed(2) : 'N/A';
    const format3Decimals = (value) => value ? value.toFixed(3) : 'N/A';
    const formatNoDecimals = (value) => value ? value.toFixed(0) : 'N/A';

    // Update common elements
    elements.JPEGbpp.textContent = format3Decimals(data.JPEG_BBP);
    elements.JPEGButter.textContent = format2Decimals(data.JPEG_Butter);
    elements.JPEGDSSIM.textContent = formatDSSIM(data.JPEG_DSSIM);
    elements.JPEGQuality.textContent = formatNoDecimals(data.JPEG_Quality);

    elements.JXLbpp.textContent = format3Decimals(data.JXL_BBP);
    elements.JXLButter.textContent = format2Decimals(data.JXL_Butter);
    elements.JXLDSSIM.textContent = formatDSSIM(data.JXL_DSSIM);
    elements.JXLDistance.textContent = data.JXL_Distance;

    // Update Tooltip Items that are also used on the main page
    elements.tooltipJPEGSSIMU2.textContent = formatSSIMU2(data.JPEG_SSIMU2);
    elements.tooltipJXLSSIMU2.textContent = formatSSIMU2(data.JXL_SSIMU2);
    elements.tooltipJPEGSize.textContent = formatSize(data.JPEG_Size);
    elements.tooltipJXLSize.textContent = formatSize(data.JXL_Size);

    // Update tab-specific elements
    if (type === 'JPEGCompareSize') {
        elements.JPEGCSize_JPEGSize.textContent = formatSize(data.JPEG_Size);
        elements.JPEGCSize_JPEGSSIMU2.textContent = formatSSIMU2(data.JPEG_SSIMU2);
        elements.JPEGCSize_JXLSize.textContent = formatSize(data.JXL_Size);
        elements.JPEGCSize_JXLSSIMU2.textContent = formatSSIMU2(data.JXL_SSIMU2);
    } else {
        elements.JPEGCQuality_JPEGSize.textContent = formatSize(data.JPEG_Size);
        elements.JPEGCQuality_JPEGSSIMU2.textContent = formatSSIMU2(data.JPEG_SSIMU2);
        elements.JPEGCQuality_JXLSize.textContent = formatSize(data.JXL_Size);
        elements.JPEGCQuality_JXLSSIMU2.textContent = formatSSIMU2(data.JXL_SSIMU2);
    }

    updateDots();
    updateTooltipSliders(data);
};

/* Get Slider Value */
const getSliderValue = (scrollValue, type) => {
    const qualityMap = { "0": "ML", "25": "M", "50": "MH", "75": "H" };
    const sizeMap = { "0": "S", "25": "M", "50": "L", "75": "XL" };
    return type === 'JPEGCompareSize' ? qualityMap[scrollValue] : sizeMap[scrollValue];
};

function createDots(count) {
    elements.imageDots.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        dot.addEventListener('click', () => {
            imageIndex = i;
            updateDots();
            displayData(imagesQualityArray, elements.myQualityRange.value, 'JPEGCompareQuality');
            displayData(imagesSizeArray, elements.mySizeRange.value, 'JPEGCompareSize');
        });
        elements.imageDots.appendChild(dot);
    }
    updateDots();
}

function updateDots() {
    const dots = elements.imageDots.children;
    for (let i = 0; i < dots.length; i++) {
        dots[i].classList.toggle('active', i === imageIndex);
    }
}

/* Load Data */
const loadData = (data, type) => {
    const obj = type === 'JPEGCompareSize' ? imagesSizeObject : imagesQualityObject;
    const array = type === 'JPEGCompareSize' ? imagesSizeArray : imagesQualityArray;
    const key = type === 'JPEGCompareSize' ? 'Quality' : 'Size';

    data.forEach(item => {
        const title = item.Title;
        const value = item[key];
        if (!obj[title]) {
            obj[title] = type === 'JPEGCompareSize' ? { "H": {}, "MH": {}, "M": {}, "ML": {} } : { "XL": {}, "L": {}, "M": {}, "S": {} };
            array.push({ [title]: obj[title] });
        }
        obj[title][value] = item;
    });
    if (type === 'JPEGCompareSize') {
        createDots(array.length);
    }

    // Initialize data display after loading
    if (array.length > 0) {
        const initialSliderValue = type === 'JPEGCompareSize' ? elements.mySizeRange.value : elements.myQualityRange.value;
        displayData(array, initialSliderValue, type);
    }
};

/* Fetch Image Data */

async function getImageData(url, type) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Response status: ${response.status}`);
        const data = await response.json();
        loadData(data, type);
    } catch (error) {
        console.error(error.message);
    }
}
// async function getImageData(url, type) {
//     try {
//         const response = await fetch(url);
//         if (!response.ok) throw new Error(`Response status: ${response.status}`);
//         const data = await response.json();
//         loadData(data, type);
//         const array = type === 'JPEGCompareSize' ? imagesSizeArray : imagesQualityArray;
//         const rangeElement = type === 'JPEGCompareSize' ? elements.mySizeRange : elements.myQualityRange;
//         displayData(array, rangeElement.value, type);
//     } catch (error) {
//         console.error(error.message);
//     }
// }

/* Setup Tabs */
function setupTabs() {
    document.querySelectorAll(".tabs__button").forEach(button => {
        button.addEventListener("click", () => {
            const sideBar = button.parentElement;
            const tabsContainer = sideBar.parentElement;
            const tabNumber = button.dataset.forTab;
            const tabToActivate = tabsContainer.querySelector(`.tabs__content[data-tab="${tabNumber}"]`);

            sideBar.querySelectorAll(".tabs__button").forEach(btn => btn.classList.remove("tabs__button-active"));
            button.classList.add("tabs__button-active");

            tabsContainer.querySelectorAll(".tabs__content").forEach(tab => tab.classList.remove("tabs__content-active"));
            tabToActivate.classList.add("tabs__content-active");

            // Update data when switching tabs
            if (tabNumber === "1") {
                displayData(imagesSizeArray, elements.mySizeRange.value, 'JPEGCompareSize');
            } else {
                displayData(imagesQualityArray, elements.myQualityRange.value, 'JPEGCompareQuality');
            }
        });
    });
}


function updateTooltipSliders(data) {
    // Helper function to update slider and text
    const updateSliderAndText = (sliderId, textId, value) => {
        const slider = document.querySelector(sliderId);
        const text = document.getElementById(textId);
        if (slider && text) {
            slider.value = value;
            text.textContent = value;
        }
    };

    // Update JPEG sliders and text
    updateSliderAndText("#tooltip_JPEGSSIMU2 .ssim-label-slider input", "tooltipJPEGSSIMU2", data.JPEG_SSIMU2.toFixed(1));
    updateSliderAndText("#tooltip_JPEGButter .butter-label-slider .scale input", "JPEGButter", data.JPEG_Butter.toFixed(2));
    updateSliderAndText("#tooltip_JPEGDSSIM .dssim-label-slider .scale input", "JPEGDSSIM", (data.JPEG_DSSIM * 1000).toFixed(2));

    // Update JXL sliders and text
    updateSliderAndText("#tooltip_JXLSSIMU2 .ssim-label-slider input", "tooltipJXLSSIMU2", data.JXL_SSIMU2.toFixed(1));
    updateSliderAndText("#tooltip_JXLButter .butter-label-slider .scale input", "JXLButter", data.JXL_Butter.toFixed(2));
    updateSliderAndText("#tooltip_JXLDSSIM .dssim-label-slider .scale input", "JXLDSSIM", (data.JXL_DSSIM * 1000).toFixed(2));

    // Update JPEG and JXL info that don't have sliders
    document.getElementById("JPEGQuality").textContent = data.JPEG_Quality;
    document.getElementById("tooltipJPEGSize").textContent = (data.JPEG_Size / 1024).toFixed(1);
    document.getElementById("JPEGbpp").textContent = data.JPEG_BBP.toFixed(3);
    document.getElementById("JXLDistance").textContent = data.JXL_Distance;
    document.getElementById("tooltipJXLSize").textContent = (data.JXL_Size / 1024).toFixed(1);
    document.getElementById("JXLbpp").textContent = data.JXL_BBP.toFixed(3);
}

document.addEventListener("DOMContentLoaded", () => {
    Promise.all([
        getImageData("JPEG_CompareSizeSameQuality.json", 'JPEGCompareSize'),
        getImageData("JPEG_CompareQualitySameSize.json", 'JPEGCompareQuality')
    ]).then(() => {
        // After both data sets are loaded, initialize the display
        const initialSizeSliderValue = elements.mySizeRange.value;
        // const initialQualitySliderValue = elements.myQualityRange.value;

        displayData(imagesSizeArray, initialSizeSliderValue, 'JPEGCompareSize');
        // displayData(imagesQualityArray, initialQualitySliderValue, 'JPEGCompareQuality');
        // Ensure the first tab is active
        document.querySelector('.tabs__button[data-for-tab="1"]').classList.add('tabs__button-active');
        document.querySelector('.tabs__content[data-tab="1"]').classList.add('tabs__content-active');

    });
    setupTabs();

    // Initial data display
    elements.mySizeRange.addEventListener("input", (e) => {
        displayData(imagesSizeArray, e.target.value, 'JPEGCompareSize');
    });

    elements.myQualityRange.addEventListener("input", (e) => {
        displayData(imagesQualityArray, e.target.value, 'JPEGCompareQuality');
    });
});