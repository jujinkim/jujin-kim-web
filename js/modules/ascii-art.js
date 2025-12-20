export function initASCIITitle() {
    const titleElement = document.getElementById('ascii-title');
    
    // Clear any existing content
    titleElement.innerHTML = '';
    
    const img = document.createElement('img');
    img.src = 'img/ascii-title.svg';
    img.alt = 'JUJIN KIM ASCII Title';
    img.className = 'ascii-title-img';
    img.decoding = 'async';
    img.loading = 'lazy';

    titleElement.appendChild(img);
}
