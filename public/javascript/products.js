import BASE_URL from './config.js';


//Gets current user
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
        if (currentUser) {
            const loadIcon = document.getElementById('iconLoader');
            loadIcon.classList.add('header-icons');

            const profileImage = document.createElement('img');
            if (currentUser && currentUser.profile_image) { // Added check for currentUser
                const string = atob(currentUser.profile_image);
                profileImage.src = `data:image/jpeg;base64,${string}`;
            } else {
                profileImage.src = '../images/defaultProfile.jpg';
            }

            profileImage.alt = currentUser ? `${currentUser.username}'s Profile Image` : 'Profile Image'; // Fixed user reference

            loadIcon.innerHTML = `
                <a href="../profile.html?profile=${currentUser.username}" id="userPBIcon" class="login-icon">
                </a>
            `;

            const iconDiv = document.getElementById('userPBIcon');
            iconDiv.appendChild(profileImage);

        } else {
            const loadIcon = document.getElementById('iconLoader');
            loadIcon.classList.add('header-icons');
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
    fetch("/api/productsDisplay")
        .then(response => response.json())
        .then(data => {
            const productContainer = document.querySelector(".products");
            productContainer.innerHTML = "";

            data.products.forEach(product => {
                const string = atob(product.picture);
                const discount = parseFloat(product.rabatt) / 100;
                const originalPrice = parseFloat(product.price);
                const discountedPrice = (originalPrice * (1 - discount)).toFixed(2);

                if (product.rabatt < 1) {
                    productContainer.innerHTML += `
                    <div class="product" data-product-id="${product.id}">
                        <img src="data:image/png;base64,${string}" alt="${product.title}">
                        <h2>${product.title}</h2>
                        <div class="publisher-price">
                            <h4>${product.publisher}</h4>
                            <h4 class="price">${product.price}</h4>
                        </div>
                    </div>
                    `;
                }

                if (product.rabatt > 0) {
                    productContainer.innerHTML += `
                    <div class="product" data-product-id="${product.id}">
                        <div class="productRabatt">
                            <h4>${product.rabatt}% Rabatt</h4>
                        </div>
                        <img src="data:image/png;base64,${string}" alt="${product.title}">
                        <h2>${product.title}</h2>
                        <h5>${product.description}</h5>
                        <h4 class="price-original">CHF ${originalPrice.toFixed(2)}</h4>
                        <div class="publisher-priceSale">
                            <h4>${product.publisher}</h4>
                            <h4 class="price-sale">CHF ${discountedPrice}</h4>
                        </div>
                    </div>
                `;
                }
            });

            productContainer.addEventListener('click', function(event) {
                const productElement = event.target.closest('.product');
                if (productElement) {
                    const productId = productElement.dataset.productId;
                    if (productId) {
                        window.location.href = `../productSite.html?productId=${productId}`;
                    } else {
                        console.log('No product ID found in this product');
                    }
                }
            });
        })
        .catch(error => console.error("Failed to load products: ", error));
});