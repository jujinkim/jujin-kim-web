import { room3d } from './room3d.js?v=20261119.11';
import { CONTACT_EMAIL } from '../constants.js?v=20261119.11';
import { toggleSwarm, toggleSound, swarmGeneration, resetSwarm, swarmPulse } from './animations.js?v=20261119.11';
import { navigateToSection, sectionIds, activeSection } from './navigation.js?v=20261119.11';
import { setLamp, roomPulse } from './room-life.js?v=20261119.11';
import { setTheme } from './theme.js?v=20261119.11';

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
    const isSmallViewport = document.getElementById('monitor-glass').clientWidth <= MOBILE_BREAKPOINT;
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

// name -> { help, run(args) -> text | null }. help lists them in this order.
const commands = new Map();

export function registerCommand(name, help, run) {
    commands.set(name, { help, run });
}

// "~/projects", "projects/", "about.md", "tech" -> a section id, or null.
function sectionFor(arg) {
    if (arg === undefined || arg === '~' || arg === '..' || arg === '/') return 'home';
    const name = arg.toLowerCase().replace(/^(~\/|\.\/)/, '').replace(/\/$/, '').replace(/\.md$/, '');
    const alias = { welcome: 'home', tech: 'technologies', career: 'about', skills: 'projects' }[name] ?? name;
    return sectionIds().includes(alias) ? alias : null;
}

function go(command, arg) {
    const target = sectionFor(arg);
    if (!target) return `${command}: no such file or directory: ${arg}`;
    if (target === activeSection()) return `already in ~/${target}`;
    navigateToSection(target);
    return null;
}

registerCommand('help', 'Show this help message', () => {
    const width = Math.max(...[...commands.keys()].map((name) => name.length));
    const rows = [...commands].map(([name, { help }]) => `  ${name.padEnd(width)}  ${help}`);
    return `Available commands:\n${rows.join('\n')}\n\nUse 1~4 to navigate menu\nPress / or the Terminal button to toggle`;
});
registerCommand('ls', 'List sections', () => sectionIds().map((id) => `${id}/`).join('  '));
registerCommand('cd', 'Go to a section: cd projects', (args) => go('cd', args[0]));
registerCommand('cat', 'Print a section: cat about.md', (args) => go('cat', args[0]));
registerCommand('open', 'Same as cd', (args) => go('open', args[0]));
registerCommand('about', 'Go to About & Career', () => go('cd', 'about'));
registerCommand('skills', 'Go to Projects & Skills', () => go('cd', 'projects'));
registerCommand(
    'contact',
    'Show contact information',
    () => `Contact Information:\nEmail: ${CONTACT_EMAIL}\nGitHub: github.com/jujinkim\nLinkedIn: linkedin.com/in/jujinkim`
);
registerCommand('date', 'Show current date and time', () => new Date().toString());
registerCommand('lamp', 'Desk lamp: lamp [on|off]', (args) => {
    const on = setLamp(args[0] === 'on' ? true : args[0] === 'off' ? false : undefined);
    return `Lamp ${on ? 'on' : 'off'}`;
});
registerCommand('perf', 'Show frame timing and the state of the 3D room', () => {
    const d = window.crtDiagnostics;
    const frames = (d?.samples || []).slice(-4).map((s) => `${s.fps.toFixed(0)}fps p95 ${s.p95.toFixed(0)}ms${s.slow ? ' slow' : ''}`);
    return `${room3d.status()}\nDisplay: ${d?.mode || 'unknown'}${d?.reason ? ` (${d.reason})` : ''}, ${innerWidth}x${innerHeight} @${devicePixelRatio}x\nFrames while interacting: ${frames.join(' | ') || 'no samples yet'}`;
});
registerCommand('room', 'Look around the room (drag, scroll; any key returns). room on: restart the 3D room', (args) => {
    if (args[0] === 'on') {
        room3d.retry();
        return 'Restarting the 3D room...';
    }
    if (!room3d.ready) return 'The 3D room is off in this tab. Type "room on" to try again, "perf" to see why.';
    return room3d.look(true) ? 'Looking at the room. Drag to look around, scroll to zoom, click or any key to return.' : 'Not available in this display mode';
});
registerCommand('pulse', 'Send a pulse through the swarm', () => {
    roomPulse();
    return swarmPulse() ? 'Pulse sent. Struck particles return from the edge.' : 'Swarm is not running';
});
registerCommand('theme', 'Screen theme: theme light|dark|system', (args) => {
    if (!['light', 'dark', 'system'].includes(args[0])) return 'usage: theme light|dark|system';
    setTheme(args[0]);
    return `Theme ${args[0]}`;
});
registerCommand('swarm', 'Toggle the particle swarm behind the text', () => `Swarm ${toggleSwarm() ? 'enabled' : 'disabled'}`);
registerCommand('gen', "Show the swarm's current generation", () => {
    const gen = swarmGeneration();
    return gen === null ? 'Swarm is not running' : `Generation ${gen}. It evolves while you move the pointer.`;
});
registerCommand('reset', "Restart the swarm's lineage", () =>
    resetSwarm() ? 'Lineage reset to generation 0' : 'Swarm is not running'
);
registerCommand('sound', 'Toggle sound', () => {
    const on = toggleSound();
    return on === null ? 'Swarm is not running' : `Sound ${on ? 'on' : 'off'}`;
});
registerCommand('reboot', 'Power-cycle the monitor', () => {
    toggleTerminal(false);
    window.dispatchEvent(new CustomEvent('reboot-requested'));
    return null;
});
registerCommand('clear', 'Clear terminal output', () => {
    if (outputDiv) outputDiv.innerHTML = '';
    return null;
});

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

    if (e.ctrlKey || e.altKey || e.metaKey) return;

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
    const parts = currentInput.trim().split(/\s+/);
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
    if (commands.has(cmd)) {
        result = commands.get(cmd).run(args);
        window.dispatchEvent(new CustomEvent('terminal-command', { detail: { name: cmd } }));
    } else {
        result = `Command not found: ${cmd}. Type 'help' for available commands.`;
    }

    // Add result to output
    if (result) {
        const resultDiv = document.createElement('div');
        resultDiv.style.whiteSpace = 'pre-wrap';
        resultDiv.style.marginBottom = '0';
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
