import { CONTACT_EMAIL } from '../constants.js';
import { toggleMatrixRain } from './animations.js';

let panel;
let toggleButton;
let input;
let output;
let lastFocused;
let historyIndex = 0;
let draft = '';
const commandHistory = [];
const desktop = window.matchMedia('(min-width: 769px) and (pointer: fine)');

const commands = {
    help: () => `Available commands:
  help     Show this help message
  clear    Clear terminal output
  about    About Jujin Kim
  skills   Technical skills
  contact  Contact information
  date     Current date and time
  matrix   Toggle matrix rain inside this panel

Shift+1–4: Home / Work / About / Practice
Press / to open. Escape to close.`,
    clear: () => { output.replaceChildren(); return null; },
    about: () => 'Jujin Kim — Software Engineer / Developer.\nSoftware, thoughtfully made.\nBased in Suwon, South Korea.',
    skills: () => 'Android development / Kotlin / Java\nGames, VR/AR, and interactive experiments\nAI-assisted personal projects\nMachine learning: hands-on learning and experimentation',
    contact: () => `Email: ${CONTACT_EMAIL}
GitHub: github.com/jujinkim
LinkedIn: linkedin.com/in/jujinkim
Blog: jujin.dev`,
    date: () => new Date().toString(),
    matrix: () => `Matrix rain ${toggleMatrixRain() ? 'enabled' : 'disabled'}.`
};

export function initTerminalInput() {
    panel = document.getElementById('terminal-panel');
    toggleButton = document.getElementById('terminal-toggle');
    input = document.getElementById('terminal-input');
    output = panel?.querySelector('.terminal-output');
    if (!panel || !toggleButton || !input || !output) return;

    const updateAvailability = () => {
        toggleButton.hidden = !desktop.matches;
        if (!desktop.matches) toggleTerminal(false, false);
    };
    desktop.addEventListener('change', updateAvailability);
    updateAvailability();
    toggleButton.addEventListener('click', () => toggleTerminal(panel.hidden));
    panel.querySelector('.terminal-panel-close').addEventListener('click', () => toggleTerminal(false));
    panel.querySelector('form').addEventListener('submit', event => {
        event.preventDefault();
        processCommand();
    });
    document.addEventListener('keydown', event => {
        if (!desktop.matches || event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.key === 'Escape' && !panel.hidden) {
            event.preventDefault();
            event.stopImmediatePropagation();
            toggleTerminal(false);
        } else if (event.key === '/' && !event.target.closest('input, textarea, select, [contenteditable="true"]')) {
            event.preventDefault();
            toggleTerminal(panel.hidden);
        }
    });
    input.addEventListener('keydown', event => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        event.preventDefault();
        if (historyIndex === commandHistory.length) draft = input.value;
        historyIndex = Math.max(0, Math.min(commandHistory.length, historyIndex + (event.key === 'ArrowUp' ? -1 : 1)));
        input.value = commandHistory[historyIndex] ?? draft;
        input.setSelectionRange(input.value.length, input.value.length);
    });
}

export function deactivateTerminalInput() {
    toggleTerminal(false);
    if (toggleButton) toggleButton.hidden = true;
}

function toggleTerminal(open, restoreFocus = true) {
    if (!panel || !toggleButton) return;
    if (open && !desktop.matches) return;
    const wasOpen = !panel.hidden;
    if (open === wasOpen) return;
    if (open) lastFocused = document.activeElement;
    panel.hidden = !open;
    toggleButton.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('terminal-open', open);
    window.dispatchEvent(new CustomEvent('terminal-state-changed', { detail: { open } }));
    if (open) {
        input.focus({ preventScroll: true });
        output.scrollTop = output.scrollHeight;
    } else if (restoreFocus) {
        (lastFocused?.isConnected ? lastFocused : toggleButton).focus({ preventScroll: true });
    }
}

function processCommand() {
    const value = input.value.trim();
    if (!value) return;
    commandHistory.push(value);
    if (commandHistory.length > 100) commandHistory.shift();
    historyIndex = commandHistory.length;
    draft = '';
    const prompt = document.createElement('p');
    prompt.className = 'terminal-command';
    prompt.textContent = `> ${value}`;
    output.append(prompt);
    const command = value.split(/\s+/)[0].toLowerCase();
    const result = Object.hasOwn(commands, command) ? commands[command]() : `Command not found: ${command}. Type "help" for available commands.`;
    if (result) {
        const line = document.createElement('p');
        line.textContent = result;
        output.append(line);
    }
    while (output.childElementCount > 200) output.firstElementChild.remove();
    input.value = '';
    output.scrollTop = output.scrollHeight;
}
