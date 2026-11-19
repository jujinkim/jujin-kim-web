export const CONTACT_EMAIL = 'jk@jujin.kim';

// The books on the shelf in the 3D room, left to right: once the camera is at
// the shelf, pressing a book opens its link. A spine without an entry (there
// are eight) is just a book.
export const BOOK_LINKS = [
    { title: 'Blog', url: 'https://blog.jujin.kim' },
    { title: 'jujin.dev', url: 'https://jujin.dev' },
    { title: 'GitHub', url: 'https://github.com/jujinkim' },
    { title: 'LinkedIn', url: 'https://linkedin.com/in/jujinkim' },
    { title: 'Email', url: `mailto:${CONTACT_EMAIL}` }
];

// Avatar for https://gravatar.com/ciiwol.
export const PROFILE_IMAGE_URL = 'https://0.gravatar.com/avatar/8c31344af0a708eccaacf885250fe9af40462e5cd8267ccde77bb948d69d6534?s=512&d=404';
