// ASCII art profile picture with hover effect
export function initProfilePicture() {
    const profileContainer = document.getElementById('profile-picture');
    if (!profileContainer) {
        console.log('Profile container not found');
        return;
    }
    
    // Clear any existing content
    profileContainer.innerHTML = '';
    
    // Create ASCII container
    const asciiContainer = document.createElement('div');
    asciiContainer.className = 'ascii-profile';
    asciiContainer.id = 'ascii-profile';
    
    // Create original image container
    const imageContainer = document.createElement('div');
    imageContainer.className = 'original-profile';
    
    const img = document.createElement('img');
    // Use local downloaded image file
    img.src = 'img/profile.png';
    img.alt = 'Jujin Kim';
    
    // Add load event listener to ensure image loads
    img.onload = function() {
        console.log('Profile image loaded successfully from:', img.src);
    };
    
    img.onerror = function() {
        console.error('Failed to load profile image from:', img.src);
        // Try fallback
        this.src = 'https://avatars.githubusercontent.com/u/8042462?v=4';
    };
    
    imageContainer.appendChild(img);
    
    // Add both to profile container (ASCII first, then image)
    profileContainer.appendChild(asciiContainer);
    profileContainer.appendChild(imageContainer);
    
    // Use ASCII art
    asciiContainer.innerHTML = getFallbackASCII();
    
    console.log('Profile picture initialized');
}

function generateASCII(img, container) {
    // Create canvas for image processing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size (smaller for ASCII conversion)
    const width = 60;
    const height = 60;
    canvas.width = width;
    canvas.height = height;
    
    // Draw and scale image
    ctx.drawImage(img, 0, 0, width, height);
    
    try {
        // Get image data
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        
        // ASCII characters from dark to light
        const asciiChars = '@%#*+=-:. ';
        let ascii = '<pre class="ascii-art-profile">';
        
        for (let y = 0; y < height; y += 2) {
            for (let x = 0; x < width; x++) {
                const offset = (y * width + x) * 4;
                const r = pixels[offset];
                const g = pixels[offset + 1];
                const b = pixels[offset + 2];
                
                // Calculate brightness
                const brightness = (r + g + b) / 3;
                
                // Map brightness to ASCII character
                const charIndex = Math.floor((brightness / 255) * (asciiChars.length - 1));
                ascii += asciiChars[asciiChars.length - 1 - charIndex];
            }
            ascii += '\n';
        }
        
        ascii += '</pre>';
        container.innerHTML = ascii;
    } catch (e) {
        // CORS fallback - use predefined ASCII art
        container.innerHTML = getFallbackASCII();
    }
}

function getFallbackASCII() {
    // Detailed ASCII art portrait
    return `<pre class="ascii-art-profile">
▓▓                          ░▒▓▓▒                    ▓▓▓█▓░░░░░ 
▒░                    ░▓▒░  ░▒▓▓▒                    ▒▓▒░░ ░▓▓▒░
▒░░                  ▓███████████                   ░▒▒▒▓████▒░░
▒░░                ▒▓████████████                   ░██▒ ░░▒▒▒▓▓
░░░░            ▓█████████████████▓▒                  ▒████▒▒███
░░░░░░        ▓███████████████████████                   ▒     █
▒▒▒▒░░░░░░░░▒██████████████████████████▓               ▒██      
▒▒▒▒▒▒▒░░░░████████████████▓▓████████████                ░      
 ▒▒▒▒▒▒▒▒▒██████████▓▒░         ▒████████▓  ▒▓      ▒░      ░   
  ▒▒▒▒▒▒▒█████████░               ░███████▓████▒                
  ░▒▒▒▒▒████████▓░                  ▓████████████              ░
   ▒▒▒▓▓████████░             ░░░    ░████████████             ░
   ░▒▓▓████████▒         ░▓▓▓▓░    ░███████████████             
    ▒▓▓████████▓▒▒▓▓▒    ░░░░░▒█████ █░ ██▒▓████████            
     ▓▓█████████▓░░▒░░░░░██████████ ▓    ▓▒ ▒███████▒           
     ▒▓██████▒░   ░▒██████████████░▒▒    ░▓▒ ▓███████           
      ▒█████▒▒▒▓█████▓▒█░ ░▓█████▓░       ░░░░███████           
       ▓█████████████░█▓     ░░░               ▒▒░              
       ▒▓███████████░██░      ░▒▒░░░▒░░                         
       ░▒▓██████████▒░░░   ░▓█▓▓▒▒▓▒▒▒▒░▒▒▒▓▒░░                 
       ░▒▒▓██░       ░▒▒██▓▓▓▒░░░▒▓▓▓▒▒▒▒▒▒████████▓▒░░░        
 ▒    ░▒▒▒▒▒▓▓░░░   ░░░░▒▒░░░░░▒▒▓██▒░▒▒▒▒▓█████████████████████
█▓  ░░▒▒▓▓▓▓▓█▓▒▒░░░░░░░░▒▓▓██████▒░░▒▒▒▒▓▓█████████████████████
█▓░░▒▒▓▓▓████▒▓▓▒▒▒░░▒▒▓██▓▒█▓▒▒░░  ░▒▒▒▓▓██████████████████████
█▓▒▒▒▓▓███████▒▓▓▒▒▒▒▒▒▓██▓▒▒▒▓▒░   ░░▒▒▓▓█▓▒▒▒▒████████████████
██▒▓▓▓███████████▓▓▓▒▒▒▒▒▒▒▒▒▒▒░░░░░░░▒▒▓▓▓▒▒▒▒▒████████████████
██▓▓███████████████▓▓▓▓▒▒░░▒░░░░░░░░░▒▓▓▓▓▓▒▒▒▓█████████████████
████████████████▒▒▒████▓▒▒▒▒░░▒▒▒▒▒▓▓▓▓█▓▓▒▒▒▒░     ████████████
███████████████▒▒▒▒▒▒███▓▓▒▒▒▓▓█████████▓▓▒▒░░░     ░███████████
██████▒░  ░░▒▒▒▒▒▒▒▒▒▓████████████████▓▓▓▒▒▒░░░      ▓██████████
█▒░                ░▒▒▓███████████████▓▓▓▒▒▒░░░       ▓█████████
                        ▓████████████▓▓▓▓▒▒▒░░         █████████
░                   ░░░▓██████████▓▓▓▓▓▓▒▒▒░░░         █████████
▒▒▒▒▒░░░░    ░░▒▓▓▓▓▓▓██████████████▓▓▓▓▒▒▒░░          ▒████████
▓▓▒▓▓▓▒▒▓▓████████▓▓█████████▓▓█████▓▓▓▒▒▒░             ▓███████
</pre>`;
}

export function updateProfilePosition() {
    // Update profile position if needed for responsive design
    const profileContainer = document.getElementById('profile-picture');
    if (!profileContainer) return;
    
    const screenWidth = window.innerWidth;
    if (screenWidth < 768) {
        profileContainer.classList.add('mobile');
    } else {
        profileContainer.classList.remove('mobile');
    }
}