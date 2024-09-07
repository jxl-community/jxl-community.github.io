document.addEventListener('DOMContentLoaded', () => {
  const imagesDataPath = 'DistanceVSEffort_ImageList.json'; // Path to the JSON file containing image data

  fetch(imagesDataPath)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      initializeApp(data);
    })
    .catch(error => {
      console.error('Error fetching data:', error);
      alert('Failed to load image data. Please try again later.');
    });

  function initializeApp(images) {
    const imageDropdown = document.getElementById('image-dropdown');
    const uniqueImageNames = [...new Set(images.map(image => image.Name))];

    const imageElement = document.getElementById('image');
    const slider = document.getElementById('slider');
    const effortSlider = document.getElementById('effort-slider');
    const sizeSpan = document.getElementById('size');
    const bppSpan = document.getElementById('bpp');
    const ssimSpan = document.getElementById('ssim');
    const compressionTimeSpan = document.getElementById('compression-time');
    const sliderLabels = document.getElementById('slider-labels');
    const effortSliderLabels = document.getElementById('effort-slider-labels');
    const distanceLabel = document.querySelector('.distance-label');
    const effortLabel = document.querySelector('.effort-label');

    let currentImageIndex = 0;
    let currentEffortIndex = 0;
    let previousDistance = 0; // Variable to store the previous distance value

    uniqueImageNames.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      imageDropdown.appendChild(option);
    });

    imageDropdown.addEventListener('change', handleImageChange);
    effortSlider.addEventListener('input', handleEffortChange);
    slider.addEventListener('input', handleDistanceChange);

    function handleImageChange() {
      const selectedImageName = imageDropdown.value;
      currentEffortIndex = 0; // Reset effort slider position
      const efforts = initializeEffortSlider(selectedImageName);
      updateSlidersAndImage(selectedImageName, efforts[0]);
    }

    function handleEffortChange() {
      currentEffortIndex = parseInt(effortSlider.value, 10);
      const selectedImageName = imageDropdown.value;
      const efforts = initializeEffortSlider(selectedImageName);
      const { distances } = initializeDistanceSlider(selectedImageName, efforts[currentEffortIndex]);

      // Find the closest matching distance to the previous distance
      const closestDistanceIndex = findClosestDistanceIndex(distances, previousDistance);
      currentImageIndex = closestDistanceIndex;
      slider.value = currentImageIndex;

      updateImageAndInfo(currentImageIndex, distances, images.filter(image => image.Name === selectedImageName && image.Effort === efforts[currentEffortIndex]));
      effortLabel.textContent = `Effort: ${efforts[currentEffortIndex]}`;
      updateDistanceLabel(distances[currentImageIndex]);
    }

    function handleDistanceChange() {
      currentImageIndex = parseInt(slider.value, 10);
      const selectedImageName = imageDropdown.value;
      const efforts = initializeEffortSlider(selectedImageName);
      const { distances, filteredImages } = initializeDistanceSlider(selectedImageName, efforts[currentEffortIndex]);

      previousDistance = distances[currentImageIndex]; // Store the current distance
      updateImageAndInfo(currentImageIndex, distances, filteredImages);
      updateDistanceLabel(distances[currentImageIndex]);
    }

    function initializeEffortSlider(imageName) {
      const efforts = [...new Set(images.filter(image => image.Name === imageName).map(image => image.Effort))].sort((a, b) => b - a);
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

    function initializeDistanceSlider(imageName, effort) {
      const filteredImages = images.filter(image => image.Name === imageName && image.Effort === effort);
      const distances = [...new Set(filteredImages.map(image => image.Quality))].sort((a, b) => a - b);
      slider.min = 0;
      slider.max = distances.length - 1;
      sliderLabels.innerHTML = '';
      distances.forEach((distance, index) => {
        if (index % Math.ceil(distances.length / 10) === 0) {
          const label = document.createElement('span');
          label.textContent = distance.toFixed(1);
          sliderLabels.appendChild(label);
        }
      });
      updateDistanceLabel(distances[currentImageIndex]);
      return { distances, filteredImages };
    }

    function updateSlidersAndImage(imageName, effort) {
      const { distances, filteredImages } = initializeDistanceSlider(imageName, effort);
      updateImageAndInfo(currentImageIndex, distances, filteredImages);
    }

    function updateImageAndInfo(imageIndex, distances, filteredImages) {
      const distance = distances[imageIndex];
      const effort = filteredImages[0].Effort;
      const imageData = filteredImages.find(image => image.Quality === distance && image.Effort === effort);
      imageElement.src = `finalImages/${imageData.FileName}`;
      imageElement.alt = `Name: ${imageData.Name} Distance: ${distance} Effort: ${effort}`;
      sizeSpan.textContent = imageData.Size.toLocaleString(); // Format size with commas
      bppSpan.textContent = parseFloat(imageData.BPP).toFixed(2); // Limit BPP to 2 decimals
      ssimSpan.textContent = parseFloat(imageData.SSIMU2).toFixed(2); // Limit SSIMU2 to 2 decimals
      const compressionTime = (imageData.Pixels / 1000000) / imageData["E-Speed"];
      compressionTimeSpan.textContent = compressionTime.toFixed(3); // Limit to 3 decimals
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

    handleImageChange(); // Initialize with the first image
  }
});
