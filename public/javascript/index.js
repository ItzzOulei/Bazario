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

// description length 60
function truncateText(text, maxLength) {
    if (!text) return 'No description';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

productBar.addEventListener("wheel", function(event) {
    event.preventDefault();
    productBar.scrollLeft += event.deltaY;
});

saleproductBar.addEventListener("wheel", function(event) {
    event.preventDefault();
    saleproductBar.scrollLeft += event.deltaY;
});

document.addEventListener("DOMContentLoaded", () => {
    loadSignUpIcon();

    function loadProducts() {
        fetch(`${BASE_URL}/api/productsDisplay`, { credentials: 'include' }) // Use BASE_URL and credentials
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
                            <h5>${product.description}</h5>
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

                // Re-attach click listener (since container is re-rendered)
                productContainer.addEventListener('click', function (event) {
                    const productElement = event.target.closest('.product');
                    if (productElement) {
                        const productId = productElement.dataset.productId;
                        if (productId) {
                            window.location.href = `../productSite.html?productId=${productId}`;
                        }
                    }
                });
            })
            .catch(error => console.error("Failed to load products: ", error));
    }

    // Initial load
    loadProducts();

    // Poll every 10 seconds
    setInterval(loadProducts, 10000); // Adjust interval as needed (e.g., 5000 for 5 seconds)
});

document.addEventListener("DOMContentLoaded", () => {
    function loadSaleProducts() {
        fetch(`${BASE_URL}/api/products/inSale`, { credentials: 'include' })
            .then(response => response.json())
            .then(data => {
                const productContainer = document.querySelector(".sale-products");
                productContainer.innerHTML = "";

                data.products.forEach(product => {
                    const imageString = atob(product.picture);
                    const discount = parseFloat(product.rabatt) / 100;
                    const originalPrice = parseFloat(product.price);
                    const discountedPrice = (originalPrice * (1 - discount)).toFixed(2);

                    productContainer.innerHTML += `
                    <div class="product" data-product-id="${product.id}">
                        <div class="productRabatt">
                            <h4>${product.rabatt}% Rabatt</h4>
                        </div>
                        <img src="data:image/png;base64,${imageString}" alt="${product.title}">
                        <h2>${product.title}</h2>
                        <h5>${product.description}</h5>
                        <h4 class="price-original">CHF ${originalPrice.toFixed(2)}</h4>
                        <div class="publisher-priceSale">
                            <h4>${product.publisher}</h4>
                            <h4 class="price-sale">CHF ${discountedPrice}</h4>
                        </div>
                    </div>
                `;
                });

                productContainer.addEventListener('click', function(event) {
                    const productElement = event.target.closest('.product');
                    if (productElement) {
                        const productId = productElement.dataset.productId;
                        if (productId) {
                            window.location.href = `../productSite.html?productId=${productId}`;
                        }
                    }
                });
            })
            .catch(error => console.error("Failed to load sale products: ", error));
    }

    loadSaleProducts();
    setInterval(loadSaleProducts, 10000); // Poll every 10 seconds
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