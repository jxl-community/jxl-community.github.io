const jpegvsjxl_data_j = JSON.parse(jpegvsjxl_data.dataset.json)

const images_quality_keys = []
const images_quality = {}
jpegvsjxl_data_j["quality"].forEach(e => {
  const title = e["Title"]
  const key = { "H": 3, "MH": 2, "M": 1, "ML": 0 }[e["Quality"]]
  if (!(title in images_quality)) {
    images_quality_keys.push(title)
    images_quality[title] = [null, null, null, null]
  }
  images_quality[title][key] = e
})

const images_size_keys = []
const images_size = {}
jpegvsjxl_data_j["size"].forEach(e => {
  const title = e["Title"]
  const key = { "XL": 3, "L": 2, "M": 1, "S": 0 }[e["Size"]]
  if (!(title in images_size)) {
    images_size_keys.push(title)
    images_size[title] = [null, null, null, null]
  }
  images_size[title][key] = e
})

let image_index = 0
let tab = 0

/* Image Slider Container */
const container = document.querySelector('.comparison-container');
document.querySelector('.image-slider').addEventListener('input', e => {
  container.style.setProperty('--position', `${e.target.value}%`)
})

/* Display Data */
function displayData() {
  let data = {}
  if (tab == 0) {
    const slider = range_jpeg_jxl_size.value
    data = images_quality[images_quality_keys[image_index]][slider]
  } else if (tab == 1) {
    const slider = range_jpeg_jxl_quality.value
    data = images_size[images_size_keys[image_index]][slider]
    console.log(images_size[images_size_keys[image_index]])
  }

  image_title.textContent = data["Title"]
  JPEGCompare_JPEGImage.src = `/images/ComparisonImages/${data["JPEG_FileName"]}`

  // Create picture element for JXL with WebP fallback
  const jxlPath = `/images/ComparisonImages/${data.JXL_FileName}`
  const webpPath = `${jxlPath}.webp`
  const sourceElement = JPEGCompare_JXLImage.querySelector("source")
  sourceElement.srcset = jxlPath
  const imgElement = JPEGCompare_JXLImage.querySelector("img")
  imgElement.src = webpPath
  imgElement.alt = data["Title"]

  const formatSize = (sizeInBytes) => (sizeInBytes / 1024).toFixed(1)

  // Update common elements
  JPEGbpp.textContent = data.JPEG_BBP.toFixed(3)
  JPEGButter.textContent = data.JPEG_Butter.toFixed(2)
  JPEGDSSIM.textContent = (data.JPEG_DSSIM * 1000).toFixed(2)
  JPEGQuality.textContent = data.JPEG_Quality

  JXLbpp.textContent = data.JXL_BBP.toFixed(3)
  JXLButter.textContent = data.JXL_Butter.toFixed(2)
  JXLDSSIM.textContent = (data.JXL_DSSIM * 1000).toFixed(2)
  JXLDistance.textContent = data.JXL_Distance

  // Update Tooltip Items that are also used on the main page
  tooltipJPEGSSIMU2.textContent = data.JPEG_SSIMU2.toFixed(1)
  tooltipJXLSSIMU2.textContent = data.JXL_SSIMU2.toFixed(1)
  tooltipJPEGSize.textContent = formatSize(data.JPEG_Size)
  tooltipJXLSize.textContent = formatSize(data.JXL_Size)

  // Update tab-specific elements
  if (tab === 0) {
    JPEGCSize_JPEGSize.textContent = formatSize(data.JPEG_Size)
    JPEGCSize_JPEGSSIMU2.textContent = data.JPEG_SSIMU2.toFixed(1)
    JPEGCSize_JXLSize.textContent = formatSize(data.JXL_Size)
    JPEGCSize_JXLSSIMU2.textContent = data.JXL_SSIMU2.toFixed(1)
  } else if (tab == 1) {
    JPEGCQuality_JPEGSize.textContent = formatSize(data.JPEG_Size)
    JPEGCQuality_JPEGSSIMU2.textContent = data.JPEG_SSIMU2.toFixed(1)
    JPEGCQuality_JXLSize.textContent = formatSize(data.JXL_Size)
    JPEGCQuality_JXLSSIMU2.textContent = data.JXL_SSIMU2.toFixed(1)
  }
  updateDots()
  updateTooltipSliders(data)
}
displayData()

function updateDots() {
  for (let i = 0; i < imageDots.children.length; i++) {
    imageDots.children[i].classList.toggle("active", i == image_index)
  }
}

for (let i = 0; i < Object.keys(images_size).length; i++) {
  const dot = document.createElement('div')
  imageDots.appendChild(dot)
  dot.classList.add("dot")
  dot.addEventListener("click", () => {
    image_index = i
    updateDots()
    displayData()
  })
}
updateDots()

/* Setup Tabs */
btn_jpeg_jxl_size.addEventListener("click", () => {
  tab = 0
  btn_jpeg_jxl_size.classList.toggle("tabs__button-active", true)
  btn_jpeg_jxl_quality.classList.toggle("tabs__button-active", false)
  tab_jpeg_jxl_size.classList.toggle("tabs__content-active", true)
  tab_jpeg_jxl_quality.classList.toggle("tabs__content-active", false)
})

btn_jpeg_jxl_quality.addEventListener("click", () => {
  tab = 1
  btn_jpeg_jxl_size.classList.toggle("tabs__button-active", false)
  btn_jpeg_jxl_quality.classList.toggle("tabs__button-active", true)
  tab_jpeg_jxl_size.classList.toggle("tabs__content-active", false)
  tab_jpeg_jxl_quality.classList.toggle("tabs__content-active", true)
})

btn_jpeg_jxl_size.classList.toggle("tabs__button-active", true)
tab_jpeg_jxl_size.classList.toggle("tabs__content-active", true)

/* Handle Image Slider - Compare Size */
range_jpeg_jxl_size.addEventListener("input", _e => {
  displayData()
})

/* Handle Image Slider - Compare Quality */
range_jpeg_jxl_quality.addEventListener("input", _e => {
  displayData()
})

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
