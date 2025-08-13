const ASCII_FONTS = {
    large: [
        "░░░░░██╗██╗░░░██╗░░░░░██╗██╗███╗░░░██╗░░░██╗░░██╗██╗███╗░░░███╗",
        "░░░░░██║██║░░░██║░░░░░██║██║████╗░░██║░░░██║░██╔╝██║████╗░████║",
        "░░░░░██║██║░░░██║░░░░░██║██║██╔██╗░██║░░░█████╔╝░██║██╔████╔██║",
        "██░░░██║██║░░░██║██░░░██║██║██║╚██╗██║░░░██╔═██╗░██║██║╚██╔╝██║",
        "╚█████╔╝╚██████╔╝╚█████╔╝██║██║░╚████║██╗██║░░██╗██║██║░╚═╝░██║",
        "░╚════╝░░╚═════╝░░╚════╝░╚═╝╚═╝░░╚═══╝╚═╝╚═╝░░╚═╝╚═╝╚═╝░░░░░╚═╝"
    ],
    modern: [
        "╔╦╗╦░╦╔╦╗╔╦╗╔╗╔░╦╔═╔╦╗╔╦╗",
        "░║░║░║░║░░║░║║║░╠╩╗░║░║║║",
        "╚╝░╚═╝╚╝░╚╩╝╝╚╝•╩░╩╚╩╝╩░╩"
    ],
    block: [
        "▀▀█░█░█░▀▀█░███░█▀█░░░█░█░███░█▀█▀█",
        "░░█░█░█░░░█░░█░░█░█░░░█▀▄░░█░░█░█░█",
        "▀▀░░▀▀▀░▀▀░░███░▀░▀░▀░▀░▀░███░▀░▀░▀"
    ],
    classic: [
        "░░░░░██╗██╗░░░██╗░░░░░██╗██╗███╗░░░██╗░░░██╗░░██╗██╗███╗░░░███╗",
        "░░░░░██║██║░░░██║░░░░░██║██║████╗░░██║░░░██║░██╔╝██║████╗░████║",
        "░░░░░██║██║░░░██║░░░░░██║██║██╔██╗░██║░░░█████╔╝░██║██╔████╔██║",
        "██░░░██║██║░░░██║██░░░██║██║██║╚██╗██║░░░██╔═██╗░██║██║╚██╔╝██║",
        "╚█████╔╝╚██████╔╝╚█████╔╝██║██║░╚████║██╗██║░░██╗██║██║░╚═╝░██║",
        "░╚════╝░░╚═════╝░░╚════╝░╚═╝╚═╝░░╚═══╝╚═╝╚═╝░░╚═╝╚═╝╚═╝░░░░░╚═╝"
    ],
    tiny: [
        "┌─────────────┐",
        "│ jujin.kim   │",
        "└─────────────┘"
    ]
};

let resizeHandler = null;

export function initASCIITitle() {
    const titleElement = document.getElementById('ascii-title');
    const screenWidth = window.innerWidth;
    
    // Always use the large (desktop) version
    const selectedFont = ASCII_FONTS.large;
    
    titleElement.textContent = selectedFont.join('\n');
    
    // Adjust font size based on screen width
    if (screenWidth < 360) {
        titleElement.style.fontSize = '4px';
        titleElement.style.lineHeight = '4px';
    } else if (screenWidth < 480) {
        titleElement.style.fontSize = '5px';
        titleElement.style.lineHeight = '5px';
    } else if (screenWidth < 768) {
        titleElement.style.fontSize = '7px';
        titleElement.style.lineHeight = '7px';
    } else if (screenWidth < 1200) {
        titleElement.style.fontSize = '10px';
        titleElement.style.lineHeight = '10px';
    } else {
        titleElement.style.fontSize = '14px';
        titleElement.style.lineHeight = '14px';
    }
    
    if (!resizeHandler) {
        resizeHandler = debounce(() => {
            initASCIITitle();
        }, 250);
        window.addEventListener('resize', resizeHandler);
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