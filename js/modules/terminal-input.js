import { CONTACT_EMAIL } from '../constants.js';

let currentInput = '';
let commandHistory = [];
let historyIndex = -1;
let isActive = false;

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
  
Use Shift+1~6 to navigate menu`;
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
• AI Enthusiast
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
    // Only activate on home section
    if (!document.getElementById('home')) return;
    
    // Create output div if it doesn't exist
    const homeContent = document.querySelector('#home .section-content');
    if (!homeContent) return;
    
    // Find or create terminal output area
    let outputDiv = homeContent.querySelector('.terminal-output');
    if (!outputDiv) {
        outputDiv = document.createElement('div');
        outputDiv.className = 'terminal-output no-animation';
        outputDiv.style.cssText = 'margin-top: 20px; color: var(--terminal-fg); min-height: 100px; opacity: 1;';
        
        // Insert before the cursor line
        const cursorLine = homeContent.querySelector('.cursor');
        if (cursorLine && cursorLine.parentNode) {
            cursorLine.parentNode.insertBefore(outputDiv, cursorLine);
        }
    }
    
    // Update cursor line to show input
    const cursorLine = homeContent.querySelector('.cursor');
    if (cursorLine) {
        cursorLine.innerHTML = `> <span class="terminal-input"></span>`;
    }
    
    isActive = true;
    
    // Add keyboard listener
    document.addEventListener('keydown', handleTerminalInput);
}

export function deactivateTerminalInput() {
    isActive = false;
    document.removeEventListener('keydown', handleTerminalInput);
}

function handleTerminalInput(e) {
    if (!isActive) return;
    
    // Skip if modal is open or shift/ctrl is pressed
    if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
    
    const inputSpan = document.querySelector('.terminal-input');
    const outputDiv = document.querySelector('.terminal-output');
    
    if (!inputSpan || !outputDiv) return;
    
    switch(e.key) {
        case 'Enter':
            e.preventDefault();
            processCommand();
            break;
            
        case 'Backspace':
            e.preventDefault();
            currentInput = currentInput.slice(0, -1);
            inputSpan.textContent = currentInput;
            break;
            
        case 'ArrowUp':
            e.preventDefault();
            if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
                historyIndex++;
                currentInput = commandHistory[commandHistory.length - 1 - historyIndex];
                inputSpan.textContent = currentInput;
            }
            break;
            
        case 'ArrowDown':
            e.preventDefault();
            if (historyIndex > 0) {
                historyIndex--;
                currentInput = commandHistory[commandHistory.length - 1 - historyIndex];
                inputSpan.textContent = currentInput;
            } else if (historyIndex === 0) {
                historyIndex = -1;
                currentInput = '';
                inputSpan.textContent = '';
            }
            break;
            
        default:
            // Only accept printable characters
            if (e.key.length === 1) {
                e.preventDefault();
                currentInput += e.key;
                inputSpan.textContent = currentInput;
            }
            break;
    }
}

function processCommand() {
    const inputSpan = document.querySelector('.terminal-input');
    const outputDiv = document.querySelector('.terminal-output');
    
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
}
