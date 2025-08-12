let currentSection = 'home';
let menuItems = [];
let currentMenuIndex = 0;
let isNavigating = false;


export function initNavigation() {
    menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.content-section');
    
    menuItems.forEach((item, index) => {
        item.addEventListener('click', () => selectMenuItem(index));
        
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                selectMenuItem(index);
            }
        });
    });
    
    document.addEventListener('keydown', handleKeyboardNavigation);
    
    // Set Home as default active without animation
    selectMenuItem(0, true);
    
    addScanLine();
}

function highlightMenuItem(index) {
    menuItems.forEach((item, i) => {
        item.classList.toggle('focused', i === index);
    });
    currentMenuIndex = index;
    menuItems[index].focus();
}

function selectMenuItem(index, skipAnimation = false) {
    const menuItem = menuItems[index];
    const sectionId = menuItem.dataset.section;
    
    menuItems.forEach(item => {
        item.classList.remove('active');
    });
    
    menuItem.classList.add('active');
    
    showSection(sectionId, skipAnimation);
    currentSection = sectionId;
    highlightMenuItem(index);
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

function handleKeyboardNavigation(e) {
    
    // Don't handle navigation if user is typing in terminal (home section)
    if (currentSection === 'home') {
        // Handle Shift+number for menu navigation
        // Shift+1 = !, Shift+2 = @, etc.
        const shiftNumberMap = {
            '!': 0, '@': 1, '#': 2, '$': 3, '%': 4, '^': 5,
            '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5
        };
        
        if (e.shiftKey && shiftNumberMap.hasOwnProperty(e.key)) {
            e.preventDefault();
            const index = shiftNumberMap[e.key];
            if (index < menuItems.length) {
                selectMenuItem(index);
            }
            return;
        }
        // Let terminal input handler process other keys
        return;
    }
    
    // Normal navigation for non-home sections
    switch(e.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
            e.preventDefault();
            navigateMenu(-1);
            break;
        case 'ArrowDown':
        case 'ArrowRight':
            e.preventDefault();
            navigateMenu(1);
            break;
        case 'Enter':
            if (document.activeElement.classList.contains('menu-item')) {
                e.preventDefault();
                selectMenuItem(currentMenuIndex);
            }
            break;
        case 'Escape':
            e.preventDefault();
            selectMenuItem(0);
            break;
    }
    
    // Shift+number shortcuts work everywhere
    const shiftNumberMap = {
        '!': 0, '@': 1, '#': 2, '$': 3, '%': 4, '^': 5,
        '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5
    };
    
    if (e.shiftKey && shiftNumberMap.hasOwnProperty(e.key)) {
        e.preventDefault();
        const index = shiftNumberMap[e.key];
        if (index < menuItems.length) {
            selectMenuItem(index);
        }
    }
}

function navigateMenu(direction) {
    currentMenuIndex = (currentMenuIndex + direction + menuItems.length) % menuItems.length;
    highlightMenuItem(currentMenuIndex);
}


function addScanLine() {
    const scanLine = document.createElement('div');
    scanLine.className = 'scan-line';
    document.body.appendChild(scanLine);
}