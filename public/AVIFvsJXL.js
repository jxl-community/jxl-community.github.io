/* Target elementsAVIF to display image data */
const elementsAVIF = {
    imageTitleAVIF: document.getElementById("image_Title_AVIF"),
    AVIFCompare_AVIFImage: document.getElementById("AVIFCompare_AVIFImage"),
    AVIFCompare_JXLImage: document.getElementById("AVIFCompare_JXLImage"),

    AVIFCSize_AVIFSize: document.getElementById("AVIFCSize_AVIFSize"),
    AVIFCSize_AVIFSSIMU2: document.getElementById("AVIFCSize_AVIFSSIMU2"),
    AVIFCSize_JXLSize: document.getElementById("AVIFCSize_JXLSize"),
    AVIFCSize_JXLSSIMU2: document.getElementById("AVIFCSize_JXLSSIMU2"),

    AVIFButter: document.getElementById("AVIFButter"),
    AVIFDSSIM: document.getElementById("AVIFDSSIM"),
    AVIFbpp: document.getElementById("AVIFbpp"),
    AVIFQuality: document.getElementById("AVIFQuality"),

    JXLButter: document.getElementById("JXLButter_AVIF"),
    JXLDSSIM: document.getElementById("JXLDSSIM_AVIF"),
    JXLbpp: document.getElementById("JXLbpp_AVIF"),
    JXLDistance: document.getElementById("JXLDistance_AVIF"),

    AVIFCQuality_JXLSSIMU2: document.getElementById("AVIFCQuality_JXLSSIMU2"),
    AVIFCQuality_JXLSize: document.getElementById("AVIFCQuality_JXLSize"),
    AVIFCQuality_AVIFSSIMU2: document.getElementById("AVIFCQuality_AVIFSSIMU2"),
    AVIFCQuality_AVIFSize: document.getElementById("AVIFCQuality_AVIFSize"),

    mySizeRange_AVIF: document.getElementById("mySizeRange_AVIF"),
    myQualityRange_AVIF: document.getElementById("myQualityRange_AVIF"),
    imageDots_AVIF: document.getElementById("imageDots_AVIF"),

    tooltipAVIFSSIMU2: document.getElementById("tooltipAVIFSSIMU2"),
    tooltipJXLSSIMU2_AVIF: document.getElementById("tooltipJXLSSIMU2_AVIF"),
    tooltipAVIFSize: document.getElementById("tooltipAVIFSize"),
    tooltipJXLSize_AVIF: document.getElementById("tooltipJXLSize_AVIF"),
};

let imagesSizeObjectAVIF = {};
let imagesQualityObjectAVIF = {};
let imagesSizeArrayAVIF = [];
let imagesQualityArrayAVIF = [];
let imageIndexAVIF = 0;

/* Image Slider Container */
const containerAVIF = document.querySelector('.comparison-container-avif');
const comparisonSliderAVIF = document.querySelector('.image-slider-avif');
comparisonSliderAVIF.addEventListener('input', (e) => {
    containerAVIF.style.setProperty('--position', `${e.target.value}%`);
});
setupComparisonZoomPanAVIF({
    container: containerAVIF,
    comparisonSlider: comparisonSliderAVIF,
    zoomSlider: document.getElementById('avif-comparison-zoom'),
    zoomValue: document.getElementById('avif-comparison-zoom-value'),
});

/* Handle Image Slider - Compare Size */
elementsAVIF.mySizeRange_AVIF.addEventListener("change", (e) => {
    displayDataAVIF(imagesSizeArrayAVIF, e.target.value, 'AVIFCompareSize');
});

/* Handle Image Slider - Compare Quality */
elementsAVIF.myQualityRange_AVIF.addEventListener("change", (e) => {
    displayDataAVIF(imagesQualityArrayAVIF, e.target.value, 'AVIFCompareQuality');
});

/* Display Data */
const displayDataAVIF = (array, scrollValue, type) => {
    if (!array.length) return;
    const initialLoadedImageObjectAVIF = array[imageIndexAVIF];
    if (!initialLoadedImageObjectAVIF) return;
    const sliderValue = getSliderValueAVIF(scrollValue, type);
    const obj_key = Object.keys(initialLoadedImageObjectAVIF)[0];
    if (!obj_key) return;
    elementsAVIF.imageTitleAVIF.textContent = obj_key;
    const data = initialLoadedImageObjectAVIF[obj_key][sliderValue];
    if (!data) return;
    const imageFolderAVIF = type === 'AVIFCompareSize'
        ? 'ComparisonImages/AVIF_CompareSizeSameQuality'
        : 'ComparisonImages/AVIF_CompareQualitySameSize';
    elementsAVIF.AVIFCompare_AVIFImage.src = `${imageFolderAVIF}/${data.AVIF_FileName}`;

    const jxlPath = `${imageFolderAVIF}/${data.JXL_FileName}`;
    const sourceElement = elementsAVIF.AVIFCompare_JXLImage.querySelector('source');
    sourceElement.srcset = jxlPath;
    sourceElement.type = 'image/jxl';
    const imgElement = elementsAVIF.AVIFCompare_JXLImage.querySelector('img');
    imgElement.src = jxlPath;
    imgElement.alt = obj_key;
    const formatSizeAVIF = (sizeInBytes) => (sizeInBytes / 1024).toFixed(1);
    const formatSSIMU2AVIF = (score) => parseFloat(score).toFixed(1);
    const formatDSSIMAVIF = (value) => value ? (value * 1000).toFixed(2) : 'N/A';
    const format2DecimalsAVIF = (value) => value ? value.toFixed(2) : 'N/A';
    const format3DecimalsAVIF = (value) => value ? value.toFixed(3) : 'N/A';
    const formatNoDecimalsAVIF = (value) => value ? value.toFixed(0) : 'N/A';

    // Update common elementsAVIF
    elementsAVIF.AVIFbpp.textContent = format3DecimalsAVIF(data.AVIF_BBP);
    elementsAVIF.AVIFButter.textContent = format2DecimalsAVIF(data.AVIF_Butter);
    elementsAVIF.AVIFDSSIM.textContent = formatDSSIMAVIF(data.AVIF_DSSIM);
    elementsAVIF.AVIFQuality.textContent = formatNoDecimalsAVIF(data.AVIF_Quality);

    elementsAVIF.JXLbpp.textContent = format3DecimalsAVIF(data.JXL_BBP);
    elementsAVIF.JXLButter.textContent = format2DecimalsAVIF(data.JXL_Butter);
    elementsAVIF.JXLDSSIM.textContent = formatDSSIMAVIF(data.JXL_DSSIM);
    elementsAVIF.JXLDistance.textContent = data.JXL_Distance;

    // Update Tooltip Items that are also used on the main page
    elementsAVIF.tooltipAVIFSSIMU2.textContent = formatSSIMU2AVIF(data.AVIF_SSIMU2);
    elementsAVIF.tooltipJXLSSIMU2_AVIF.textContent = formatSSIMU2AVIF(data.JXL_SSIMU2);
    elementsAVIF.tooltipAVIFSize.textContent = formatSizeAVIF(data.AVIF_Size);
    elementsAVIF.tooltipJXLSize_AVIF.textContent = formatSizeAVIF(data.JXL_Size);

    // Update tab-specific elementsAVIF
    if (type === 'AVIFCompareSize') {
        elementsAVIF.AVIFCSize_AVIFSize.textContent = formatSizeAVIF(data.AVIF_Size);
        elementsAVIF.AVIFCSize_AVIFSSIMU2.textContent = formatSSIMU2AVIF(data.AVIF_SSIMU2);
        elementsAVIF.AVIFCSize_JXLSize.textContent = formatSizeAVIF(data.JXL_Size);
        elementsAVIF.AVIFCSize_JXLSSIMU2.textContent = formatSSIMU2AVIF(data.JXL_SSIMU2);
    } else {
        elementsAVIF.AVIFCQuality_AVIFSize.textContent = formatSizeAVIF(data.AVIF_Size);
        elementsAVIF.AVIFCQuality_AVIFSSIMU2.textContent = formatSSIMU2AVIF(data.AVIF_SSIMU2);
        elementsAVIF.AVIFCQuality_JXLSize.textContent = formatSizeAVIF(data.JXL_Size);
        elementsAVIF.AVIFCQuality_JXLSSIMU2.textContent = formatSSIMU2AVIF(data.JXL_SSIMU2);
    }

    updateDotsAVIF();
    updateTooltipSlidersAVIF(data);
};

/* Get Slider Value */
const getSliderValueAVIF = (scrollValue, type) => {
    const qualityMap = { "0": "Medium", "25": "Med-High", "50": "High", "75": "Very High", "100": "Lossless" };
    const sizeMap = { "0": "S", "25": "M", "50": "L", "75": "XL", "100": "XX-Large" };
    return type === 'AVIFCompareSize' ? qualityMap[scrollValue] : sizeMap[scrollValue];
};

function createDotsAVIF(count) {
    elementsAVIF.imageDots_AVIF.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.classList.add('dot');
        const title = Object.keys(imagesSizeArrayAVIF[i])[0];
        dot.setAttribute('aria-label', `Show image ${i + 1} of ${count}: ${title}`);
        dot.addEventListener('click', () => {
            imageIndexAVIF = i;
            updateDotsAVIF();
            displayDataAVIF(imagesQualityArrayAVIF, elementsAVIF.myQualityRange_AVIF.value, 'AVIFCompareQuality');
            displayDataAVIF(imagesSizeArrayAVIF, elementsAVIF.mySizeRange_AVIF.value, 'AVIFCompareSize');
        });
        elementsAVIF.imageDots_AVIF.appendChild(dot);
    }
    updateDotsAVIF();
}

function updateDotsAVIF() {
    const dots = elementsAVIF.imageDots_AVIF.children;
    for (let i = 0; i < dots.length; i++) {
        dots[i].classList.toggle('active', i === imageIndexAVIF);
        dots[i].setAttribute('aria-pressed', String(i === imageIndexAVIF));
    }
}

/* Load Data */
const loadDataAVIF = (data, type) => {
    const objAVIF = type === 'AVIFCompareSize' ? imagesSizeObjectAVIF : imagesQualityObjectAVIF;
    const arrayAVIF = type === 'AVIFCompareSize' ? imagesSizeArrayAVIF : imagesQualityArrayAVIF;
    const keyAVIF = type === 'AVIFCompareSize' ? 'Quality' : 'Size';

    data.forEach(item => {
        const title = item.Title;
        const value = item[keyAVIF];
        if (!objAVIF[title]) {
            objAVIF[title] = type === 'AVIFCompareSize'
                ? { "Lossless": {}, "Very High": {}, "High": {}, "Med-High": {}, "Medium": {} }
                : { "XX-Large": {}, "XL": {}, "L": {}, "M": {}, "S": {} };
            arrayAVIF.push({ [title]: objAVIF[title] });
        }
        objAVIF[title][value] = item;
    });
    if (type === 'AVIFCompareSize') {
        createDotsAVIF(arrayAVIF.length);
    }

    // Initialize data display after loading
    if (arrayAVIF.length > 0) {
        const initialSliderValueAVIF = type === 'AVIFCompareSize' ? elementsAVIF.mySizeRange_AVIF.value : elementsAVIF.myQualityRange_AVIF.value;
        displayDataAVIF(arrayAVIF, initialSliderValueAVIF, type);
    }
};

/* Fetch Image Data */
async function getImageDataAVIF(url, type) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Response status: ${response.status}`);
        const data = await response.json();
        loadDataAVIF(data, type);
    } catch (error) {
        console.error(error.message);
    }
}

/* Setup Tabs */
function setupAvifVsJXLTabs() {
    const tabsContainerAVIF = document.querySelector(".avif-jxl-tabs");
    tabsContainerAVIF.querySelectorAll(".tabs__button_avif").forEach(button => {
      button.addEventListener("click", () => {
        const sideBarAVIF = button.parentElement;
        const tabIdAVIF = button.dataset.forTab;
        const tabToActivateAVIF = tabsContainerAVIF.querySelector(`.tabs__content_avif[data-tab="${tabIdAVIF}"]`);
  
        sideBarAVIF.querySelectorAll(".tabs__button_avif").forEach(btn => btn.classList.remove("tabs__button_avif-active"));
        button.classList.add("tabs__button_avif-active");
  
        tabsContainerAVIF.querySelectorAll(".tabs__content_avif").forEach(tab => tab.classList.remove("tabs__content_avif-active"));
        tabToActivateAVIF.classList.add("tabs__content_avif-active");
  
        // Update data when switching tabs
        if (tabIdAVIF === "avif-size") {
          displayDataAVIF(imagesSizeArrayAVIF, elementsAVIF.mySizeRange_AVIF.value, 'AVIFCompareSize');
        } else {
          displayDataAVIF(imagesQualityArrayAVIF, elementsAVIF.myQualityRange_AVIF.value, 'AVIFCompareQuality');
        }
      });
    });
  }

function setupComparisonZoomPanAVIF({ container, comparisonSlider, zoomSlider, zoomValue }) {
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

function updateTooltipSlidersAVIF(data) {
    // Helper function to update slider and text
    const updateSliderAndTextAVIF = (sliderId, textId, value) => {
        const slider = document.querySelector(sliderId);
        const text = document.getElementById(textId);
        if (slider && text) {
            slider.value = value;
            text.textContent = value;
        }
    };

    // Update AVIF sliders and text
    updateSliderAndTextAVIF("#tooltip_AVIFSSIMU2 .ssim-label-slider input", "tooltipAVIFSSIMU2", data.AVIF_SSIMU2.toFixed(1));
    updateSliderAndTextAVIF("#tooltip_AVIFButter .butter-label-slider .scale input", "AVIFButter", data.AVIF_Butter.toFixed(2));
    updateSliderAndTextAVIF("#tooltip_AVIFDSSIM .dssim-label-slider .scale input", "AVIFDSSIM", (data.AVIF_DSSIM * 1000).toFixed(2));

    // Update JXL sliders and text
    updateSliderAndTextAVIF("#tooltip_JXLSSIMU2_AVIF .ssim-label-slider input", "tooltipJXLSSIMU2_AVIF", data.JXL_SSIMU2.toFixed(1));
    updateSliderAndTextAVIF("#tooltip_JXLButter_AVIF .butter-label-slider .scale input", "JXLButter_AVIF", data.JXL_Butter.toFixed(2));
    updateSliderAndTextAVIF("#tooltip_JXLDSSIM_AVIF .dssim-label-slider .scale input", "JXLDSSIM_AVIF", (data.JXL_DSSIM * 1000).toFixed(2));

    // Update AVIF and JXL info that don't have sliders
    document.getElementById("AVIFQuality").textContent = data.AVIF_Quality;
    document.getElementById("tooltipAVIFSize").textContent = (data.AVIF_Size / 1024).toFixed(1);
    document.getElementById("AVIFbpp").textContent = data.AVIF_BBP.toFixed(3);
    document.getElementById("JXLDistance_AVIF").textContent = data.JXL_Distance;
    document.getElementById("tooltipJXLSize_AVIF").textContent = (data.JXL_Size / 1024).toFixed(1);
    document.getElementById("JXLbpp_AVIF").textContent = data.JXL_BBP.toFixed(3);
}

document.addEventListener("DOMContentLoaded", () => {
    Promise.all([
        getImageDataAVIF("AVIF_CompareSizeSameQuality.json", 'AVIFCompareSize'),
        getImageDataAVIF("AVIF_CompareQualitySameSize.json", 'AVIFCompareQuality')
    ]).then(() => {
        // After both data sets are loaded, initialize the display
        const initialSizeSliderValueAVIF = elementsAVIF.mySizeRange_AVIF.value;

        displayDataAVIF(imagesSizeArrayAVIF, initialSizeSliderValueAVIF, 'AVIFCompareSize');

        // Ensure the first tab is active
        const avifTabs = document.querySelector('.avif-jxl-tabs');
        avifTabs.querySelector('.tabs__button_avif[data-for-tab="avif-size"]').classList.add('tabs__button_avif-active');
        avifTabs.querySelector('.tabs__content_avif[data-tab="avif-size"]').classList.add('tabs__content_avif-active');    
    });

    setupAvifVsJXLTabs();

    // Initial data display
    elementsAVIF.mySizeRange_AVIF.addEventListener("input", (e) => {
        displayDataAVIF(imagesSizeArrayAVIF, e.target.value, 'AVIFCompareSize');
    });

    elementsAVIF.myQualityRange_AVIF.addEventListener("input", (e) => {
        displayDataAVIF(imagesQualityArrayAVIF, e.target.value, 'AVIFCompareQuality');
    });
});
