let currentSection = 'home';
let menuItems = [];
let currentMenuIndex = 0;
let isNavigating = false;

export function openHelpModal() {
    const modal = document.getElementById('help-modal');
    modal.classList.add('active');
}

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
    
    // Set Home as default active
    selectMenuItem(0);
    
    addScanLine();
    initHelpModal();
}

function highlightMenuItem(index) {
    menuItems.forEach((item, i) => {
        item.classList.toggle('focused', i === index);
    });
    currentMenuIndex = index;
    menuItems[index].focus();
}

function selectMenuItem(index) {
    const menuItem = menuItems[index];
    const sectionId = menuItem.dataset.section;
    
    menuItems.forEach(item => {
        item.classList.remove('active');
        // Keep all indicators as [ ] - background highlight is enough
        item.querySelector('.menu-indicator').textContent = '[ ]';
    });
    
    menuItem.classList.add('active');
    // Don't change the indicator for active item
    
    showSection(sectionId);
    currentSection = sectionId;
    highlightMenuItem(index);
}

function showSection(sectionId) {
    const sections = document.querySelectorAll('.content-section');
    
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.classList.add('typewriter');
        
        setTimeout(() => {
            targetSection.classList.remove('typewriter');
        }, 300);
    }
}

function handleKeyboardNavigation(e) {
    const modal = document.getElementById('help-modal');
    
    if (modal.classList.contains('active') && e.key === 'Escape') {
        e.preventDefault();
        closeHelpModal();
        return;
    }
    
    // Don't handle number keys if user is typing in an input
    if (document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'TEXTAREA') {
        return;
    }
    
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
        case 'g':
        case 'G':
            if (e.ctrlKey) {
                e.preventDefault();
                openHelpModal();
            }
            break;
    }
}

function navigateMenu(direction) {
    currentMenuIndex = (currentMenuIndex + direction + menuItems.length) % menuItems.length;
    highlightMenuItem(currentMenuIndex);
}

function initHelpModal() {
    const modal = document.getElementById('help-modal');
    const closeBtn = modal.querySelector('.modal-close');
    
    closeBtn.addEventListener('click', closeHelpModal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeHelpModal();
        }
    });
}

function closeHelpModal() {
    const modal = document.getElementById('help-modal');
    modal.classList.remove('active');
}

function addScanLine() {
    const scanLine = document.createElement('div');
    scanLine.className = 'scan-line';
    document.body.appendChild(scanLine);
}