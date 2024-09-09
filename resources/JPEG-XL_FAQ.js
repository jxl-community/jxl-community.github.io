
document.addEventListener('DOMContentLoaded', () => {
    const tabsContainer = document.querySelector('.tabs');
    const tabs = document.querySelectorAll('.tabs a');
    const selector = document.querySelector('.selector');
    const tabContents = document.querySelectorAll('.tab-content');

    function setSelector(elem) {
        selector.style.width = elem.offsetWidth + 'px';
        selector.style.left = elem.offsetLeft + 'px';
    }

    function openTab(evt) {
        const tabName = evt.target.getAttribute('data-tab');
        tabs.forEach(tab => tab.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        evt.target.classList.add('active');
        document.getElementById(tabName).classList.add('active');
        setSelector(evt.target);
    }

    tabsContainer.addEventListener('click', (evt) => {
        if (evt.target.tagName === 'A') {
            evt.preventDefault();
            openTab(evt);
        }
    });

    // Set initial position of selector
    setSelector(document.querySelector('.tabs a.active'));

    fetch('JPEG-XL_FAQ.md')
        .then(response => response.text())
        .then(text => {
            const converter = new showdown.Converter();
            const sections = text.split(/\n## /); // Split on "## " with newline

            let generalContent = '';
            let usageContent = '';
            let technicalContent = '';

            sections.forEach(section => {
                const content = '## ' + section;
                if (section.startsWith('General')) {
                    generalContent = converter.makeHtml(content).replace('<h2 id="general">General</h2>', '');
                } else if (section.startsWith('Usage')) {
                    usageContent = converter.makeHtml(content).replace('<h2 id="usage">Usage</h2>', '');
                } else if (section.startsWith('Technical')) {
                    technicalContent = converter.makeHtml(content).replace('<h2 id="technical">Technical</h2>', '');
                }
            });

            document.getElementById('general').innerHTML = generalContent;
            document.getElementById('usage').innerHTML = usageContent;
            document.getElementById('technical').innerHTML = technicalContent;


            let sectionElements = [
                document.getElementById('general'),
                document.getElementById('usage'),
                document.getElementById('technical')
            ]
            
            while (sectionElements.length) {
                let section = sectionElements.pop();
                
                // Assign classes and IDs
                section.childNodes.forEach(el => {
                    // ignore text nodes
                    if (el.nodeType == 3) { return }
                    
                    if (el.tagName.toLowerCase() == 'h3') {
                        el.id = 'question';
                        el.className = 'text-question-faq';
                        
                        const disclosureIcon = document.createElement('span');
                        disclosureIcon.className = 'disclosure-icon';
                        el.appendChild(disclosureIcon);
                        return;
                    }
                    
                    if (['p','ul'].includes(el.tagName.toLowerCase())) {
                        el.id = 'answer';
                        el.className = 'text-answer-faq';
                        el.style.display = 'none'; // answers hidden by default
                    }
                });
            }
        })
        .catch(error => console.error('Error fetching data:', error));

    document.body.addEventListener('click', (event) => {
        if (event.target.closest('.text-question-faq')) {
            toggleAnswer(event);
        }
    });

    function toggleAnswer(event) {
        const question = event.target.closest('.text-question-faq');
        const answers = [];
        let nextElement = question.nextElementSibling;

        // Collect all following elements until the next question or end of content
        while (nextElement && !nextElement.classList.contains('text-question-faq')) {
            answers.push(nextElement);
            nextElement = nextElement.nextElementSibling;
        }

        question.classList.toggle('active');
        answers.forEach(answer => {
            if (answer.tagName.toLowerCase() === 'hr') {
                // Always keep hr visible
                answer.style.display = 'block';
            }
            
            if (answer.style.display === 'none') {
                answer.style.display = 'block';
                answer.style.maxHeight = answer.scrollHeight + 'px';
            } else {
                answer.style.display = 'none';
                answer.style.maxHeight = '0px';
            }
        });
    }
});