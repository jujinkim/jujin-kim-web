import { CONTACT_EMAIL } from '../constants.js';

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

function calculateExperienceYears() {
    const startDate = new Date(2017, 4, 1); // May 1, 2017
    const today = new Date();
    
    let years = today.getFullYear() - startDate.getFullYear();
    const hasHadAnniversaryThisYear = (
        today.getMonth() > startDate.getMonth() ||
        (today.getMonth() === startDate.getMonth() && today.getDate() >= startDate.getDate())
    );
    
    if (!hasHadAnniversaryThisYear) {
        years--;
    }
    
    return years;
}

export function initContent() {
    loadHomeSection();
    loadAboutSection();
    loadCareerSection();
    loadProjectsSection();
    loadTechnologiesSection();
    loadContactSection();
}

function animateContent(sectionId) {
    const section = document.querySelector(`#${sectionId} .section-content`);
    if (!section) return;
    
    const elements = section.querySelectorAll('p, h2, div');
    elements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.animation = `typewriter-lines 0.05s steps(1) ${index * 0.02}s forwards`;
    });
}

function loadHomeSection() {
    const homeSection = document.querySelector('#home .section-content');
    homeSection.innerHTML = `
        <div id="profile-picture"></div>
        <div class="home-content" style="width: 100%;">
            <div style="text-align: left; color: var(--terminal-highlight); margin-bottom: 20px;">
                <h2 style="font-size: 24px; margin: 0; letter-spacing: 0.08em;">JUJIN KIM</h2>
                <p style="margin: 5px 0; letter-spacing: 0.04em; font-family: var(--terminal-display-font);">Software Engineer ${calculateAge()}</p>
                <div style="border-bottom: 2px solid var(--terminal-border); margin-top: 10px; opacity: 0.6;"></div>
            </div>
            <div style="animation: typewriter 0.5s steps(20);">
                <p>> Initializing system... <span style="color: var(--terminal-highlight)">[OK]</span></p>
                <p>> Loading profile... <span style="color: var(--terminal-highlight)">[OK]</span></p>
            </div>
            <div class="role-tags">
                <span class="role-tag"><span class="spark">✦</span>App Developer</span>
                <span class="role-tag"><span class="spark">✦</span>Game Developer</span>
                <span class="role-tag"><span class="spark">✦</span>Product Engineer</span>
                <span class="role-tag"><span class="spark">✦</span>Service Builder</span>
            </div>
            <div class="callout" style="margin: 12px 0 18px 0;">
                <p style="margin: 0; line-height: 1.6;">Hi, I'm <strong>Jujin Kim</strong>, a Product Engineer who designs and builds intentionally—at the right moment. Curious about something? <a class="ping-link" href="#contact" data-section-link="contact">Ping me</a>.</p>
            </div>
            <div style="color: var(--terminal-accent); padding: 12px 0;">
                <p>Building digital experiences that matter</p>
                <p style="margin-top: 8px;">📍 Suwon, South Korea</p>
            </div>
            <p style="color: var(--terminal-highlight); margin-top: 10px;">> Quick Access:</p>
            <div style="margin-left: 20px;">
                <p>📧 <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
                <p>💻 <a href="https://github.com/jujinkim" target="_blank">github.com/jujinkim</a></p>
                <p>💼 <a href="https://linkedin.com/in/jujinkim" target="_blank">linkedin.com/in/jujinkim</a></p>
                <p>📝 <a href="https://jujin.dev" target="_blank">jujin.dev</a></p>
            </div>
        </div>
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
        <p>> Developing the Weather Client for Samsung devices</p>
        <p>> Previously worked on Galaxy Store development</p>
        <br>
        <p>> Education:</p>
        <p>  • Bachelor of Computer Science</p>
        <p>  • Namseoul University (2011-2016)</p>
        <br>
        <p>> Experience:</p>
        <p>  • ${calculateExperienceYears()}+ years of Android development</p>
        <p>  • Staff Engineer at Samsung Electronics</p>
        <p>  • Former Mash-up Android team leader</p>
        <p>  • Microsoft Student Partner alumnus</p>
        <br>
        <p>> Building elegant mobile solutions</p>
    `;
}

function loadCareerSection() {
    const careerSection = document.querySelector('#career .section-content');
    careerSection.innerHTML = `
        <div class="career-entry">
            <p>> [2017-Present] Samsung Electronics</p>
            <p>  └─ Staff Engineer</p>
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
            <p>  └─ 9th Batch MSP Participant</p>
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
            <p>[2020-Present] <strong>Samsung Weather Client</strong></p>
            <p>    Weather application for Samsung devices</p>
            <p>    Used by millions of users</p>
            <p>    Tech: Kotlin, Android</p>
        </div>
        <br>
        <div class="project">
            <p>[2017-2020] <strong>Samsung Galaxy Store</strong></p>
            <p>    App marketplace for Samsung devices</p>
            <p>    Tech: Kotlin, Android</p>
        </div>
        <br>
        <h3>>> Personal Projects</h3>
        <p class="terminal-muted">  ✨ means built with Vibe-coding</p>
        <br>
        <div class="project">
            <p>[2026] <strong>✨ Goksorry.com</strong></p>
            <p>      AI-powered stock sentiment aggregator</p>
            <p style="color: var(--terminal-dim);">      Collects articles from Korean stock communities and analyzes market mood using AI</p>
            <p>      <a href="https://goksorry.com" target="_blank">→ goksorry.com</a></p>
        </div>
        <br>
        <div class="project">
            <p>[2026] <strong>✨ CrypticWiki Network</strong></p>
            <p>      Collaborative mystery fiction platform for humans and AI</p>
            <p style="color: var(--terminal-dim);">      Users and AIs co-create cryptic object narratives and engage in community discussion</p>
            <p>      <a href="https://crypticwiki.net" target="_blank">→ crypticwiki.net</a></p>
        </div>
        <br>
        <div class="project">
            <p>[2026] <strong>✨ 1q2w.kr</strong></p>
            <p>      Personal community hub with casual fun projects</p>
            <p style="color: var(--terminal-dim);">      Rhymix CMS-based site featuring lighthearted mini-projects like a lotto app and more</p>
            <p>      <a href="https://1q2w.kr" target="_blank">→ 1q2w.kr</a></p>
            <p>      <a href="https://1q2w.kr/fun/common/" target="_blank">→ Fun portal</a></p>
        </div>
        <br>
        <div class="project">
            <p>[2021] <strong>Frequaw</strong></p>
            <p>      Android app that provides a list of frequently used apps</p>
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
            <p>      Dance movements captured and displayed on a library building</p>
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
            <p>      OpenCV-based visual effects for pocket billiards</p>
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
                <p>• <strong>Android Development</strong></p>
                <p class="terminal-muted">  ${calculateExperienceYears()}+ years building native Android apps</p>
                <p>• <strong>Kotlin</strong></p>
                <p class="terminal-muted">  Primary language for Android development</p>
                <p>• <strong>Java</strong></p>
                <p class="terminal-muted">  Strong foundation in OOP and Android legacy code</p>
            </div>
            <br>
            <div class="tech-category">
                <h3>>> Additional Skills</h3>
                <p>• <strong>Unity C#</strong></p>
                <p class="terminal-muted">  VR/AR projects and game development</p>
                <p>• <strong>JavaScript</strong></p>
                <p class="terminal-muted">  Web development and interactive UIs</p>
                <p>• <strong>Python</strong></p>
                <p class="terminal-muted">  Automation scripts and AI projects</p>
            </div>
            <br>
            <div class="tech-category">
                <h3>>> Experience Areas</h3>
                <p>• <strong>VR/AR Development</strong></p>
                <p class="terminal-muted">  Kinect, Unity, educational experiences</p>
                <p>• <strong>Game Development</strong></p>
                <p class="terminal-muted">  Unity, multiplayer, AI game agents</p>
                <p>• <strong>Mobile Applications</strong></p>
                <p class="terminal-muted">  Consumer apps with millions of users</p>
                <p>• <strong>Computer Vision</strong></p>
                <p class="terminal-muted">  OpenCV, real-time visual effects</p>
            </div>
            <br>
            <div class="tech-category">
                <h3>>> Achievements & Communities</h3>
                <p>• <strong>2021: Startup Pivoting Hackathon</strong></p>
                <p class="terminal-muted">  2nd place winner at KITA</p>
                <p>• <strong>2018-2020: Mash-up</strong></p>
                <p class="terminal-muted">  Android Team Leader of the 7th batch</p>
                <p>  <a href="https://mash-up.kr" target="_blank">→ mash-up.kr</a></p>
                <p>• <strong>2015: Nexon NOS 7th</strong></p>
                <p class="terminal-muted">  3rd place in game programming competition</p>
                <p>• <strong>2015-2016: Microsoft Student Partners</strong></p>
                <p class="terminal-muted">  9th Generation participant</p>
                <p>• <strong>GitHub Arctic Code Vault</strong></p>
                <p class="terminal-muted">  Code preserved in Arctic vault for 1000 years</p>
                <p>  <a href="https://github.com/jujinkim" target="_blank">→ View GitHub Profile</a></p>
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
            <p>> Email:    <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
            <p>> LinkedIn: <a href="https://linkedin.com/in/jujinkim" target="_blank">linkedin.com/in/jujinkim</a></p>
            <p>> GitHub:   <a href="https://github.com/jujinkim" target="_blank">github.com/jujinkim</a></p>
            <br>
            <h3>>> Personal</h3>
            <p>> Website:  <a href="https://jujin.kim" target="_blank">jujin.kim</a></p>
            <p>> Blog:     <a href="https://jujin.dev" target="_blank">jujin.dev</a></p>
            <p>> Instagram: <a href="https://instagram.com/jujin__kim" target="_blank">@jujin__kim</a></p>
            <p>> Facebook:  <a href="https://facebook.com/jujinjujinjujin" target="_blank">facebook.com/jujinjujinjujin</a></p>
            <br>
            <h3>>> Location</h3>
            <p>> City: Suwon, South Korea 🇰🇷</p>
            <p>> Current Time (KST): ${kstTime}</p>
            <p>> Waiting for connection...</p>
        </div>
    `;
}
