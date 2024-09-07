let glossaryData = [];
let subcategories = [];

function createTabs() {
    const tabBar = document.getElementById('tab-bar');
    const dropdown = document.getElementById('category-dropdown');
    tabBar.innerHTML = '<div class="selector"></div>';
    dropdown.innerHTML = '';
    subcategories.forEach((subcategory, index) => {
        const tab = document.createElement('a');
        tab.href = '#';
        tab.textContent = subcategory;
        tab.onclick = (e) => {
            e.preventDefault();
            switchTab(index);
        };
        tabBar.appendChild(tab);

        const option = document.createElement('option');
        option.value = index;
        option.textContent = subcategory;
        dropdown.appendChild(option);
    });
}

function setSelector(elem) {
    const selector = document.querySelector('.selector');
    selector.style.width = elem.offsetWidth + 'px';
    selector.style.left = elem.offsetLeft + 'px';
}

function switchTab(index) {
    const tabs = document.querySelectorAll('.tabs a');
    tabs.forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
    });
    setSelector(tabs[index]);
    document.getElementById('category-dropdown').value = index;
    const content = document.getElementById('glossary-content');
    content.classList.add('fade-out');
    setTimeout(() => {
        displayGlossary(subcategories[index]);
        content.classList.remove('fade-out');
    }, 300);
}

function displayGlossary(subcategory) {
    const glossaryContent = document.getElementById('glossary-content');
    glossaryContent.innerHTML = '';
    const filteredData = glossaryData.filter(item => item.subcategory === subcategory);

    filteredData.sort((a, b) => a.term.localeCompare(b.term));

    filteredData.forEach(item => {
        const glossaryTerm = document.createElement('div');
        glossaryTerm.className = 'glossary-term';
        const detailsElement = document.createElement('details');
        glossaryTerm.appendChild(detailsElement);

        const termElement = document.createElement('summary');
        termElement.className = 'term';

        const anchorElement = document.createElement('a');
        anchorElement.id = item.term.replace(/\s+/g, '-').toLowerCase();
        anchorElement.href = '#' + anchorElement.id;
        anchorElement.textContent = item.term;

        termElement.appendChild(anchorElement);
        detailsElement.appendChild(termElement);

        const definitionElement = document.createElement('div');
        definitionElement.className = 'definition';
        definitionElement.innerHTML = item.definition;
        detailsElement.appendChild(definitionElement);

        glossaryContent.appendChild(glossaryTerm);

        anchorElement.addEventListener('click', function (e) {
            e.preventDefault();
            detailsElement.open = !detailsElement.open;
        });
    });
}

function loadGlossary() {
    fetch('JPEG-XL_Glossary.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            glossaryData = data;
            subcategories = [...new Set(data.map(item => item.subcategory))];
            createTabs();
            switchTab(0);
            if (window.location.hash) {
                const term = window.location.hash.substring(1);
                const item = glossaryData.find(i => i.term.replace(/\s+/g, '-').toLowerCase() === term);
                if (item) {
                    const index = subcategories.indexOf(item.subcategory);
                    if (index !== -1) {
                        switchTab(index);
                        setTimeout(() => {
                            const element = document.getElementById(term);
                            if (element) {
                                element.scrollIntoView();
                                element.closest('details').open = true;
                            }
                        }, 500);
                    }
                }
            }
        })
        .catch(error => {
            console.error('Error fetching JSON:', error);
            document.getElementById('glossary-content').textContent = 'Failed to load Glossary.';
        });
}

window.onload = loadGlossary;

window.addEventListener('hashchange', function () {
    const term = window.location.hash.substring(1);
    const item = glossaryData.find(i => i.term.replace(/\s+/g, '-').toLowerCase() === term);
    if (item) {
        const index = subcategories.indexOf(item.subcategory);
        if (index !== -1) {
            switchTab(index);
            setTimeout(() => {
                const element = document.getElementById(term);
                if (element) {
                    element.scrollIntoView();
                    element.closest('details').open = true;
                }
            }, 500);
        }
    }
});

document.getElementById('category-dropdown').addEventListener('change', function () {
    switchTab(parseInt(this.value));
});