import BASE_URL from './config.js';
let profileBlob = null;
const defaultProfilePic = "/images/defaultProfile.jpg";

// Fetch current user from session
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
        console.error('Error fetching current user:', error);
        return null;
    }
}

// Load profile data from API
async function loadProfileData() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        console.log('No user logged in, redirecting to login');
        window.location.href = '../login.html';
        return;
    }

    try {
        document.getElementById('username').value = currentUser.username || '';
        document.getElementById('email').value = currentUser.email || '';
        if (currentUser.profile_image) {
            const string = atob(currentUser.profile_image);
            document.getElementById('profilePic').src = `data:image/jpeg;base64,${string}`;
        } else {
            document.getElementById('profilePic').src = defaultProfilePic;
        }
    } catch (error) {
        document.getElementById('profilePic').src = defaultProfilePic;
    }
}

// Handle profile picture upload
document.addEventListener("DOMContentLoaded", function() {
    loadProfileData();

    const profilePic = document.getElementById('profilePic');
    const uploadSlide = document.getElementById('uploadSlide');
    const overlay = document.getElementById('overlay');
    const closeSlideButton = document.getElementById('closeSlideButton');
    const pictureInput = document.getElementById('pictureInput');
    const imageArea = document.getElementById('imageArea');
    const previewImage = document.getElementById('previewImage');
    const uploadMessage = document.getElementById('uploadMessage');
    const editingIcon = document.getElementById('editingIcon')

    // Öffne Slide-Down-Feld und Overlay beim Klick auf das Profilbild
    profilePic.addEventListener('click', function() {
        uploadSlide.classList.add('active');
        overlay.classList.add('active');
    });

    editingIcon.addEventListener('click', function() {
        uploadSlide.classList.add('active');
        overlay.classList.add('active');
    });

    // Schließe Slide-Down-Feld und Overlay beim Klick auf "Close"
    closeSlideButton.addEventListener('click', function() {
        uploadSlide.classList.remove('active');
        overlay.classList.remove('active');
        previewImage.style.display = 'none';
        imageArea.querySelector('.upload-icon').style.display = 'block';
        imageArea.querySelector('#upload-text').style.display = 'block';
        imageArea.querySelector('.description-for-image').style.display = 'block';
        uploadMessage.textContent = '';
    });

    // Schließe Slide-Down-Feld und Overlay beim Klick auf das Overlay
    overlay.addEventListener('click', function() {
        uploadSlide.classList.remove('active');
        overlay.classList.remove('active');
        previewImage.style.display = 'none';
        imageArea.querySelector('.upload-icon').style.display = 'block';
        imageArea.querySelector('#upload-text').style.display = 'block';
        imageArea.querySelector('.description-for-image').style.display = 'block';
        uploadMessage.textContent = '';
    });

    // Drag-and-Drop-Handling
    imageArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        imageArea.classList.add('dragover');
    });

    imageArea.addEventListener('dragleave', () => {
        imageArea.classList.remove('dragover');
    });

    imageArea.addEventListener('drop', (e) => {
        e.preventDefault();
        imageArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        handleImage(file);
    });

    // Handle file input change
    pictureInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        handleImage(file);
    });

    function handleImage(file) {
        if (file) {
            if (!file.type.startsWith('image/')) {
                uploadMessage.textContent = 'Please upload an image file';
                pictureInput.value = '';
                profileBlob = null;
                previewImage.style.display = 'none';
                imageArea.querySelector('.upload-icon').style.display = 'block';
                imageArea.querySelector('#upload-text').style.display = 'block';
                imageArea.querySelector('.description-for-image').style.display = 'block';
                return;
            }

            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                uploadMessage.textContent = 'Image size is to big';
                pictureInput.value = '';
                profileBlob = null;
                previewImage.style.display = 'none';
                imageArea.querySelector('.upload-icon').style.display = 'block';
                imageArea.querySelector('#upload-text').style.display = 'block';
                imageArea.querySelector('.description-for-image').style.display = 'block';
                return;
            }

            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const size = Math.min(img.width, img.height);
                canvas.width = size;
                canvas.height = size;

                const offsetX = (img.width - size) / 2;
                const offsetY = (img.height - size) / 2;
                ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size);

                const squaredDataUrl = canvas.toDataURL('image/jpeg', 0.9);
                document.getElementById('profilePic').src = squaredDataUrl;
                previewImage.src = squaredDataUrl;
                previewImage.style.display = 'block';
                imageArea.querySelector('.upload-icon').style.display = 'none';
                imageArea.querySelector('#upload-text').style.display = 'none';
                imageArea.querySelector('.description-for-image').style.display = 'none';

                canvas.toBlob(function(blob) {
                    profileBlob = blob;
                }, 'image/jpeg', 0.9);

            };
            img.onerror = function() {
                uploadMessage.textContent = 'Error loading image';
                previewImage.style.display = 'none';
                imageArea.querySelector('.upload-icon').style.display = 'block';
                imageArea.querySelector('#upload-text').style.display = 'block';
                imageArea.querySelector('.description-for-image').style.display = 'block';
                profileBlob = null;
            };
            img.src = URL.createObjectURL(file);
        }
    }

    function setErrorFor(input, message) {
        const formGroup = input.parentElement;
        const small = formGroup.querySelector('.error-text');
        const errorIcon = formGroup.querySelector('.fa-exclamation-circle');
        const successIcon = formGroup.querySelector('.fa-check-circle');

        if (small && errorIcon && successIcon) {
            formGroup.classList.add('error');
            formGroup.classList.remove('success');
            small.textContent = message;
            errorIcon.style.visibility = 'visible';
            successIcon.style.visibility = 'hidden';
        }
    }

    function setSuccessFor(input) {
        const formGroup = input.parentElement;
        const small = formGroup.querySelector('.error-text');
        const errorIcon = formGroup.querySelector('.fa-exclamation-circle');
        const successIcon = formGroup.querySelector('.fa-check-circle');

        if (small && errorIcon && successIcon) {
            formGroup.classList.remove('error');
            formGroup.classList.add('success');
            small.textContent = '';
            errorIcon.style.visibility = 'hidden';
            successIcon.style.visibility = 'visible';
        }
    }

    function isEmail(email) {
        return /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email);
    }

    function checkInputs() {
        const usernameInput = document.getElementById('username');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const password2Input = document.getElementById('password2');

        const usernameValue = usernameInput.value.trim();
        const emailValue = emailInput.value.trim();
        const passwordValue = passwordInput.value.trim();
        const password2Value = password2Input.value.trim();

        let isValid = true;

        if (usernameValue === '') {
            setErrorFor(usernameInput, "Username can't be empty");
            isValid = false;
        } else {
            setSuccessFor(usernameInput);
        }

        if (emailValue === '') {
            setErrorFor(emailInput, "Email can't be empty");
            isValid = false;
        } else if (!isEmail(emailValue)) {
            setErrorFor(emailInput, "Please enter a valid email");
            isValid = false;
        } else {
            setSuccessFor(emailInput);
        }

        if (passwordValue && passwordValue.length < 8) {
            setErrorFor(passwordInput, "Password must be at least 8 characters");
            isValid = false;
        } else if (passwordValue) {
            setSuccessFor(passwordInput);
        }

        if (passwordValue && password2Value === '') {
            setErrorFor(password2Input, "Please confirm your password");
            isValid = false;
        } else if (passwordValue && password2Value !== passwordValue) {
            setErrorFor(password2Input, "Passwords do not match");
            isValid = false;
        } else if (password2Value) {
            setSuccessFor(password2Input);
        }

        return isValid;
    }

    async function saveProfile() {
        if (!checkInputs()) return;

        const currentUser = await getCurrentUser();
        if (!currentUser) {
            window.location.href = '../login.html';
            return;
        }

        const newUsername = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        const profileData = {
            username: currentUser.username,
            newUsername: newUsername,
            email: email,
            password: password || null,
            profile_image: null
        };

        if (profileBlob) {
            const reader = new FileReader();
            reader.onload = async function(e) {
                profileData.profile_image = e.target.result.split(',')[1];
                await submitProfile(profileData);
            };
            reader.readAsDataURL(profileBlob);
        } else {
            await submitProfile(profileData);
        }
    }

    async function submitProfile(profileData) {
        try {
            const response = await fetch(`${BASE_URL}/api/update-profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(profileData)
            });

            const result = await response.json();

            if (response.ok) {
                const email = document.getElementById('email').value.trim();
                const response = await fetch(`${BASE_URL}/api/badges/${email}/2`, {
                    method: 'POST',
                    credentials: 'include'
                });
                window.location.href = `../profile.html?profile=${profileData.newUsername}`;
            } else {
                alert('Failed to update profile: ' + result.error);
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('An error occurred while saving the profile.');
        }
    }

    const saveButton = document.getElementById('saveProfileButton');
    if (saveButton) {
        saveButton.addEventListener('click', function(e) {
            e.preventDefault();
            saveProfile();
        });
    }
});