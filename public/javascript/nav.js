import BASE_URL from './config.js';

const categoryBar = document.getElementById("categories-bar");
const productBar = document.getElementById("products-bar");
const saleproductBar = document.getElementById("sale-products");

async function getCurrentUser() {
    try {
        const response = await fetch(`${BASE_URL}/api/me`, {
            credentials: 'include'
        });
        if (!response.ok) {
            if (response.status === 401) return null;
            throw new Error(`Error, Status: ${response.status}`);
        }
        const data = await response.json();
        return data.user;
    } catch (error) {
        console.error('Error fetching user:', error);
        return null;
    }
}

async function loadSignUpIcon() {
    try {
        const currentUser = await getCurrentUser();
        console.log(currentUser);
        const loadIcon = document.getElementById('iconLoader');
        loadIcon.classList.add('header-icons', 'profile-dropdown'); // Füge Klassen hinzu

        if (currentUser) {
            const profileImage = document.createElement('img');
            if (currentUser.profile_image) {
                const string = atob(currentUser.profile_image);
                profileImage.src = `data:image/jpeg;base64,${string}`;
            } else {
                profileImage.src = '../images/defaultProfile.jpg';
            }
            profileImage.alt = `${currentUser.username}'s Profile Image`;

            loadIcon.innerHTML = `
                <a href="../profile.html?profile=${currentUser.username}" id="userPBIcon" class="login-icon">
                </a>
                <ul class="profile-dropdown-content">
                    <li><a href="../profile.html?profile=${currentUser.username}">Profile</a></li>
                    <li><a href="../settingsProfile.html">Settings</a></li>
                    <li><a href="../logout.html">Logout</a></li>
                </ul>
            `;

            const iconDiv = document.getElementById('userPBIcon');
            iconDiv.appendChild(profileImage);
        } else {
            loadIcon.innerHTML = `
                <a href="../login.html" class="login-icon">
                    <i class="fas fa-user"></i>
                </a>
            `;
        }
    } catch (error) {
        console.error('Error loading signup icon:', error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadSignUpIcon();
});

// Scroll event listener
const BurgerIcon = document.getElementById('burgerIcon');
const scrollText = document.getElementById('hideNav');
scrollText.classList.remove('not-visible');
BurgerIcon.classList.remove('not-visible-burger');
window.addEventListener('scroll', () => {
    const scrollPosition = window.scrollY || window.pageYOffset;
    const triggerPoint = 1290;

    if (scrollPosition > triggerPoint) {
        //scrollText.classList.remove('not-visible');
        //BurgerIcon.classList.remove('not-visible-burger');

    } else {
        //scrollText.classList.add('not-visible');
        //BurgerIcon.classList.add('not-visible-burger');

    }
});