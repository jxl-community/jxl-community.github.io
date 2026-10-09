
document.addEventListener('DOMContentLoaded', () => {
  const resourcesPath = '/resources';
  const imageDirectory = `${resourcesPath}/DistanceVSEffort_Images`;
  const dataDirectory = `${resourcesPath}/dve`;
  const imageChunks = new Map();

  async function fetchJson(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Unable to load ${path}: ${response.status}`);
    return response.json();
  }

  fetchJson(`${dataDirectory}/index.json`)
    .then(initializeApp)
    .catch(error => {
      console.error('Error fetching visualizer catalog:', error);
      alert('Failed to load image data. Please try again later.');
    });

  function initializeApp(catalog) {
    const imageDropdown = document.getElementById('image-dropdown');
    const imageElement = document.getElementById('image');
    const imageViewport = document.getElementById('image-viewport');
    const slider = document.getElementById('slider');
    const effortSlider = document.getElementById('effort-slider');
    const zoomSlider = document.getElementById('zoom-slider');
    const zoomValue = document.getElementById('zoom-value');
    const sizeSpan = document.getElementById('size');
    const bppSpan = document.getElementById('bpp');
    const ssimSpan = document.getElementById('ssim');
    const compressionTimeSpan = document.getElementById('compression-time');
    const sliderLabels = document.getElementById('slider-labels');
    const effortSliderLabels = document.getElementById('effort-slider-labels');
    const distanceLabel = document.querySelector('.distance-label');
    const effortLabel = document.querySelector('.effort-label');
    const tradeoffChartSvg = document.getElementById('tradeoff-chart-svg');
    const tradeoffChartLegend = document.getElementById('tradeoff-chart-legend');
    const tradeoffChartDescription = document.getElementById('tradeoff-chart-description');
    const tradeoffChartToggles = document.querySelectorAll('[data-chart-metric]');
    let currentImageIndex = 0;
    let currentEffortIndex = 0;
    let previousDistance = 0; // Variable to store the previous distance value
    let currentZoom = 1;
    let panX = 0;
    let panY = 0;
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;
    let panOriginX = 0;
    let panOriginY = 0;
    let isLosslessPreview = false;
    let chartMetric = 'size';

    let currentImage;
    let loadVersion = 0;

    catalog.images.forEach(image => {
      const option = document.createElement('option');
      option.value = image.id;
      option.textContent = image.name;
      imageDropdown.appendChild(option);
    });

    imageDropdown.addEventListener('change', () => loadImage(imageDropdown.value));
    effortSlider.addEventListener('input', handleEffortChange);
    slider.addEventListener('input', handleDistanceChange);
    zoomSlider.addEventListener('input', handleZoomChange);
    tradeoffChartToggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        chartMetric = toggle.dataset.chartMetric;
        tradeoffChartToggles.forEach(button => {
          const isSelected = button === toggle;
          button.classList.toggle('is-selected', isSelected);
          button.setAttribute('aria-pressed', String(isSelected));
        });
        updateTradeoffChart();
      });
    });
    imageElement.addEventListener('load', () => {
      clampPan();
      applyZoomAndPan();
    });
    imageViewport.addEventListener('keydown', event => {
      if (event.target !== imageViewport || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Home') {
        event.preventDefault();
        zoomSlider.value = '1';
        setZoom(1);
        return;
      }
      if (currentZoom === 1) return;
      const movement = {
        ArrowLeft: [32, 0],
        ArrowRight: [-32, 0],
        ArrowUp: [0, 32],
        ArrowDown: [0, -32],
      }[event.key];
      if (!movement) return;
      event.preventDefault();
      panX += movement[0];
      panY += movement[1];
      clampPan();
      applyZoomAndPan();
    });
    imageViewport.addEventListener('pointerdown', startPan);
    imageViewport.addEventListener('pointermove', movePan);
    imageViewport.addEventListener('pointerup', endPan);
    imageViewport.addEventListener('pointercancel', endPan);
    imageViewport.addEventListener('lostpointercapture', endPan);
    window.addEventListener('keydown', event => {
      if (event.key === 'Shift' && !event.repeat) setLosslessPreview(true);
    });
    window.addEventListener('keyup', event => {
      if (event.key === 'Shift') setLosslessPreview(false);
    });
    window.addEventListener('blur', () => setLosslessPreview(false));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) setLosslessPreview(false);
    });

    async function loadImage(id) {
      const requestVersion = ++loadVersion;
      imageDropdown.disabled = true;
      effortSlider.disabled = true;
      slider.disabled = true;

      try {
        const image = await getImageChunk(id);
        if (requestVersion !== loadVersion) return;

        currentImage = image;
        isLosslessPreview = false;
        currentEffortIndex = 0;
        currentImageIndex = 0;
        previousDistance = 0;
        const efforts = initializeEffortSlider();
        effortSlider.value = currentEffortIndex;
        updateSlidersAndImage(efforts[0]);
      } catch (error) {
        console.error(`Error fetching image data for ${id}:`, error);
        alert('Failed to load this image. Please try another one.');
      } finally {
        if (requestVersion === loadVersion) {
          imageDropdown.disabled = false;
          effortSlider.disabled = false;
          slider.disabled = false;
        }
      }
    }

    function getImageChunk(id) {
      if (!imageChunks.has(id)) {
        imageChunks.set(id, fetchJson(`${dataDirectory}/${id}.json`));
      }
      return imageChunks.get(id);
    }

    function setLosslessPreview(enabled) {
      if (isLosslessPreview === enabled) return;
      isLosslessPreview = enabled;
      if (!currentImage) return;

      const efforts = initializeEffortSlider();
      const effort = efforts[currentEffortIndex];
      const { distances, variants } = initializeDistanceSlider(effort);
      updateImageAndInfo(currentImageIndex, variants, effort);
      updateDistanceLabel(isLosslessPreview ? 0 : distances[currentImageIndex]);
    }

    function handleEffortChange() {
      currentEffortIndex = parseInt(effortSlider.value, 10);
      const efforts = initializeEffortSlider();
      const { distances, variants } = initializeDistanceSlider(efforts[currentEffortIndex]);
      // Find the closest matching distance to the previous distance
      const closestDistanceIndex = findClosestDistanceIndex(distances, previousDistance);
      currentImageIndex = closestDistanceIndex;
      slider.value = currentImageIndex;
      updateImageAndInfo(currentImageIndex, variants, efforts[currentEffortIndex]);
      effortLabel.textContent = `Effort: ${efforts[currentEffortIndex]}`;
      updateDistanceLabel(distances[currentImageIndex]);
    }
    function handleDistanceChange() {
      currentImageIndex = parseInt(slider.value, 10);
      const efforts = initializeEffortSlider();
      const { distances, variants } = initializeDistanceSlider(efforts[currentEffortIndex]);
      previousDistance = distances[currentImageIndex]; // Store the current distance
      updateImageAndInfo(currentImageIndex, variants, efforts[currentEffortIndex]);
      updateDistanceLabel(distances[currentImageIndex]);
    }
    function initializeEffortSlider() {
      const efforts = Object.keys(currentImage.efforts).map(Number).sort((a, b) => b - a);
      effortSlider.min = 0;
      effortSlider.max = efforts.length - 1;
      effortSliderLabels.innerHTML = '';
      efforts.forEach(effort => {
        const label = document.createElement('span');
        label.textContent = effort;
        effortSliderLabels.appendChild(label);
      });
      effortLabel.textContent = `Effort: ${efforts[currentEffortIndex]}`;
      return efforts;
    }
    function initializeDistanceSlider(effort) {
      const variants = currentImage.efforts[String(effort)] ?? [];
      const distances = variants.map(variant => variant[0]);
      slider.min = 0;
      slider.max = distances.length - 1;
      slider.value = currentImageIndex;
      sliderLabels.innerHTML = '';
      distances.forEach((distance, index) => {
        const isSampledTick = index % Math.ceil(distances.length / 10) === 0;
        const isFinalTick = index === distances.length - 1;
        if (isSampledTick || isFinalTick) {
          const label = document.createElement('span');
          label.textContent = distance.toFixed(1);
          sliderLabels.appendChild(label);
        }
      });
      updateDistanceLabel(distances[currentImageIndex]);
      return { distances, variants };
    }
    function updateSlidersAndImage(effort) {
      const { variants } = initializeDistanceSlider(effort);
      updateImageAndInfo(currentImageIndex, variants, effort);
    }
    function updateImageAndInfo(imageIndex, variants, effort) {
      const imageData = isLosslessPreview
        ? variants.find(([quality]) => quality === 0) ?? variants[imageIndex]
        : variants[imageIndex];
      const [quality, fileName, size, encodingSpeed, bpp, ssim] = imageData;
      imageElement.src = `${imageDirectory}/${fileName}`;
      const previewLabel = isLosslessPreview ? 'Lossless preview. ' : '';
      imageElement.alt = `${previewLabel}Name: ${currentImage.name} Distance: ${quality} Effort: ${effort}`;
      sizeSpan.textContent = size.toLocaleString(); // Format size with commas
      bppSpan.textContent = Number(bpp).toFixed(2); // Limit BPP to 2 decimals
      ssimSpan.textContent = Number(ssim).toFixed(2); // Limit SSIMU2 to 2 decimals
      const compressionTime = (currentImage.pixels / 1000000) / encodingSpeed;
      compressionTimeSpan.textContent = compressionTime.toFixed(3); // Limit to 3 decimals
      updateTradeoffChart();
    }

    function updateTradeoffChart() {
      if (!currentImage) return;

      const chartWidth = 896;
      const chartHeight = 416;
      const margin = { top: 28, right: 26, bottom: 54, left: 72 };
      const plotWidth = chartWidth - margin.left - margin.right;
      const plotHeight = chartHeight - margin.top - margin.bottom;
      const efforts = Object.keys(currentImage.efforts).map(Number).sort((a, b) => a - b);
      const variantsByEffort = efforts.map(effort => currentImage.efforts[String(effort)]);
      const useLogScale = chartMetric === 'size';
      const valueFor = variant => chartMetric === 'size'
        ? variant[2] / 1024
        : (currentImage.pixels / 1000000) / variant[3];
      const selectedEffort = efforts.slice().reverse()[currentEffortIndex];
      const selectedVariants = currentImage.efforts[String(selectedEffort)];
      const selectedVariant = isLosslessPreview
        ? selectedVariants.find(([distance]) => distance === 0) ?? selectedVariants[currentImageIndex]
        : selectedVariants[currentImageIndex];
      const selectedDistance = selectedVariant[0];
      const focusLossyTime = chartMetric === 'time' && selectedDistance > 0;
      const displayedVariantsByEffort = focusLossyTime
        ? variantsByEffort.map(variants => variants.filter(([distance]) => distance > 0))
        : variantsByEffort;
      const distances = displayedVariantsByEffort.flat().map(([distance]) => distance);
      const minimumDistance = Math.min(...distances);
      const maximumDistance = Math.max(...distances);
      const values = displayedVariantsByEffort.flat().map(valueFor);
      const minimumValue = Math.min(...values);
      const maximumValue = Math.max(...values);
      const yMinimum = useLogScale ? 10 ** Math.floor(Math.log10(minimumValue)) : 0;
      const yMaximum = useLogScale
        ? 10 ** Math.ceil(Math.log10(maximumValue))
        : focusLossyTime ? niceMaximum(maximumValue) : maximumValue <= 15 ? 15 : niceMaximum(maximumValue);
      const x = distance => margin.left + ((distance - minimumDistance) / (maximumDistance - minimumDistance)) * plotWidth;
      const y = value => {
        const scaledValue = useLogScale ? Math.log10(value) : value;
        const scaledMinimum = useLogScale ? Math.log10(yMinimum) : yMinimum;
        const scaledMaximum = useLogScale ? Math.log10(yMaximum) : yMaximum;
        return margin.top + plotHeight - ((scaledValue - scaledMinimum) / (scaledMaximum - scaledMinimum)) * plotHeight;
      };
      const metricLabel = chartMetric === 'size'
        ? 'File size (KB, log scale)'
        : focusLossyTime ? 'Encoding time (seconds, lossy detail)' : 'Encoding time (seconds)';
      const selectedValue = valueFor(selectedVariant);
      const selectedEffortIndex = efforts.indexOf(selectedEffort);
      const colors = Array.from({ length: 8 }, (_, index) => `var(--chart--effort-${index + 1})`);
      const selectedColor = 'var(--chart--selected)';
      const xTicks = 5;
      const grid = [];
      const linearTickStep = focusLossyTime ? yMaximum / 4 : yMaximum <= 20 ? 5 : yMaximum / 4;
      const yValues = useLogScale
        ? Array.from(
          { length: Math.round(Math.log10(yMaximum) - Math.log10(yMinimum)) + 1 },
          (_, index) => 10 ** (Math.log10(yMinimum) + index),
        )
        : Array.from(
          { length: Math.round(yMaximum / linearTickStep) + 1 },
          (_, index) => linearTickStep * index,
        );

      for (const value of yValues) {
        const position = y(value);
        grid.push(`<line class="chart-grid" x1="${margin.left}" x2="${chartWidth - margin.right}" y1="${position}" y2="${position}" />`);
        grid.push(`<text class="chart-tick" x="${margin.left - 10}" y="${position + 4}" text-anchor="end">${formatChartValue(value)}</text>`);
      }

      for (let tick = 0; tick <= xTicks; tick += 1) {
        const distance = minimumDistance + ((maximumDistance - minimumDistance) / xTicks) * tick;
        const position = x(distance);
        grid.push(`<text class="chart-tick" x="${position}" y="${chartHeight - margin.bottom + 25}" text-anchor="middle">${formatDistanceTick(distance)}</text>`);
      }

      const lines = displayedVariantsByEffort.map((variants, index) => {
        const path = variants.map(([distance, ...rest], pointIndex) => {
          const value = valueFor([distance, ...rest]);
          return `${pointIndex === 0 ? 'M' : 'L'} ${x(distance).toFixed(2)} ${y(value).toFixed(2)}`;
        }).join(' ');
        const lineState = index === selectedEffortIndex ? 'is-selected' : 'is-muted';
        const lineColor = index === selectedEffortIndex ? selectedColor : colors[index];
        return `<path class="chart-line ${lineState}" d="${path}" stroke="${lineColor}" />`;
      }).join('');
      const comparisonMarkers = displayedVariantsByEffort.map((variants, index) => {
        const variant = variants.find(([distance]) => distance === selectedDistance);
        if (!variant || index === selectedEffortIndex) return '';
        return `<circle class="chart-comparison-marker" cx="${x(selectedDistance)}" cy="${y(valueFor(variant))}" r="3.5" fill="${colors[index]}" />`;
      }).join('');

      tradeoffChartSvg.innerHTML = `
        <title>${escapeHtml(`${currentImage.name}: ${metricLabel} by distance and encoder effort`)}</title>
        <g>${grid.join('')}</g>
        <line class="chart-grid" x1="${margin.left}" x2="${chartWidth - margin.right}" y1="${margin.top + plotHeight}" y2="${margin.top + plotHeight}" />
        ${lines}
        <line class="chart-selection-guide" x1="${x(selectedDistance)}" x2="${x(selectedDistance)}" y1="${margin.top}" y2="${margin.top + plotHeight}" />
        ${comparisonMarkers}
        <circle class="chart-marker-halo" cx="${x(selectedDistance)}" cy="${y(selectedValue)}" r="6" />
        <circle class="chart-marker" cx="${x(selectedDistance)}" cy="${y(selectedValue)}" r="3" fill="${selectedColor}" />
        <text class="chart-axis" x="${margin.left}" y="15">${metricLabel}</text>
        <text class="chart-axis" x="${margin.left + plotWidth / 2}" y="${chartHeight - 8}" text-anchor="middle">Visual distance</text>
      `;

      tradeoffChartLegend.innerHTML = efforts.map((effort, index) => `
        <span class="tradeoff-chart-legend-item${index === selectedEffortIndex ? ' is-selected' : ''}"><span class="tradeoff-chart-legend-swatch" style="background-color:${index === selectedEffortIndex ? selectedColor : colors[index]}"></span>Effort ${effort}</span>
      `).join('');
      const detailDescription = focusLossyTime ? ' Lossless encoding is excluded to show the lossy range in detail.' : '';
      tradeoffChartDescription.textContent = `${currentImage.name}. ${metricLabel} by visual distance for efforts ${efforts.join(' through ')}. The selected point is effort ${selectedEffort} at distance ${selectedDistance.toFixed(1)}: ${formatChartValue(selectedValue)}.${detailDescription}`;
    }

    function niceMaximum(value) {
      const power = 10 ** Math.floor(Math.log10(value));
      const fraction = value / power;
      const roundedFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
      return roundedFraction * power;
    }

    function formatChartValue(value) {
      if (chartMetric === 'size') return `${value.toFixed(value < 10 ? 1 : 0)} KB`;
      return `${value.toFixed(value < 1 ? 2 : 1)} s`;
    }

    function formatDistanceTick(distance) {
      return distance < 1 ? distance.toFixed(1) : distance.toFixed(0);
    }

    function escapeHtml(value) {
      return value.replace(/[&<>'"]/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      })[character]);
    }
    function handleZoomChange() {
      const nextZoom = parseFloat(zoomSlider.value);
      setZoom(nextZoom);
    }
    function setZoom(zoom) {
      currentZoom = zoom;
      zoomValue.textContent = formatZoom(zoom);
      if (zoom === 1) {
        panX = 0;
        panY = 0;
      }
      clampPan();
      applyZoomAndPan();
    }
    function formatZoom(zoom) {
      return `${Number.isInteger(zoom) ? zoom : zoom.toFixed(1)}x`;
    }
    function startPan(event) {
      if (currentZoom === 1) {
        return;
      }
      isPanning = true;
      panStartX = event.clientX;
      panStartY = event.clientY;
      panOriginX = panX;
      panOriginY = panY;
      imageViewport.setPointerCapture(event.pointerId);
      imageViewport.classList.add('is-panning');
    }
    function movePan(event) {
      if (!isPanning) {
        return;
      }
      panX = panOriginX + event.clientX - panStartX;
      panY = panOriginY + event.clientY - panStartY;
      clampPan();
      applyZoomAndPan();
    }
    function endPan(event) {
      if (!isPanning) {
        return;
      }
      isPanning = false;
      if (imageViewport.hasPointerCapture(event.pointerId)) {
        imageViewport.releasePointerCapture(event.pointerId);
      }
      imageViewport.classList.remove('is-panning');
    }
    function clampPan() {
      const viewportRect = imageViewport.getBoundingClientRect();
      const maxX = (viewportRect.width * (currentZoom - 1)) / 2;
      const maxY = (viewportRect.height * (currentZoom - 1)) / 2;
      panX = Math.max(-maxX, Math.min(maxX, panX));
      panY = Math.max(-maxY, Math.min(maxY, panY));
    }
    function applyZoomAndPan() {
      imageElement.style.transform = `translate(${panX}px, ${panY}px) scale(${currentZoom})`;
      imageViewport.classList.toggle('is-zoomed', currentZoom > 1);
    }
    function findClosestDistanceIndex(distances, previousDistance) {
      let closestIndex = 0;
      let closestDifference = Math.abs(distances[0] - previousDistance);
      distances.forEach((distance, index) => {
        const difference = Math.abs(distance - previousDistance);
        if (difference < closestDifference) {
          closestIndex = index;
          closestDifference = difference;
        }
      });
      return closestIndex;
    }
    function updateDistanceLabel(distance) {
      if (distance === 0) {
        distanceLabel.textContent = `Distance: ${distance.toFixed(1)} (mathematically lossless)`;
      } else if (distance <= 1) {
        distanceLabel.textContent = `Distance: ${distance.toFixed(1)} (visually lossless)`;
      } else {
        distanceLabel.textContent = `Distance: ${distance.toFixed(1)}`;
      }
    }
    loadImage(catalog.defaultImage); // Initialize with the default image
  }
});
