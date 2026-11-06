import { PROFILE_IMAGE_URL } from '../constants.js?v=20261106.1';

export function initProfilePicture() {
    const container = document.getElementById('profile-picture');
    if (!container) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'original-profile';
    const image = new Image();
    image.alt = 'Jujin Kim';
    image.width = 142;
    image.height = 172;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.onerror = function () {
        this.onerror = null;
        this.src = 'img/profile.jpg';
    };
    image.src = PROFILE_IMAGE_URL;
    wrapper.append(image);
    container.replaceChildren(wrapper);
}

export function updateProfilePosition() {
    document.getElementById('profile-picture')?.classList.toggle('mobile', window.innerWidth <= 768);
}
