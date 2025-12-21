export function initASCIITitle() {
    const titleElement = document.getElementById('ascii-title');
    
    // Clear any existing content
    titleElement.innerHTML = '';
    
    const img = document.createElement('img');
    img.src = getTitleSrc();
    img.alt = 'JUJIN KIM ASCII Title';
    img.className = 'ascii-title-img';
    img.decoding = 'async';
    img.loading = 'lazy';

    titleElement.appendChild(img);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
        img.src = getTitleSrc();
    };
    mediaQuery.addEventListener('change', handleChange);
    window.addEventListener('theme-changed', handleChange);
}

function getTitleSrc() {
    const theme = document.body.dataset.theme;
    let isDark;
    if (theme === 'dark') {
        isDark = true;
    } else if (theme === 'light') {
        isDark = false;
    } else {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return isDark ? 'img/ascii-title-dark.svg' : 'img/ascii-title-light.svg';
}
