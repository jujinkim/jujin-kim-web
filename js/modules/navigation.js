let menuItems = [];
const MOBILE_SHORTCUT_BREAKPOINT = 768;

function isMobileInputContext() {
    const isSmallViewport = window.innerWidth <= MOBILE_SHORTCUT_BREAKPOINT;
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    return isSmallViewport || isCoarsePointer;
}

export function initNavigation() {
    menuItems = document.querySelectorAll('.menu-item');

    menuItems.forEach(item => {
        item.addEventListener('click', () => selectMenuItem(item));
    });

    document.addEventListener('click', handleSectionLink);

    // Add keyboard shortcuts
    if (!isMobileInputContext()) {
        document.addEventListener('keydown', handleKeyboardShortcuts);
    }

    selectMenuItem(menuItems[0]);

    addScanLine();
}

export function navigateToSection(sectionId) {
    if (!menuItems.length) {
        menuItems = document.querySelectorAll('.menu-item');
    }

    const items = Array.from(menuItems);
    const targetItem = items.find(item => item.dataset.section === sectionId);
    if (targetItem) {
        selectMenuItem(targetItem);
    }
}

function selectMenuItem(menuItem) {
    const sectionId = menuItem.dataset.section;

    // Update active state
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    menuItem.classList.add('active');

    showSection(sectionId);
}

function showSection(sectionId) {
    const sections = document.querySelectorAll('.content-section');

    sections.forEach(section => {
        section.style.display = section.id === sectionId ? '' : 'none';
    });

    const targetSection = document.getElementById(sectionId);
    if (targetSection && sectionId === 'home') {
        import('./profile-ascii.js').then(module => {
            setTimeout(() => {
                module.initProfilePicture();
            }, 100);
        });
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
            selectMenuItem(menuItems[index]);
        }
    }

    // ESC key to return to Home
    if (e.key === 'Escape') {
        e.preventDefault();
        selectMenuItem(menuItems[0]);
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
