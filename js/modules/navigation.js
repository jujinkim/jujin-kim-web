let currentSection = 'home';
let menuItems = [];
const MOBILE_SHORTCUT_BREAKPOINT = 768;

function isMobileInputContext() {
    const isSmallViewport = window.innerWidth <= MOBILE_SHORTCUT_BREAKPOINT;
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    return isSmallViewport || isCoarsePointer;
}

export function initNavigation() {
    menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach((item, index) => {
        item.addEventListener('click', () => selectMenuItem(item, index));
    });

    document.addEventListener('click', handleSectionLink);
    
    // Add keyboard shortcuts
    if (!isMobileInputContext()) {
        document.addEventListener('keydown', handleKeyboardShortcuts);
    }
    
    // Set Home as default active without animation
    selectMenuItem(menuItems[0], 0, true);
    
    addScanLine();
}

export function navigateToSection(sectionId) {
    if (!menuItems.length) {
        menuItems = document.querySelectorAll('.menu-item');
    }
    
    const items = Array.from(menuItems);
    const targetItem = items.find(item => item.dataset.section === sectionId);
    if (targetItem) {
        selectMenuItem(targetItem, items.indexOf(targetItem));
    }
}

function selectMenuItem(menuItem, index, skipAnimation = false) {
    const sectionId = menuItem.dataset.section;
    
    // Update active state
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    menuItem.classList.add('active');
    
    showSection(sectionId, skipAnimation);
    currentSection = sectionId;
}

function showSection(sectionId, skipAnimation = false) {
    const sections = document.querySelectorAll('.content-section');
    
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
        
        // Re-initialize profile picture when showing home section
        if (sectionId === 'home') {
            import('./profile-ascii.js').then(module => {
                setTimeout(() => {
                    module.initProfilePicture();
                }, 100);
            });
        }
        
        if (!skipAnimation) {
            targetSection.classList.add('typewriter');
            
            // Animate content when switching sections
            const elements = targetSection.querySelectorAll('p, h2, div');
            elements.forEach((element, index) => {
                element.style.opacity = '0';
                element.style.animation = `typewriter-lines 0.05s steps(1) ${index * 0.02}s forwards`;
            });
            
            setTimeout(() => {
                targetSection.classList.remove('typewriter');
            }, 300);
        }
    }
}

function handleKeyboardShortcuts(e) {
    if (isMobileInputContext()) return;

    // Number shortcuts for menu navigation (1~6), key code based for layout consistency
    const numberCodeMap = {
        Digit1: 0,
        Digit2: 1,
        Digit3: 2,
        Digit4: 3,
        Digit5: 4,
        Digit6: 5
    };
    
    const index = numberCodeMap[e.code];
    if (typeof index === 'number') {
        e.preventDefault();
        if (index < menuItems.length) {
            selectMenuItem(menuItems[index], index);
        }
    }

    // ESC key to return to Home
    if (e.key === 'Escape') {
        e.preventDefault();
        selectMenuItem(menuItems[0], 0);
    }
}

function addScanLine() {
    const scanLine = document.createElement('div');
    scanLine.className = 'scan-line';
    document.body.appendChild(scanLine);
}

function handleSectionLink(event) {
    const link = event.target.closest('[data-section-link]');
    if (!link) return;
    
    const sectionId = link.dataset.sectionLink;
    if (sectionId) {
        event.preventDefault();
        navigateToSection(sectionId);
    }
}
