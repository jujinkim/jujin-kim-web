const ASCII_FONTS = {
    large: [
        "     ██╗██╗   ██╗     ██╗██╗███╗   ██╗    ██╗  ██╗██╗███╗   ███╗",
        "     ██║██║   ██║     ██║██║████╗  ██║    ██║ ██╔╝██║████╗ ████║",
        "     ██║██║   ██║     ██║██║██╔██╗ ██║    █████╔╝ ██║██╔████╔██║",
        "██   ██║██║   ██║██   ██║██║██║╚██╗██║    ██╔═██╗ ██║██║╚██╔╝██║",
        "╚█████╔╝╚██████╔╝╚█████╔╝██║██║ ╚████║    ██║  ██╗██║██║ ╚═╝ ██║",
        " ╚════╝  ╚═════╝  ╚════╝ ╚═╝╚═╝  ╚═══╝    ╚═╝  ╚═╝╚═╝╚═╝     ╚═╝"
    ],
    modern: [
        "╔════════════════════╗",
        "║    JUJIN  KIM      ║",
        "╚════════════════════╝"
    ],
    block: [
        "   JUJIN KIM   ",
        "═══════════════"
    ],
    classic: [
        "     ██╗██╗   ██╗     ██╗██╗███╗   ██╗    ██╗  ██╗██╗███╗   ███╗",
        "     ██║██║   ██║     ██║██║████╗  ██║    ██║ ██╔╝██║████╗ ████║",
        "     ██║██║   ██║     ██║██║██╔██╗ ██║    █████╔╝ ██║██╔████╔██║",
        "██   ██║██║   ██║██   ██║██║██║╚██╗██║    ██╔═██╗ ██║██║╚██╔╝██║",
        "╚█████╔╝╚██████╔╝╚█████╔╝██║██║ ╚████║    ██║  ██╗██║██║ ╚═╝ ██║",
        " ╚════╝  ╚═════╝  ╚════╝ ╚═╝╚═╝  ╚═══╝    ╚═╝  ╚═╝╚═╝╚═╝     ╚═╝"
    ]
};

let resizeHandler = null;

export function initASCIITitle() {
    const titleElement = document.getElementById('ascii-title');
    const screenWidth = window.innerWidth;
    
    let selectedFont;
    if (screenWidth < 480) {
        selectedFont = ASCII_FONTS.modern;
    } else if (screenWidth < 768) {
        selectedFont = ASCII_FONTS.block;
    } else if (screenWidth < 1200) {
        selectedFont = ASCII_FONTS.classic;
    } else {
        selectedFont = ASCII_FONTS.large;
    }
    
    titleElement.textContent = selectedFont.join('\n');
    
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