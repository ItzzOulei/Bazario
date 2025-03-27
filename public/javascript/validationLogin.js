import BASE_URL from './config.js';

document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("form");
    const email = document.getElementById("email");
    const password = document.getElementById("password");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (checkInputs()) {
            await login();
        } else {
            console.log('Input validation failed');
        }
    });

    function setErrorFor(input, message) {
        const formControl = input.parentElement;
        const small = formControl.querySelector("small");
        const errorIcon = formControl.querySelector(".fa-exclamation-circle");
        const successIcon = formControl.querySelector(".fa-check-circle");

        if (small && errorIcon && successIcon) {
            formControl.className = 'createAcc error';
            small.innerText = message;
            errorIcon.style.visibility = 'visible';
            successIcon.style.visibility = 'hidden';
        }
    }

    function setSuccessFor(input) {
        const formControl = input.parentElement;
        const errorIcon = formControl.querySelector(".fa-exclamation-circle");
        const successIcon = formControl.querySelector(".fa-check-circle");

        if (errorIcon && successIcon) {
            formControl.className = 'createAcc success';
            errorIcon.style.visibility = 'hidden';
            successIcon.style.visibility = 'visible';
        }
    }

    function isEmail(email) {
        return /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email);
    }

    function checkInputs() {
        const emailValue = email.value.trim();
        const passwordValue = password.value.trim();
        let isValid = true;

        if (emailValue === '') {
            setErrorFor(email, "Email can't be empty");
            isValid = false;
        } else if (!isEmail(emailValue)) {
            setErrorFor(email, "Please enter a valid email");
            isValid = false;
        } else {
            setSuccessFor(email);
        }

        if (passwordValue === '') {
            setErrorFor(password, "Password can't be empty");
            isValid = false;
        } else if (passwordValue.length < 8) {
            setErrorFor(password, "Password must be at least 8 characters");
            isValid = false;
        } else {
            setSuccessFor(password);
        }

        return isValid;
    }

    async function login() {
        const emailValue = email.value.trim();
        const passwordValue = password.value.trim();

        console.log('Attempting login with:', { email: emailValue });

        try {
            const response = await fetch(`${BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Include session cookie
                body: JSON.stringify({ email: emailValue, password: passwordValue })
            });

            console.log('Response status:', response.status);
            const result = await response.json();
            console.log('Response data:', result);

            if (response.ok) {
                console.log('Login successful:', result.message);
                const response = await fetch(`${BASE_URL}/api/badges/${emailValue}/1`, {
                    method: 'POST',
                    credentials: 'include'
                });
                window.location.href = `../home`;
            } else {
                console.error('Login failed:', result.error);
                setErrorFor(email, result.error);
                setErrorFor(password, result.error);
            }
        } catch (error) {
            console.error('Network or fetch error:', error);
            setErrorFor(email, 'Network error during login');
            setErrorFor(password, 'Network error during login');
        }
    }
});