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
    
    // Create a pre element for the ASCII art
    const pre = document.createElement('pre');
    pre.className = 'ascii-title-text';
    pre.style.margin = '0';
    pre.style.fontFamily = 'monospace';
    
    // Process the ASCII art - replace regular spaces with non-breaking spaces
    const processedLines = ASCII_TITLE.map(line => {
        // Use Unicode character U+00A0 (non-breaking space)
        return line.replace(/ /g, '\u00A0');
    });
    
    pre.textContent = processedLines.join('\n');
    
    // Add to container
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
    const titlePre = document.querySelector('.ascii-title-text');
    if (!titlePre) return;
    
    const screenWidth = window.innerWidth;
    
    // Adjust font size based on screen width
    if (screenWidth < 360) {
        titlePre.style.fontSize = '4px';
        titlePre.style.lineHeight = '4px';
    } else if (screenWidth < 480) {
        titlePre.style.fontSize = '5px';
        titlePre.style.lineHeight = '5px';
    } else if (screenWidth < 768) {
        titlePre.style.fontSize = '7px';
        titlePre.style.lineHeight = '7px';
    } else if (screenWidth < 1200) {
        titlePre.style.fontSize = '10px';
        titlePre.style.lineHeight = '10px';
    } else {
        titlePre.style.fontSize = '14px';
        titlePre.style.lineHeight = '14px';
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