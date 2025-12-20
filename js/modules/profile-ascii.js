// Profile picture loader (photo only)
export function initProfilePicture() {
    const profileContainer = document.getElementById('profile-picture');
    if (!profileContainer) {
        console.log('Profile container not found');
        return;
    }
    
    // Clear any existing content
    profileContainer.innerHTML = '';
    
    const imageContainer = document.createElement('div');
    imageContainer.className = 'original-profile';
    
    const img = document.createElement('img');
    img.src = 'img/profile.png';
    img.alt = 'Jujin Kim';
    
    img.onload = function() {
        console.log('Profile image loaded successfully from:', img.src);
    };
    
    img.onerror = function() {
        console.error('Failed to load profile image from:', img.src);
        this.src = 'https://avatars.githubusercontent.com/u/8042462?v=4';
    };
    
    imageContainer.appendChild(img);
    profileContainer.appendChild(imageContainer);
    
    console.log('Profile picture initialized with photo only');
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
