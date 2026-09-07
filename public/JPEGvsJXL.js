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
const comparisonSlider = document.querySelector('.image-slider');
comparisonSlider.addEventListener('input', (e) => {
    container.style.setProperty('--position', `${e.target.value}%`);
});
setupComparisonZoomPan({
    container,
    comparisonSlider,
    zoomSlider: document.getElementById('jpeg-comparison-zoom'),
    zoomValue: document.getElementById('jpeg-comparison-zoom-value'),
});

/* Handle Image Slider - Compare Size */
elements.mySizeRange.addEventListener("change", (e) => {
    displayData(imagesSizeArray, e.target.value, 'JPEGCompareSize');
});

/* Handle Image Slider - Compare Quality */
elements.myQualityRange.addEventListener("change", (e) => {
    console.log("Quality range changed:", e.target.value);
    displayData(imagesQualityArray, e.target.value, 'JPEGCompareQuality');
});

/* Display Data */
const displayData = (array, scrollValue, type) => {
    console.log("displayData called:", {array, scrollValue, type});
    if (!array.length) return;
    const initialLoadedImageObject = array[imageIndex];
    if (!initialLoadedImageObject) return;
    const sliderValue = getSliderValue(scrollValue, type);
    const obj_key = Object.keys(initialLoadedImageObject)[0];
    if (!obj_key) return;
    elements.imageTitle.textContent = obj_key;
    const data = initialLoadedImageObject[obj_key][sliderValue];
    if (!data) return;
    const imageFolder = type === 'JPEGCompareSize'
        ? 'ComparisonImages/JPEG_CompareSizeSameQuality'
        : 'ComparisonImages/JPEG_CompareQualitySameSize';
    elements.JPEGCompare_JPEGImage.src = `${imageFolder}/${data.JPEG_FileName}`;

    const jxlPath = `${imageFolder}/${data.JXL_FileName}`;
    const sourceElement = elements.JPEGCompare_JXLImage.querySelector('source');
    sourceElement.srcset = jxlPath;
    sourceElement.type = 'image/jxl';
    const imgElement = elements.JPEGCompare_JXLImage.querySelector('img');
    imgElement.src = jxlPath;
    imgElement.alt = obj_key;
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
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.classList.add('dot');
        const title = Object.keys(imagesSizeArray[i])[0];
        dot.setAttribute('aria-label', `Show image ${i + 1} of ${count}: ${title}`);
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
        dots[i].setAttribute('aria-pressed', String(i === imageIndex));
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

    console.log("imagesQualityArray:", imagesQualityArray);
};
/* Fetch Image Data */
async function getImageData(url, type) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Response status: ${response.status}`);
        const data = await response.json();
        console.log("Fetched data:", {type, data});
        loadData(data, type);
    } catch (error) {
        console.error(error.message);
    }
}

/* Setup Tabs */
function setupTabs() {
    const tabsContainer = document.querySelector(".jpeg-jxl-tabs");
    tabsContainer.querySelectorAll(".tabs__button").forEach(button => {
      button.addEventListener("click", () => {
        console.log("Tab clicked:", button.dataset.forTab);
        const sideBar = button.parentElement;
        const tabId = button.dataset.forTab;
        const tabToActivate = tabsContainer.querySelector(`.tabs__content[data-tab="${tabId}"]`);
  
        sideBar.querySelectorAll(".tabs__button").forEach(btn => btn.classList.remove("tabs__button-active"));
        button.classList.add("tabs__button-active");
  
        tabsContainer.querySelectorAll(".tabs__content").forEach(tab => tab.classList.remove("tabs__content-active"));
        tabToActivate.classList.add("tabs__content-active");
  
        // Update data when switching tabs
        if (tabId === "jpeg-size") {
          displayData(imagesSizeArray, elements.mySizeRange.value, 'JPEGCompareSize');
        } else {
          displayData(imagesQualityArray, elements.myQualityRange.value, 'JPEGCompareQuality');
        }
      });
    });
  }
function setupComparisonZoomPan({ container, comparisonSlider, zoomSlider, zoomValue }) {
    let currentZoom = 1;
    let panX = 0;
    let panY = 0;
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;
    let panOriginX = 0;
    let panOriginY = 0;

    zoomSlider.addEventListener('input', () => {
        currentZoom = parseFloat(zoomSlider.value);
        zoomValue.textContent = formatZoomValue(currentZoom);
        if (currentZoom === 1) {
            panX = 0;
            panY = 0;
        }
        clampPan();
        applyZoomPan();
    });

    container.addEventListener('pointerdown', (event) => {
        if (currentZoom === 1 || isNearComparisonDivider(event)) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        isPanning = true;
        panStartX = event.clientX;
        panStartY = event.clientY;
        panOriginX = panX;
        panOriginY = panY;
        container.setPointerCapture(event.pointerId);
        container.classList.add('is-panning');
    }, true);
    container.addEventListener('dragstart', (event) => {
        event.preventDefault();
    });

    container.addEventListener('pointermove', (event) => {
        if (!isPanning) {
            return;
        }
        event.preventDefault();
        panX = panOriginX + event.clientX - panStartX;
        panY = panOriginY + event.clientY - panStartY;
        clampPan();
        applyZoomPan();
    });

    container.addEventListener('pointerup', endPan);
    container.addEventListener('pointercancel', endPan);
    container.addEventListener('lostpointercapture', endPan);

    function endPan(event) {
        if (!isPanning) {
            return;
        }
        isPanning = false;
        if (event.pointerId !== undefined && container.hasPointerCapture(event.pointerId)) {
            container.releasePointerCapture(event.pointerId);
        }
        container.classList.remove('is-panning');
    }

    function isNearComparisonDivider(event) {
        const rect = container.getBoundingClientRect();
        const position = parseFloat(comparisonSlider.value) / 100;
        const dividerX = rect.left + rect.width * position;
        return Math.abs(event.clientX - dividerX) <= 120;
    }

    function clampPan() {
        const rect = container.getBoundingClientRect();
        const maxX = (rect.width * (currentZoom - 1)) / 2;
        const maxY = (rect.height * (currentZoom - 1)) / 2;
        panX = Math.max(-maxX, Math.min(maxX, panX));
        panY = Math.max(-maxY, Math.min(maxY, panY));
    }

    function applyZoomPan() {
        container.style.setProperty('--comparison-zoom', currentZoom);
        container.style.setProperty('--comparison-pan-x', `${panX}px`);
        container.style.setProperty('--comparison-pan-y', `${panY}px`);
        container.classList.toggle('is-zoomed', currentZoom > 1);
    }

    function formatZoomValue(zoom) {
        return `${Number.isInteger(zoom) ? zoom : zoom.toFixed(1)}×`;
    }
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
        const initialQualitySliderValue = elements.myQualityRange.value;
    //    displayData(imagesSizeArray, initialSizeSliderValue, 'JPEGCompareSize');
        displayData(imagesQualityArray, initialQualitySliderValue, 'JPEGCompareQuality');

        // Ensure the initial tab is active
        const jpegTabs = document.querySelector('.jpeg-jxl-tabs');
        jpegTabs.querySelector('.tabs__button[data-for-tab="jpeg-quality"]').classList.add('tabs__button-active');
        jpegTabs.querySelector('.tabs__content[data-tab="jpeg-quality"]').classList.add('tabs__content-active');
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
