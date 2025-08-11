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
            <p>📍 Suwon, South Korea</p>
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
        <p>> Software Engineer | Application Developer</p>
        <p>> Based in Suwon, Republic of Korea</p>
        <br>
        <p>> Currently working at Samsung Electronics</p>
        <p>> Developing Weather Client for Samsung devices</p>
        <p>> Previously worked on Galaxy Store development</p>
        <br>
        <p>> Education:</p>
        <p>  • Bachelor of Computer Science</p>
        <p>  • Namseoul University (2011-2016)</p>
        <br>
        <p>> Experience:</p>
        <p>  • 7+ years in Android development</p>
        <p>  • Former Mash-up Android team leader</p>
        <p>  • Microsoft Student Partner alumnus</p>
        <br>
        <p class="cursor">> Building elegant mobile solutions_</p>
    `;
}

function loadCareerSection() {
    const careerSection = document.querySelector('#career .section-content');
    careerSection.innerHTML = `
        <div class="career-entry">
            <p>> [2020-Present] Samsung Electronics</p>
            <p>  └─ Weather Client App Developer</p>
            <p>  └─ Android application development</p>
            <p>  └─ Tech: Kotlin, Android</p>
        </div>
        <br>
        <div class="career-entry">
            <p>> [2017-2020] Samsung Electronics</p>
            <p>  └─ Galaxy Store Client App Developer</p>
            <p>  └─ Android application development</p>
            <p>  └─ Tech: Kotlin, Java, Android</p>
        </div>
        <br>
        <div class="career-entry">
            <p>> [2015-2016] Namseoul University</p>
            <p>  └─ VR/AR Student Researcher</p>
            <p>  └─ Tech: Unity, Eon, VR, AR</p>
        </div>
        <br>
        <div class="career-entry">
            <p>> [2015-2016] Microsoft Student Partners</p>
            <p>  └─ MSP Program Participant</p>
            <p>  └─ Student Developer Community</p>
        </div>
        <br>
        <div class="career-entry">
            <p>> [2014-2016] Freelance Developer</p>
            <p>  └─ Web and application development</p>
            <p>  └─ Tech: HTML, JavaScript, PHP, C#</p>
        </div>
        <br>
        <div class="career-entry">
            <p>> Education:</p>
            <p>  └─ B.S. Computer Science</p>
            <p>  └─ Namseoul University (2011-2016)</p>
        </div>
    `;
}

function loadProjectsSection() {
    const projectsSection = document.querySelector('#projects .section-content');
    projectsSection.innerHTML = `
        <h3>>> Professional Projects</h3>
        <div class="project">
            <p>[*] <strong>Samsung Weather Client</strong></p>
            <p>    Weather application for Samsung devices</p>
            <p>    Used by millions of users</p>
            <p>    Tech: Kotlin, Android</p>
            <p>    Status: <span style="color: var(--terminal-highlight)">ACTIVE</span></p>
        </div>
        <br>
        <div class="project">
            <p>[*] <strong>Samsung Galaxy Store</strong></p>
            <p>    App marketplace for Samsung devices</p>
            <p>    Tech: Kotlin, Android</p>
            <p>    Status: <span style="color: var(--terminal-highlight)">COMPLETED</span></p>
        </div>
        <br>
        <h3>>> Personal Projects</h3>
        <div class="project">
            <p>[2021] <strong>Frequaw</strong></p>
            <p>      Android app providing frequently used apps list</p>
            <p style="color: var(--terminal-dim);">      Widget for quick access to your favorite apps</p>
            <p>      <a href="https://play.google.com/store/apps/details?id=com.jujinkim.frequaw" target="_blank">→ View on Play Store</a></p>
        </div>
        <br>
        <div class="project">
            <p>[2020] <strong>Turnipism</strong></p>
            <p>      Animal Crossing Turnip price calculator</p>
            <p style="color: var(--terminal-dim);">      Helps maximize profits in Animal Crossing: New Horizons</p>
            <p>      <a href="https://play.google.com/store/apps/details?id=com.jujinkim.acturnip" target="_blank">→ View on Play Store</a></p>
        </div>
        <br>
        <div class="project">
            <p>[2018] <strong>WeatherBear</strong></p>
            <p>      Weather and fine dust information app</p>
            <p style="color: var(--terminal-dim);">      Cute bear character delivers weather updates</p>
            <p style="color: var(--terminal-dim);">      Team Olaf project at Mash-up</p>
            <p>      <a href="https://play.google.com/store/apps/details?id=com.mashupgroup.weatherbear" target="_blank">→ View on Play Store</a></p>
        </div>
        <br>
        <div class="project">
            <p>[2016] <strong>Seoul Luci Festival Project</strong></p>
            <p>      Media facade projection using Kinect</p>
            <p>      Dance capture displayed on library building</p>
            <p style="color: var(--terminal-dim);">      Interactive art installation for public event</p>
            <p>      Tech: KinectV2, Unity3D</p>
        </div>
        <br>
        <div class="project">
            <p>[2016] <strong>AI Game Learning Project</strong></p>
            <p>      Genetic algorithm-based AI for dodging missiles</p>
            <p style="color: var(--terminal-dim);">      Self-learning AI improves through generations</p>
            <p>      <a href="https://youtu.be/yISf3vsUQpc" target="_blank">→ Watch on YouTube</a></p>
            <p>      Tech: C#, Genetic Algorithm</p>
        </div>
        <br>
        <div class="project">
            <p>[2016] <strong>"Flee or Face" VR Game</strong></p>
            <p>      FPS VR multiplayer game</p>
            <p style="color: var(--terminal-dim);">      Immersive virtual reality combat experience</p>
            <p>      Tech: VR, Unity, Multiplayer</p>
        </div>
        <br>
        <div class="project">
            <p>[2015] <strong>Billiards Visual Effect Project</strong></p>
            <p>      OpenCV-based visual effects for mini pocket ball</p>
            <p style="color: var(--terminal-dim);">      Real-time computer vision for game enhancement</p>
            <p>      <a href="https://youtu.be/DUXIdIJ6ylM" target="_blank">→ Watch on YouTube</a></p>
            <p>      Tech: C++, OpenCV</p>
        </div>
        <br>
        <div class="project">
            <p>[2015] <strong>AR Photozone for Kids</strong></p>
            <p>      AR experience with historical figures</p>
            <p style="color: var(--terminal-dim);">      Educational AR featuring King Sejong and inventions</p>
            <p>      Tech: AR, Unity</p>
        </div>
        <br>
        <div class="project">
            <p>[2012] <strong>Automatic Game Bot</strong></p>
            <p>      2D puzzle game automation</p>
            <p style="color: var(--terminal-dim);">      Screen RGB value reading for automated gameplay</p>
            <p>      Tech: Game Automation</p>
        </div>
    `;
}

function loadTechnologiesSection() {
    const techSection = document.querySelector('#technologies .section-content');
    techSection.innerHTML = `
        <div class="tech-grid">
            <div class="tech-category">
                <h3>>> Primary Skills</h3>
                <p>• Android Development</p>
                <p>• Kotlin</p>
                <p>• Java</p>
            </div>
            <br>
            <div class="tech-category">
                <h3>>> Additional Skills</h3>
                <p>• Unity C#</p>
                <p>• JavaScript</p>
                <p>• Web Development</p>
            </div>
            <br>
            <div class="tech-category">
                <h3>>> Experience Areas</h3>
                <p>• VR/AR Development</p>
                <p>• Game Development</p>
                <p>• Mobile Applications</p>
                <p>• Media Facades</p>
            </div>
            <br>
            <div class="tech-category">
                <h3>>> Achievements</h3>
                <p>• 2021: 2nd place - Startup Pivoting Hackathon</p>
                <p>• 2018-2020: Mash-up Android Team Leader</p>
                <p>• 2015: 3rd place - Nexon NOS 7th</p>
                <p>• GitHub Arctic Code Vault Contributor</p>
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
            <h3>>> Professional</h3>
            <p>> Email:    <a href="mailto:jujin@jujin.kim">jujin@jujin.kim</a></p>
            <p>> LinkedIn: <a href="https://linkedin.com/in/jujinkim" target="_blank">linkedin.com/in/jujinkim</a></p>
            <p>> GitHub:   <a href="https://github.com/jujinkim" target="_blank">github.com/jujinkim</a></p>
            <br>
            <h3>>> Personal</h3>
            <p>> Website:  <a href="https://jujin.kim" target="_blank">jujin.kim</a></p>
            <p>> Blog:     <a href="https://jujin.dev" target="_blank">jujin.dev</a></p>
            <p>> Instagram: <a href="https://instagram.com/jujin__kim" target="_blank">@jujin__kim</a></p>
            <p>> Facebook:  <a href="https://facebook.com/jujinjujinjujin" target="_blank">facebook.com/jujinjujinjujin</a></p>
            <p>> Steam:     <a href="https://steamcommunity.com/id/buchakim" target="_blank">steamcommunity.com/id/buchakim</a></p>
            <br>
            <h3>>> Location</h3>
            <p>> City: Suwon, South Korea 🇰🇷</p>
            <p>> Timezone: UTC+9 (KST)</p>
            <p>> Current Time: ${kstTime}</p>
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