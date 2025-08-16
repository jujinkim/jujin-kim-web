let resizeHandler = null;

export function initASCIITitle() {
    const titleElement = document.getElementById('ascii-title');
    
    // Clear any existing content
    titleElement.innerHTML = '';
    
    // Create an img element for the SVG
    const img = document.createElement('img');
    img.src = 'img/ascii-title.svg';
    img.alt = 'JUJIN.KIM';
    img.className = 'ascii-title-img';
    
    // Add to container
    titleElement.appendChild(img);
    
    if (!resizeHandler) {
        resizeHandler = debounce(() => {
            // Trigger resize adjustments if needed
            adjustTitleSize();
        }, 250);
        window.addEventListener('resize', resizeHandler);
    }
    
    // Initial size adjustment
    adjustTitleSize();
}

function adjustTitleSize() {
    const titleImg = document.querySelector('.ascii-title-img');
    if (!titleImg) return;
    
    const screenWidth = window.innerWidth;
    
    // Adjust the max width based on screen size
    if (screenWidth < 360) {
        titleImg.style.maxWidth = '280px';
    } else if (screenWidth < 480) {
        titleImg.style.maxWidth = '340px';
    } else if (screenWidth < 768) {
        titleImg.style.maxWidth = '500px';
    } else if (screenWidth < 1200) {
        titleImg.style.maxWidth = '700px';
    } else {
        titleImg.style.maxWidth = '820px';
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}