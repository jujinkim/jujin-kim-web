const ASCII_TITLE = [
    "     ██╗██╗   ██╗     ██╗██╗███╗   ██╗   ██╗  ██╗██╗███╗   ███╗",
    "     ██║██║   ██║     ██║██║████╗  ██║   ██║ ██╔╝██║████╗ ████║",
    "     ██║██║   ██║     ██║██║██╔██╗ ██║   █████╔╝ ██║██╔████╔██║",
    "██   ██║██║   ██║██   ██║██║██║╚██╗██║   ██╔═██╗ ██║██║╚██╔╝██║",
    "╚█████╔╝╚██████╔╝╚█████╔╝██║██║ ╚████║██╗██║  ██╗██║██║ ╚═╝ ██║",
    " ╚════╝  ╚═════╝  ╚════╝ ╚═╝╚═╝  ╚═══╝╚═╝╚═╝  ╚═╝╚═╝╚═╝     ╚═╝"
];

let resizeHandler = null;

export function initASCIITitle() {
    const titleElement = document.getElementById('ascii-title');
    
    // Clear any existing content
    titleElement.innerHTML = '';
    
    // Create a pre element for better monospace handling
    const pre = document.createElement('pre');
    pre.className = 'ascii-title-text';
    pre.style.margin = '0';
    pre.style.padding = '0';
    pre.style.lineHeight = '1';
    
    // Join lines with newlines, keeping original spaces
    pre.textContent = ASCII_TITLE.join('\n');
    
    // Add to main element
    titleElement.appendChild(pre);
    
    if (!resizeHandler) {
        resizeHandler = debounce(() => {
            adjustTitleSize();
        }, 250);
        window.addEventListener('resize', resizeHandler);
    }
    
    // Initial size adjustment
    adjustTitleSize();
}

function adjustTitleSize() {
    const pre = document.querySelector('.ascii-title-text');
    if (!pre) return;
    
    const screenWidth = window.innerWidth;
    
    // Adjust font size based on screen width
    if (screenWidth < 360) {
        pre.style.fontSize = '4px';
    } else if (screenWidth < 480) {
        pre.style.fontSize = '5px';
    } else if (screenWidth < 768) {
        pre.style.fontSize = '7px';
    } else if (screenWidth < 1200) {
        pre.style.fontSize = '10px';
    } else {
        pre.style.fontSize = '14px';
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