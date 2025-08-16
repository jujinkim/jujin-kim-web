// ASCII art profile picture with hover effect
export function initProfilePicture() {
    const profileContainer = document.getElementById('profile-picture');
    if (!profileContainer) {
        console.log('Profile container not found');
        return;
    }
    
    // Clear any existing content
    profileContainer.innerHTML = '';
    
    // Create ASCII SVG container
    const asciiContainer = document.createElement('div');
    asciiContainer.className = 'ascii-profile';
    
    // Create SVG image
    const asciiImg = document.createElement('img');
    asciiImg.src = 'img/profile-ascii.svg';
    asciiImg.alt = 'Jujin Kim ASCII Portrait';
    asciiImg.className = 'ascii-profile-img';
    asciiContainer.appendChild(asciiImg);
    
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
    
    console.log('Profile picture initialized');
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