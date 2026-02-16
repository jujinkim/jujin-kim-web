import { CONTACT_EMAIL } from '../constants.js';

let currentInput = '';
let commandHistory = [];
let historyIndex = -1;
let isActive = false;
let isOpen = false;
let panel = null;
let toggleButton = null;
let closeButton = null;
let outputDiv = null;
let inputSpan = null;
let placeholderSpan = null;

const MOBILE_BREAKPOINT = 768;

function shouldDisableTerminalInput() {
    const isSmallViewport = window.innerWidth <= MOBILE_BREAKPOINT;
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    return isSmallViewport || isCoarsePointer;
}

function disableMobileTerminalUI() {
    if (toggleButton) {
        toggleButton.style.display = 'none';
        toggleButton.setAttribute('disabled', 'true');
        toggleButton.setAttribute('aria-expanded', 'false');
    }

    if (panel) {
        panel.classList.remove('is-open');
        panel.setAttribute('aria-hidden', 'true');
        panel.style.display = 'none';
    }

    document.body.classList.add('terminal-mobile-disabled');
    isActive = false;
    isOpen = false;
    document.body.classList.remove('terminal-open');
    document.removeEventListener('keydown', handleToggleShortcut);
    document.removeEventListener('keydown', handleTerminalInput);
}

const commands = {
    help: () => {
        return `Available commands:
  help     - Show this help message
  clear    - Clear terminal output
  about    - About Jujin Kim
  skills   - List technical skills
  contact  - Show contact information
  date     - Show current date and time
  ls       - List available sections
  cat      - Show section content
  matrix   - Toggle matrix rain effect
  
Use Shift+1~6 to navigate menu
Press / or the Terminal button to toggle`;
    },
    
    clear: () => {
        const outputDiv = document.querySelector('.terminal-output');
        if (outputDiv) {
            outputDiv.innerHTML = '';
        }
        return null;
    },
    
    about: () => {
        return `Jujin Kim - Software Developer
Building digital experiences that matter
Located in Suwon, South Korea`;
    },
    
    skills: () => {
        return `Technical Skills:
• App Development
• Game Development  
• Product Engineering
• Service Builder`;
    },
    
    contact: () => {
        return `Contact Information:
Email: ${CONTACT_EMAIL}
GitHub: github.com/jujinkim
LinkedIn: linkedin.com/in/jujinkim`;
    },
    
    date: () => {
        return new Date().toString();
    },
    
    ls: () => {
        return 'home  about  career  projects  technologies  contact';
    },
    
    cat: (args) => {
        const sections = ['home', 'about', 'career', 'projects', 'technologies', 'contact'];
        if (args && sections.includes(args[0])) {
            return `Use Shift+${sections.indexOf(args[0]) + 1} to view ${args[0]} section`;
        }
        return 'Usage: cat [section_name]';
    },
    
    matrix: () => {
        const matrixRain = document.getElementById('matrix-rain');
        if (matrixRain) {
            matrixRain.style.display = matrixRain.style.display === 'none' ? 'block' : 'none';
            return `Matrix rain ${matrixRain.style.display === 'none' ? 'disabled' : 'enabled'}`;
        }
        return 'Matrix rain not available';
    }
};

export function initTerminalInput() {
    panel = document.getElementById('terminal-panel');
    toggleButton = document.getElementById('terminal-toggle');
    if (!panel || !toggleButton) return;

    closeButton = panel.querySelector('.terminal-panel-close');
    outputDiv = panel.querySelector('.terminal-output');
    inputSpan = panel.querySelector('.terminal-input');
    placeholderSpan = panel.querySelector('.terminal-placeholder');
    if (!outputDiv || !inputSpan) return;

    if (shouldDisableTerminalInput()) {
        disableMobileTerminalUI();
        return;
    }

    panel.style.display = '';
    toggleButton.removeAttribute('disabled');
    document.body.classList.remove('terminal-mobile-disabled');
    isActive = true;

    toggleButton.addEventListener('click', () => toggleTerminal());
    if (closeButton) {
        closeButton.addEventListener('click', () => toggleTerminal(false));
    }

    document.addEventListener('keydown', handleToggleShortcut);
    document.addEventListener('keydown', handleTerminalInput);
}

export function deactivateTerminalInput() {
    isActive = false;
    document.removeEventListener('keydown', handleToggleShortcut);
    document.removeEventListener('keydown', handleTerminalInput);
}

function handleToggleShortcut(e) {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) {
        return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
    toggleTerminal();
}

function toggleTerminal(forceState) {
    if (!panel || !toggleButton) return;
    isOpen = typeof forceState === 'boolean' ? forceState : !isOpen;
    panel.classList.toggle('is-open', isOpen);
    panel.setAttribute('aria-hidden', (!isOpen).toString());
    toggleButton.setAttribute('aria-expanded', isOpen.toString());
    document.body.classList.toggle('terminal-open', isOpen);
    if (isOpen) {
        outputDiv.scrollTop = outputDiv.scrollHeight;
    }
    updatePlaceholder();
}

function handleTerminalInput(e) {
    if (!isActive || !isOpen || shouldDisableTerminalInput()) return;
    
    // Skip if modal is open or shift/ctrl is pressed
    if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
    
    switch(e.key) {
        case 'Enter':
            e.preventDefault();
            processCommand();
            updatePlaceholder();
            break;
            
        case 'Backspace':
            e.preventDefault();
            currentInput = currentInput.slice(0, -1);
            inputSpan.textContent = currentInput;
            updatePlaceholder();
            break;
            
        case 'ArrowUp':
            e.preventDefault();
            if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
                historyIndex++;
                currentInput = commandHistory[commandHistory.length - 1 - historyIndex];
                inputSpan.textContent = currentInput;
                updatePlaceholder();
            }
            break;
            
        case 'ArrowDown':
            e.preventDefault();
            if (historyIndex > 0) {
                historyIndex--;
                currentInput = commandHistory[commandHistory.length - 1 - historyIndex];
                inputSpan.textContent = currentInput;
                updatePlaceholder();
            } else if (historyIndex === 0) {
                historyIndex = -1;
                currentInput = '';
                inputSpan.textContent = '';
                updatePlaceholder();
            }
            break;
            
        default:
            // Only accept printable characters
            if (e.key.length === 1) {
                e.preventDefault();
                currentInput += e.key;
                inputSpan.textContent = currentInput;
                updatePlaceholder();
            }
            break;
    }
}

function processCommand() {
    if (!inputSpan || !outputDiv) return;

    if (!currentInput.trim()) {
        currentInput = '';
        inputSpan.textContent = '';
        return;
    }
    
    // Add to history
    commandHistory.push(currentInput);
    historyIndex = -1;
    
    // Parse command and arguments
    const parts = currentInput.trim().split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    // Add command to output
    const commandLine = document.createElement('div');
    commandLine.style.color = 'var(--terminal-highlight)';
    commandLine.textContent = `> ${currentInput}`;
    commandLine.style.opacity = '1';  // Ensure immediate visibility
    outputDiv.appendChild(commandLine);
    
    // Execute command
    let result;
    if (commands[cmd]) {
        result = commands[cmd](args);
    } else {
        result = `Command not found: ${cmd}. Type 'help' for available commands.`;
    }
    
    // Add result to output
    if (result) {
        const resultDiv = document.createElement('div');
        resultDiv.style.whiteSpace = 'pre-wrap';
        resultDiv.style.marginBottom = '10px';
        resultDiv.style.opacity = '1';  // Ensure immediate visibility
        resultDiv.textContent = result;
        outputDiv.appendChild(resultDiv);
    }
    
    // Scroll to bottom
    outputDiv.scrollTop = outputDiv.scrollHeight;
    
    // Clear input
    currentInput = '';
    inputSpan.textContent = '';
    updatePlaceholder();
}

function updatePlaceholder() {
    if (!placeholderSpan) return;
    const shouldShow = isOpen && currentInput.length === 0;
    placeholderSpan.style.display = shouldShow ? 'inline' : 'none';
}
