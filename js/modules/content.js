function calculateAge() {
    const birthDate = new Date(1992, 9, 20); // October 20, 1992 (month is 0-indexed)
    const today = new Date();
    
    let years = today.getFullYear() - birthDate.getFullYear();
    
    // Calculate the current year's birthday
    const thisYearBirthday = new Date(today.getFullYear(), 9, 20);
    
    // If birthday hasn't occurred this year, subtract one year
    if (today < thisYearBirthday) {
        years--;
    }
    
    // Calculate days since last birthday
    const lastBirthday = today < thisYearBirthday 
        ? new Date(today.getFullYear() - 1, 9, 20)
        : thisYearBirthday;
    
    const daysSinceBirthday = Math.floor((today - lastBirthday) / (1000 * 60 * 60 * 24));
    
    // Calculate percentage of year passed (0-9)
    const yearProgress = Math.floor((daysSinceBirthday / 365) * 10);
    
    // Cap at 9 to keep single digit
    const decimal = Math.min(yearProgress, 9);
    
    return `v${years}.${decimal}`;
}

export function initContent() {
    loadHomeSection();
    loadAboutSection();
    loadCareerSection();
    loadProjectsSection();
    loadTechnologiesSection();
    loadContactSection();
}

function loadHomeSection() {
    const homeSection = document.querySelector('#home .section-content');
    homeSection.innerHTML = `
        <pre style="color: var(--terminal-highlight);">
╔══════════════════════════════════════════════════════════╗
║                   JUJIN KIM TERMINAL                     ║
║                Software Engineer ${calculateAge()}                   ║
╚══════════════════════════════════════════════════════════╝
        </pre>
        <div style="animation: typewriter 0.5s steps(20);">
            <p>> Initializing system... <span style="color: var(--terminal-highlight)">[OK]</span></p>
            <p>> Loading profile... <span style="color: var(--terminal-highlight)">[OK]</span></p>
            <p>> Connecting to GitHub... <span style="color: var(--terminal-highlight)">[OK]</span></p>
        </div>
        <br>
        <div style="color: var(--terminal-accent); padding: 20px 0;">
            <p style="font-size: 18px; font-weight: bold; color: var(--terminal-highlight);">JUJIN KIM</p>
            <p>Android App Developer @ Samsung</p>
            <p>Building Weather App for millions of users</p>
            <br>
            <p>◆ Kotlin Expert     ◆ Clean Architecture</p>
            <p>◆ AI-Powered Dev    ◆ Open Source Contributor</p>
            <br>
            <p>📍 Seoul, South Korea</p>
        </div>
        <br>
        <p style="color: var(--terminal-highlight);">> Quick Access:</p>
        <div style="margin-left: 20px;">
            <p>📧 <a href="mailto:jujin@jujin.kim">jujin@jujin.kim</a></p>
            <p>💻 <a href="https://github.com/jujinkim" target="_blank">github.com/jujinkim</a></p>
            <p>💼 <a href="https://linkedin.com/in/jujinkim" target="_blank">linkedin.com/in/jujinkim</a></p>
            <p>📝 <a href="https://jujin.dev" target="_blank">jujin.dev</a></p>
        </div>
        <br>
        <p style="color: var(--terminal-dim);">> Use arrow keys to navigate menu or press number for quick select</p>
        <p class="cursor">> _</p>
    `;
}

function loadAboutSection() {
    const aboutSection = document.querySelector('#about .section-content');
    aboutSection.innerHTML = `
        <p>> Hello, World! I'm Jujin Kim.</p>
        <p>> Software Engineer | Android App Developer | Tech Enthusiast</p>
        <p>> Currently working at Samsung, developing apps used by millions</p>
        <p>> Specializing in Android development with Kotlin and clean architecture</p>
        <br>
        <p>> Professional Philosophy:</p>
        <p>  "Code is like humor. When you have to explain it, it's bad."</p>
        <br>
        <p>> Current Focus:</p>
        <p>  • Developing Samsung's weather client</p>
        <p>  • Leveraging AI tools for enhanced development</p>
        <p>  • Exploring innovative solutions across platforms</p>
        <br>
        <p class="cursor">> Building the future of mobile experiences_</p>
    `;
}

function loadCareerSection() {
    const careerSection = document.querySelector('#career .section-content');
    careerSection.innerHTML = `
        <div class="career-entry">
            <p>> [Present] Software Engineer @ Samsung</p>
            <p>  └─ Developing Samsung Weather client</p>
            <p>  └─ Android application development</p>
            <p>  └─ Tech: Kotlin, Android</p>
        </div>
        <br>
        <div class="career-entry">
            <p>> [Previous] Software Engineer @ Samsung Galaxy Store</p>
            <p>  └─ Contributed to Galaxy Store development</p>
            <p>  └─ Tech: Kotlin, Android</p>
        </div>
        <br>
        <div class="career-entry">
            <p>> GitHub Achievements:</p>
            <p>  └─ Arctic Code Vault Contributor</p>
            <p>  └─ Pull Shark x2</p>
        </div>
    `;
}

function loadProjectsSection() {
    const projectsSection = document.querySelector('#projects .section-content');
    projectsSection.innerHTML = `
        <h3>>> Professional Projects</h3>
        <div class="project">
            <p>[1] <strong>Samsung Weather Client</strong></p>
            <p>    Weather application pre-installed on Samsung Galaxy devices</p>
            <p>    Serving millions of users globally with real-time weather data</p>
            <p>    Tech: Kotlin, Jetpack Compose, Clean Architecture, RESTful APIs</p>
            <p>    Status: <span style="color: var(--terminal-highlight)">ACTIVE</span></p>
        </div>
        <br>
        <div class="project">
            <p>[2] <strong>Samsung Galaxy Store</strong></p>
            <p>    Official app marketplace for Samsung Galaxy devices</p>
            <p>    Enhanced performance and implemented new features</p>
            <p>    Tech: Kotlin, Android SDK, Material Design, Backend Integration</p>
            <p>    Status: <span style="color: var(--terminal-highlight)">COMPLETED</span></p>
        </div>
        <br>
        <h3>>> Personal Projects</h3>
        <div class="project">
            <p>[3] <strong>Frequaw Legacy</strong></p>
            <p>    Android widget application for frequency analysis</p>
            <p>    Open source project with community contributions</p>
            <p>    Tech: Kotlin, Android Widgets, Material Design</p>
            <p>    <a href="https://github.com/jujinkim/Frequaw-legacy" target="_blank">→ View on GitHub</a></p>
        </div>
        <br>
        <div class="project">
            <p>[4] <strong>Feelring AI Alarm</strong></p>
            <p>    AI-powered alarm service prototype with music generation</p>
            <p>    Innovative wake-up experience using AI-generated content</p>
            <p>    Tech: Python, AI/ML, Music Generation APIs</p>
            <p>    <a href="https://github.com/jujinkim/feelring-prototype-musicgen" target="_blank">→ View on GitHub</a></p>
        </div>
        <br>
        <div class="project">
            <p>[5] <strong>Language Learning Telegram Bot</strong></p>
            <p>    Interactive bot for language learning assistance</p>
            <p>    Automated language practice and vocabulary building</p>
            <p>    Tech: Python, Telegram Bot API, Natural Language Processing</p>
            <p>    <a href="https://github.com/jujinkim/learn-lang-telegram-bot" target="_blank">→ View on GitHub</a></p>
        </div>
        <br>
        <h3>>> Languages Used (from GitHub)</h3>
        <pre>
[████████████████████] Kotlin
[████████████        ] Python  
[██████████          ] JavaScript
[████████            ] C#
[██████              ] HTML
        </pre>
    `;
}

function loadTechnologiesSection() {
    const techSection = document.querySelector('#technologies .section-content');
    techSection.innerHTML = `
        <div class="tech-grid">
            <div class="tech-category">
                <h3>>> Mobile Development</h3>
                <p>• Kotlin</p>
                <p>• Android SDK</p>
                <p>• Jetpack Compose</p>
                <p>• Material Design</p>
                <p>• Clean Architecture</p>
            </div>
            <br>
            <div class="tech-category">
                <h3>>> Architecture & Patterns</h3>
                <p>• MVVM / MVP</p>
                <p>• Clean Architecture</p>
                <p>• Dependency Injection</p>
                <p>• Repository Pattern</p>
                <p>• Observer Pattern</p>
            </div>
            <br>
            <div class="tech-category">
                <h3>>> Tools & Platforms</h3>
                <p>• Android Studio</p>
                <p>• IntelliJ IDEA</p>
                <p>• Git / GitHub</p>
                <p>• Firebase</p>
                <p>• RESTful APIs</p>
            </div>
            <br>
            <div class="tech-category">
                <h3>>> AI & Innovation</h3>
                <p>• GitHub Copilot</p>
                <p>• ChatGPT / Claude</p>
                <p>• AI-Powered Prototyping</p>
                <p>• Code Quality Enhancement</p>
                <p>• Cross-Platform Solutions</p>
            </div>
        </div>
    `;
}

function loadContactSection() {
    const contactSection = document.querySelector('#contact .section-content');
    
    // Get current KST time
    const kstTime = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Seoul',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    });
    
    contactSection.innerHTML = `
        <div class="contact-info">
            <p>> Email:    <a href="mailto:jujin@jujin.kim">jujin@jujin.kim</a></p>
            <p>> GitHub:   <a href="https://github.com/jujinkim" target="_blank">github.com/jujinkim</a></p>
            <p>> LinkedIn: <a href="https://linkedin.com/in/jujinkim" target="_blank">linkedin.com/in/jujinkim</a></p>
            <p>> Blog:     <a href="https://jujin.dev" target="_blank">jujin.dev</a></p>
            <p>> Website:  <a href="https://jujin.kim" target="_blank">jujin.kim</a></p>
            <br>
            <p>> Location: Suwon, South Korea 🇰🇷</p>
            <p>> Timezone: UTC+9 (KST) - Current: ${kstTime}</p>
            <br>
            <div style="padding: 20px 0; color: var(--terminal-accent);">
                <p style="color: var(--terminal-highlight); font-weight: bold;">내 줏대로 살자 - Living by my own principles</p>
                <br>
                <p>> Philosophy: Building something that makes the world a better place</p>
                <p>> Currently: Learning how to be cool</p>
                <p>> Open to: Meaningful collaborations</p>
            </div>
            <br>
            <p class="cursor">> Waiting for connection..._</p>
        </div>
    `;
}