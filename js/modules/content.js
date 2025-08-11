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
            <p>📧 <a href="mailto:jujin@jujinkim.com">jujin@jujinkim.com</a></p>
            <p>💻 <a href="https://github.com/jujinkim" target="_blank">github.com/jujinkim</a></p>
            <p>💼 <a href="https://linkedin.com/in/jujinkim" target="_blank">linkedin.com/in/jujinkim</a></p>
            <p>📝 <a href="https://blog.jujinkim.com" target="_blank">blog.jujinkim.com</a></p>
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
            <p>  └─ Developing Samsung Weather client for millions of users</p>
            <p>  └─ Building robust Android applications with clean architecture</p>
            <p>  └─ Tech: Kotlin, Android SDK, Clean Architecture, MVVM</p>
        </div>
        <br>
        <div class="career-entry">
            <p>> [Previous] Software Engineer @ Samsung Galaxy Store</p>
            <p>  └─ Contributed to Galaxy Store development</p>
            <p>  └─ Enhanced user experience and app performance</p>
            <p>  └─ Tech: Kotlin, Android, Material Design</p>
        </div>
        <br>
        <div class="career-entry">
            <p>> Specializations:</p>
            <p>  └─ Android Application Development</p>
            <p>  └─ AI-Powered Development Tools</p>
            <p>  └─ Clean Architecture & Design Patterns</p>
        </div>
    `;
}

function loadProjectsSection() {
    const projectsSection = document.querySelector('#projects .section-content');
    projectsSection.innerHTML = `
        <h3>>> Featured Projects</h3>
        <div class="project">
            <p>[1] <strong>Samsung Weather Client</strong></p>
            <p>    Weather application for Samsung devices</p>
            <p>    Used by millions of users worldwide</p>
            <p>    Tech: Kotlin, Android, Material Design, RESTful APIs</p>
            <p>    Status: <span style="color: var(--terminal-highlight)">ACTIVE</span></p>
        </div>
        <br>
        <div class="project">
            <p>[2] <strong>Galaxy Store Contributions</strong></p>
            <p>    Enhanced app store experience for Samsung users</p>
            <p>    Performance optimizations and feature development</p>
            <p>    Tech: Kotlin, Android SDK, Clean Architecture</p>
            <p>    Status: <span style="color: var(--terminal-highlight)">COMPLETED</span></p>
        </div>
        <br>
        <div class="project">
            <p>[3] <strong>AI-Enhanced Development Workflow</strong></p>
            <p>    Leveraging AI tools for code quality and rapid prototyping</p>
            <p>    Tech: GitHub Copilot, ChatGPT, Claude</p>
            <p>    Status: <span style="color: var(--terminal-highlight)">ONGOING</span></p>
        </div>
        <br>
        <h3>>> Core Skills</h3>
        <pre>
Languages:     [████████████████████] Kotlin
               [█████████████████   ] Java
               [████████████        ] JavaScript/TypeScript
               [██████████          ] Python

Frameworks:    [████████████████████] Android SDK
               [█████████████████   ] Jetpack Compose
               [████████████        ] Spring Boot

Tools:         [████████████████████] Android Studio
               [█████████████████   ] Git/GitHub
               [████████████████    ] AI Dev Tools
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
    contactSection.innerHTML = `
        <div class="contact-info">
            <p>> Email:    <a href="mailto:jujin@jujinkim.com">jujin@jujinkim.com</a></p>
            <p>> GitHub:   <a href="https://github.com/jujinkim" target="_blank">github.com/jujinkim</a></p>
            <p>> LinkedIn: <a href="https://linkedin.com/in/jujinkim" target="_blank">linkedin.com/in/jujinkim</a></p>
            <p>> Blog:     <a href="https://blog.jujinkim.com" target="_blank">blog.jujinkim.com</a></p>
            <p>> Website:  <a href="https://jujinkim.com" target="_blank">jujinkim.com</a></p>
            <br>
            <p>> Location: Seoul, South Korea 🇰🇷</p>
            <p>> Timezone: UTC+9 (KST)</p>
            <br>
            <div style="padding: 20px 0; color: var(--terminal-accent);">
                <p style="color: var(--terminal-highlight); font-weight: bold;">Feel free to reach out for collaborations or just a chat!</p>
                <br>
                <p>> Open for: Freelance projects</p>
                <p>> Interested in: Open source contributions</p>
                <p>> Available for: Technical consulting</p>
            </div>
            <br>
            <p class="cursor">> Waiting for connection..._</p>
        </div>
    `;
}