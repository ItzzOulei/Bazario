import BASE_URL from './config.js';

document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("form");
    const firstname = document.getElementById("firstname");
    const name = document.getElementById("name");
    const username = document.getElementById("username");
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const password2 = document.getElementById("password2");
    const birthdate = document.getElementById("birthdate");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (checkInputs()) {
            await signup();
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
            input.disabled = false;
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
            input.disabled = false;
        }
    }

    function isEmail(email) {
        return /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email);
    }

    function checkInputs() {
        const firstnameValue = firstname.value.trim();
        const nameValue = name.value.trim();
        const usernameValue = username.value.trim();
        const emailValue = email.value.trim();
        const passwordValue = password.value.trim();
        const password2Value = password2.value.trim();
        const birthdateValue = birthdate.value.trim();
        let isValid = true;

        if (firstnameValue === '') {
            setErrorFor(firstname, "Firstname can't be empty");
            isValid = false;
        } else {
            setSuccessFor(firstname);
        }

        if (nameValue === '') {
            setErrorFor(name, "Name can't be empty");
            isValid = false;
        } else {
            setSuccessFor(name);
        }

        if (usernameValue === '') {
            setErrorFor(username, "Username can't be empty");
            isValid = false;
        } else {
            setSuccessFor(username);
        }

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

        if (password2Value === '') {
            setErrorFor(password2, "Password confirmation can't be empty");
            isValid = false;
        } else if (password2Value !== passwordValue) {
            setErrorFor(password2, "Passwords do not match");
            isValid = false;
        } else {
            setSuccessFor(password2);
        }

        const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
        const currentDay = String(today.getDate()).padStart(2, '0');
        const currentDateStr = `${currentYear}-${currentMonth}-${currentDay}`;

        if (birthdateValue === '') {
            setErrorFor(birthdate, "Birthdate can't be empty");
            isValid = false;
        } else if (!dateFormatRegex.test(birthdateValue)) {
            setErrorFor(birthdate, "Please enter a valid date in YYYY-MM-DD format");
            isValid = false;
        } else {
            const [birthYear, birthMonth, birthDay] = birthdateValue.split('-').map(Number);
            const isValidDate =
                birthYear >= 1900 && birthYear <= currentYear &&
                birthMonth >= 1 && birthMonth <= 12 &&
                birthDay >= 1 && birthDay <= 31;

            if (!isValidDate) {
                setErrorFor(birthdate, "Please enter a valid date");
                isValid = false;
            } else if (birthdateValue > currentDateStr) {
                setErrorFor(birthdate, "Birthdate cannot be in the future");
                isValid = false;
            } else {
                const minAge = 16;
                const minYear = currentYear - minAge;
                let isOldEnough = false;

                if (birthYear < minYear) {
                    isOldEnough = true;
                } else if (birthYear === minYear) {
                    if (birthMonth < parseInt(currentMonth) ||
                        (birthMonth === parseInt(currentMonth) && birthDay <= parseInt(currentDay))) {
                        isOldEnough = true;
                    }
                }

                if (!isOldEnough) {
                    setErrorFor(birthdate, `You must be at least ${minAge} years old.`);
                    isValid = false;
                } else {
                    setSuccessFor(birthdate);
                }
            }
        }

        return isValid;
    }

    async function signup() {
        const userData = {
            firstname: firstname.value.trim(),
            name: name.value.trim(),
            username: username.value.trim(),
            email: email.value.trim(),
            password: password.value.trim(),
            birthdate: birthdate.value.trim()
        };

        try {
            const response = await fetch(`${BASE_URL}/api/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Include session cookie
                body: JSON.stringify(userData)
            });

            const result = await response.json();

            if (response.ok) {
                const emailValue = email.value.trim();
                const response = await fetch(`${BASE_URL}/api/badges/${emailValue}/1`, {
                    method: 'POST',
                    credentials: 'include'
                });
                console.log(result.message);
                window.location.href = `../home`;
            } else {
                // Display specific error from backend
                if (result.error.includes('Username or email already exists')) {
                    setErrorFor(username, result.error);
                    setErrorFor(email, result.error);
                } else {
                    setErrorFor(email, result.error); // General error display
                }
            }
        } catch (error) {
            console.error('Signup error:', error);
            setErrorFor(email, 'Server error during signup');
        }
    }
});