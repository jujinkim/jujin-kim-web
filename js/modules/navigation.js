let currentSection = 'home';
let menuItems = [];

export function initNavigation() {
    menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach((item, index) => {
        item.addEventListener('click', () => selectMenuItem(item, index));
    });
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Set Home as default active without animation
    selectMenuItem(menuItems[0], 0, true);
    
    addScanLine();
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
    
    // Deactivate terminal input when leaving home
    if (currentSection === 'home' && sectionId !== 'home') {
        import('./terminal-input.js').then(module => {
            module.deactivateTerminalInput();
        });
    }
    
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
        
        // Re-initialize profile picture and terminal input when showing home section
        if (sectionId === 'home') {
            import('./profile-ascii.js').then(module => {
                setTimeout(() => {
                    module.initProfilePicture();
                }, 100);
            });
            
            import('./terminal-input.js').then(module => {
                setTimeout(() => {
                    module.initTerminalInput();
                }, 200);
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
    // Shift+number shortcuts for menu navigation
    const shiftNumberMap = {
        '!': 0, '@': 1, '#': 2, '$': 3, '%': 4, '^': 5,
        '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5
    };
    
    if (e.shiftKey && shiftNumberMap.hasOwnProperty(e.key)) {
        e.preventDefault();
        const index = shiftNumberMap[e.key];
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