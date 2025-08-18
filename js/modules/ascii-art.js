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
    
    // Create a container div for the ASCII art
    const container = document.createElement('div');
    container.className = 'ascii-title-container';
    container.style.fontFamily = '"Courier New", Courier, monospace';
    container.style.lineHeight = '1';
    container.style.letterSpacing = '0';
    container.style.whiteSpace = 'nowrap';
    
    // Process each line
    ASCII_TITLE.forEach(line => {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'ascii-title-line';
        lineDiv.style.height = '1em';
        lineDiv.style.fontFamily = 'inherit';
        lineDiv.style.whiteSpace = 'pre';
        
        // Replace spaces with a visible character that has consistent width
        // Using figure space (U+2007) which is designed to be the width of digits
        const processedLine = line.replace(/ /g, '\u2007');
        lineDiv.textContent = processedLine;
        
        container.appendChild(lineDiv);
    });
    
    // Add to main element
    titleElement.appendChild(container);
    
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
    const container = document.querySelector('.ascii-title-container');
    if (!container) return;
    
    const screenWidth = window.innerWidth;
    
    // Adjust font size based on screen width
    if (screenWidth < 360) {
        container.style.fontSize = '4px';
    } else if (screenWidth < 480) {
        container.style.fontSize = '5px';
    } else if (screenWidth < 768) {
        container.style.fontSize = '7px';
    } else if (screenWidth < 1200) {
        container.style.fontSize = '10px';
    } else {
        container.style.fontSize = '14px';
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