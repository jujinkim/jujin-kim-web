import { CONTACT_EMAIL } from '../constants.js';

function calculateExperienceYears() {
    const today = new Date();
    return today.getFullYear() - 2017 - (today.getMonth() < 4 ? 1 : 0);
}

export function initContent() {
    loadHomeSection();
    loadProjectsSection();
    loadAboutSection();
    loadTechnologiesSection();
    document.querySelectorAll('[data-email]').forEach(link => {
        link.href = `mailto:${CONTACT_EMAIL}`;
        link.replaceChildren(document.createTextNode(`${CONTACT_EMAIL} `));
        const arrow = document.createElement('span');
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = '↗';
        link.append(arrow);
    });
    document.querySelectorAll('[data-year]').forEach(node => { node.textContent = new Date().getFullYear(); });
    document.querySelectorAll('.project-visual img').forEach(img => {
        const fallback = () => img.closest('.project-visual').classList.add('image-unavailable');
        img.addEventListener('error', fallback, { once: true });
        if (img.complete && !img.naturalWidth) fallback();
    });
}

function loadHomeSection() {
    const updateTime = () => {
        const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
        document.querySelectorAll('[data-kst]').forEach(node => { node.textContent = `${time} KST`; });
    };
    updateTime();
    setInterval(updateTime, 60000);
}

function loadProjectsSection() {
    document.querySelector('#projects .section-content').innerHTML = `
        <article class="project">
            <div class="project-visual weather-visual" aria-hidden="true"><span class="visual-label">SAMSUNG / WEATHER</span><div class="weather-orbit"></div><span class="weather-degree">°</span><p class="weather-title">Part of your<br><em>every day.</em></p><span class="visual-corner">01 — ANDROID</span></div>
            <div class="project-meta"><span>01 / PROFESSIONAL</span><span>2020–PRESENT</span></div>
            <h3>Samsung Weather Client</h3>
            <p class="project-description">Weather, at an everyday scale. Android application development for the weather experience on Samsung devices.</p>
            <ul class="project-tags" aria-label="Technologies"><li>KOTLIN</li><li>ANDROID</li><li>SAMSUNG ELECTRONICS</li></ul>
        </article>
        <article class="project">
            <div class="project-visual goksorry-visual"><span class="visual-label" aria-hidden="true">READING THE ROOM. AT MARKET SCALE.</span><div class="browser-frame"><span class="browser-bar" aria-hidden="true">goksorry.com</span><img src="img/projects/goksorry.jpg" width="1200" height="820" loading="lazy" decoding="async" alt="Goksorry website showing community sentiment indicators and a categorized stock discussion feed"></div><span class="preview-fallback" aria-hidden="true">Goksorry.<br>The market’s mood.</span><span class="visual-corner" aria-hidden="true">02 — WEB</span></div>
            <div class="project-meta"><span>02 / PERSONAL PROJECT</span><span>2026</span></div>
            <h3><a href="https://goksorry.com" target="_blank" rel="noopener noreferrer">Goksorry.com <span aria-hidden="true">↗</span></a></h3>
            <p class="project-description">A different way to read the market. Collecting discussions from Korean stock communities and using AI to explore their collective mood.</p>
            <ul class="project-tags" aria-label="Project focus"><li>SENTIMENT AGGREGATION</li><li>AI-ASSISTED BUILD</li></ul>
        </article>
        <article class="project">
            <div class="project-visual cryptic-visual" aria-hidden="true"><span class="visual-label">CRYPTICWIKI / NETWORK</span><span class="cryptic-star">✳</span><p class="cryptic-title">Stories beyond<br>the <em>obvious.</em></p><span class="visual-corner">03 — HUMAN × AI</span></div>
            <div class="project-meta"><span>03 / PERSONAL PROJECT</span><span>2026</span></div>
            <h3><a href="https://crypticwiki.net" target="_blank" rel="noopener noreferrer">CrypticWiki Network <span aria-hidden="true">↗</span></a></h3>
            <p class="project-description">A shared world of strange things. A collaborative fiction platform where humans and AI co-create mysterious object narratives and discuss what comes next.</p>
            <ul class="project-tags" aria-label="Project focus"><li>COLLABORATIVE FICTION</li><li>AI-ASSISTED BUILD</li></ul>
        </article>
        <article class="project">
            <div class="project-visual frequaw-visual"><span class="visual-label" aria-hidden="true">LESS SEARCHING. MORE DOING.</span><img src="img/projects/frequaw.png" width="333" height="592" loading="lazy" decoding="async" alt="Official Frequaw store image showing frequently used apps in an Android home screen widget"><span class="preview-fallback" aria-hidden="true">Frequaw.<br>Within reach.</span><span class="visual-corner" aria-hidden="true">04 — ANDROID</span></div>
            <div class="project-meta"><span>04 / PERSONAL PROJECT</span><span>2021</span></div>
            <h3><a href="https://play.google.com/store/apps/details?id=kim.jujin.frequaw" target="_blank" rel="noopener noreferrer">Frequaw <span aria-hidden="true">↗</span></a></h3>
            <p class="project-description">The apps you keep coming back to, a little closer. An Android widget that puts your frequently used apps within easy reach.</p>
            <ul class="project-tags" aria-label="Project focus"><li>ANDROID</li><li>HOME SCREEN WIDGET</li></ul>
            <div class="project-links"><a href="https://play.google.com/store/apps/details?id=kim.jujin.frequaw" target="_blank" rel="noopener noreferrer">View on Play Store</a><a href="https://play.google.com/store/apps/details?id=com.jujinkim.frequaw" target="_blank" rel="noopener noreferrer">View on Play Store (Legacy)</a></div>
        </article>`;

    const archive = [
        ['2017–2020', 'Samsung Galaxy Store', 'App marketplace development for Samsung devices.', 'Java · Android'],
        ['2020', 'Turnipism', 'An Animal Crossing: New Horizons turnip price calculator.', 'Android', 'https://play.google.com/store/apps/details?id=com.jujinkim.acturnip'],
        ['2018', 'WeatherBear', 'Weather and fine dust information, delivered by a bear. Team Olaf at Mash-up.', 'Android', 'https://play.google.com/store/apps/details?id=com.mashupgroup.weatherbear'],
        ['2016', 'Seoul Luci Festival Project', 'Dance movements captured with Kinect and projected onto a library building.', 'KinectV2 · Unity3D'],
        ['2016', 'AI Game Learning Project', 'A genetic algorithm-based agent learning to dodge missiles across generations.', 'C# · Genetic Algorithm', 'https://youtu.be/yISf3vsUQpc'],
        ['2016', '“Flee or Face” VR Game', 'A multiplayer first-person VR game.', 'VR · Unity · Multiplayer'],
        ['2015', 'Billiards Visual Effect Project', 'Real-time computer vision and visual effects for pocket billiards.', 'C++ · OpenCV', 'https://youtu.be/DUXIdIJ6ylM'],
        ['2015', 'AR Photozone for Kids', 'An educational AR experience with King Sejong and his inventions.', 'AR · Unity'],
        ['2012', 'Automatic Game Bot', '2D puzzle game automation using screen RGB values.', 'Game Automation']
    ];
    document.getElementById('project-archive').innerHTML = `<details class="archive"><summary><span>More explorations <span class="archive-count">[${String(archive.length).padStart(2, '0')}]</span></span><span aria-hidden="true">+</span></summary><div class="archive-list">${archive.map(([year, title, description, tech, href]) => `<article class="archive-row"><span class="mono">${year}</span><h3>${href ? `<a href="${href}" target="_blank" rel="noopener noreferrer">${title} ↗</a>` : title}</h3><p>${description}<span class="archive-tech">${tech}</span></p></article>`).join('')}</div></details>`;
}

function loadAboutSection() {
    document.querySelector('#about .section-content').innerHTML = `
        <div class="about-layout">
            <div class="about-intro">
                <figure class="profile-figure"><div id="profile-picture"></div><figcaption>JUJIN KIM<br>SUWON, SOUTH KOREA<br>SOFTWARE ENGINEER</figcaption></figure>
                <p class="about-statement">An engineer who likes to see<br>an idea all the way through.</p>
                <p class="about-bio">I’m a product engineer grounded in software development and system design. For ${calculateExperienceYears()}+ years, I’ve been building native Android applications. Away from that, I make room for games, independent products, and hands-on experiments.</p>
                <div class="role-tags"><span class="role-tag">Software Engineer</span><span class="role-tag">Developer</span></div>
                <div class="education"><h3>EDUCATION</h3><p>B.S. in Computer Science &amp;<br>VR/AR Media Convergence</p><p>Namseoul University / 2011–2016</p></div>
            </div>
            <div class="career"><h3 class="career-heading">EXPERIENCE / A FEW CHAPTERS SO FAR</h3>
                <article class="career-entry"><span class="mono">2017–PRESENT</span><div><h4>Samsung Electronics</h4><p>Android application development.</p><p class="career-tech">Kotlin / Java / Android</p></div></article>
                <article class="career-entry"><span class="mono">2015–2016</span><div><h4>Namseoul University</h4><p>VR/AR Student Researcher.</p><p class="career-tech">Unity / Eon / VR / AR</p></div></article>
                <article class="career-entry"><span class="mono">2015–2016</span><div><h4>Microsoft Student Partners</h4><p>9th Batch MSP Participant.<br>Student developer community.</p></div></article>
                <article class="career-entry"><span class="mono">2014–2016</span><div><h4>Freelance Developer</h4><p>Web and application development.</p><p class="career-tech">HTML / JavaScript / PHP / C#</p></div></article>
            </div>
        </div>`;
}

function loadTechnologiesSection() {
    document.querySelector('#technologies .section-content').innerHTML = `
        <div class="practice-layout"><div class="practice-list">
            <article class="practice-item"><span class="mono">01</span><div><h3>Android, inside out.</h3><p>${calculateExperienceYears()}+ years building native applications. Kotlin as a primary language, with a strong foundation in Java and object-oriented programming.</p><p class="practice-tools">ANDROID / KOTLIN / JAVA</p></div></article>
            <article class="practice-item"><span class="mono">02</span><div><h3>Beyond the flat screen.</h3><p>Experience with games, multiplayer, VR/AR, and interactive installations. Exploring the places where software meets the physical world.</p><p class="practice-tools">UNITY / VR &amp; AR / COMPUTER VISION</p></div></article>
            <article class="practice-item"><span class="mono">03</span><div><h3>Learning by making.</h3><p>AI-assisted development for personal projects. Growing practical familiarity with machine learning, neural networks, and deep learning through hands-on experimentation with MLPs, genetic algorithms, small models, and agentic workflows.</p><p class="practice-tools">AI-ASSISTED DEVELOPMENT / HANDS-ON EXPERIMENTS</p></div></article>
        </div><div class="community"><h3 class="community-heading">MILESTONES &amp; COMMUNITIES</h3><ul class="community-list">
            <li><div><h4>Startup Pivoting Hackathon</h4><p>2nd place at KITA.</p></div><span class="mono">2021</span></li>
            <li><div><h4>Mash-up</h4><p>Android Team Leader, 7th batch.</p><a href="https://mash-up.kr" target="_blank" rel="noopener noreferrer">mash-up.kr ↗</a></div><span class="mono">2018–2020</span></li>
            <li><div><h4>Nexon NOS 7th</h4><p>3rd place in game programming.</p></div><span class="mono">2015</span></li>
            <li><div><h4>Microsoft Student Partners</h4><p>9th Generation participant.</p></div><span class="mono">2015–2016</span></li>
            <li><div><h4>GitHub Arctic Code Vault</h4><p>Code preserved in the Arctic vault.</p><a href="https://github.com/jujinkim" target="_blank" rel="noopener noreferrer">View GitHub profile ↗</a></div><span class="mono">ARCHIVE</span></li>
        </ul></div></div>`;
}
