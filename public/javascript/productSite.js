import BASE_URL from './config.js';
import {initApp} from './shoppingCart.js';


// Fetch product details
async function fetchProduct() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('productId');

    if (!productId) {
        console.error('No product ID found in URL');
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/api/products/findId/${productId}`);
        if (!response.ok) {
            throw new Error(`Error fetching product, Status: ${response.status}`);
        }
        const data = await response.json();
        const product = data.products[0]; // Endpoint returns an array with one product
        if (!product) {
            throw new Error('Product not found');
        }
        return product;
    } catch (error) {
        console.error('Error fetching product:', error);
        return null;
    }
}

// Fetch user profile by username
async function fetchUserProfile(username) {
    try {
        const response = await fetch(`${BASE_URL}/api/users/${username}`);
        if (!response.ok) {
            throw new Error(`Error fetching user profile, Status: ${response.status}`);
        }
        const data = await response.json();
        return data.user;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
}

// Fetch reviews for the product
async function fetchReviews(productId) {
    try {
        const response = await fetch(`${BASE_URL}/api/review/${productId}`);
        if (!response.ok) {
            throw new Error(`Error fetching reviews, Status: ${response.status}`);
        }
        const data = await response.json();
        return data.reviews;
    } catch (error) {
        console.error('Error fetching reviews:', error);
        return [];
    }
}

// Check if user has reviewed product
async function hasUserReviewedProduct(userId, productId) {
    const reviews = await fetchReviews(productId);
    return reviews.some(review => review.user_id === userId);
}

// Get current user
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

// Check if product is in wishlist
async function isProductInWishlist(userId, productId) {
    try {
        const response = await fetch(`${BASE_URL}/api/wishlist/${userId}`, {
            credentials: 'include'
        });
        if (!response.ok) return false;
        const data = await response.json();
        return data.products.some(item => item.id_product === parseInt(productId));
    } catch (error) {
        console.error('Error checking wishlist:', error);
        return false;
    }
}

// Update wishlist icon
function updateWishlistIcon(isInWishlist) {
    const wishlistButton = document.querySelector('.wishlist');
    const svg = wishlistButton.querySelector('svg');
    if (isInWishlist) {
        svg.setAttribute('fill', 'currentColor'); // Ausgefülltes Herz
        svg.setAttribute('stroke', 'none');
    } else {
        svg.setAttribute('fill', 'none');         // Leeres Herz
        svg.setAttribute('stroke', 'currentColor');
    }
}

// Render product details
async function renderProduct() {
    const product = await fetchProduct();
    if (!product) {
        document.querySelector('.detail').innerHTML = '<p>Product not found</p>';
        return;
    }

    const user = await fetchUserProfile(product.publisher);
    const currentUser = await getCurrentUser();
    let profileImage = user?.profile_image ? atob(user.profile_image) : null;

    const productImage = document.createElement('img');
    if (product.picture || product.image) {
        const string = atob(product.picture || product.image);
        productImage.src = `data:image/jpeg;base64,${string}`;
        productImage.alt = `${product.title} Image`;
    } else {
        productImage.src = '../images/defaultProfile.jpg';
        productImage.alt = 'Default Product Image';
    }

    const productId = parseInt(new URLSearchParams(window.location.search).get('productId'));
    const isInWishlist = currentUser ? await isProductInWishlist(currentUser.id, productId) : false;

    const productDetail = document.querySelector(".detail");
    productDetail.innerHTML = `
        <div class="image-container">
            <div id="pfpHolder" class="image"></div>
            <div class="infos-publisher">
                <div class="publisher-profile" data-id="${product.user_id || product.publisher_id || ''}">
                    ${profileImage ? `<img src="data:image/jpeg;base64,${profileImage}" alt="Profile picture from ${product.publisher || 'Unknown'}" class="profile-image">` : '<img src="../images/defaultProfile.jpg" alt="Default Profile Image" class="profile-image">'}
                    <div class="publisher-name">Created by @${product.publisher || 'Unknown'}</div>
                    <p hidden class="username">${product.publisher}</p>
                </div>
                <div class="creation-date">
                    ${product.creation_date || product.created_at ? new Date(product.creation_date || product.created_at).toLocaleDateString("de-DE") : 'Unknown'}
                </div>
            </div>
            <div>
                <button class="wishlist">    
                    <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="${isInWishlist ? 'currentColor' : 'none'}" stroke="${isInWishlist ? 'none' : 'currentColor'}" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12.01 6.001C6.5 1 1 8 5.782 13.001L12.011 20l6.23-7C23 8 17.5 1 12.01 6.002Z"/>
                    </svg>
                </button>
            </div>
        </div>
        <div class="content">
            <div class="title">${product.title || 'Unknown Title'}</div>
            <div class="price">${parseFloat(product.price || 0).toFixed(2)} CHF</div>
            <div class="button">
                <button class="add-to-cart" onclick="addItemToCart()">
                    Add to Cart
                    <span>
                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 4h1.5L9 16m0 0h8m-8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-8.5-3h9.25L19 7H7.312"/>
                        </svg>
                    </span>
                </button>
                <div class="quantity-controls">
                    <p id="counter-value">1</p>
                    <div class="counter-buttons">
                        <div id="increment">+</div>
                        <div id="decrement">-</div>
                    </div>
                </div>
            </div>
            <div class="stock">${product.stock || 0} in Stock</div>
            <div class="description">${product.description || 'No description'}</div>
        </div>
    `;

    document.getElementById('pfpHolder').appendChild(productImage);
    updateWishlistIcon(isInWishlist);

    const publisherProfile = productDetail.querySelector('.publisher-profile');
    publisherProfile.addEventListener('click', function() {
        const username = this.querySelector('.username')?.textContent;
        if (username) {
            window.location.href = `../profile.html?profile=${username}`;
        } else {
            console.log('No username found');
        }
    });

    return product;
}

// Render reviews
async function renderReviews() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('productId');
    if (!productId) {
        console.error('No product ID found in URL');
        return;
    }

    const reviews = await fetchReviews(productId);
    const productContainer = document.getElementById('productContainer');

    if (!reviews.length) {
        productContainer.innerHTML = '<p>No reviews yet for this product.</p>';
        return;
    }

    productContainer.innerHTML = '';
    reviews.forEach(review => {
        const reviewImageSrc = review.image ? `data:image/jpeg;base64,${review.image}` : '';
        const reviewCard = document.createElement('div');
        const string = atob(review.picture);
        reviewCard.classList.add('review-card');
        reviewCard.innerHTML = `
            <div class="review-header">
                <div class="review-user" data-username="${review.username}">
                    <img src="${string ? `data:image/jpeg;base64,${string}` : '../images/defaultProfile.jpg'}" alt="${review.username}'s profile picture" class="review-profile-image">
                    <span class="review-username">@${review.username}</span>
                </div>
                <div class="review-rating">${renderStars(review.rating)}</div>
            </div>
            <div class="review-body">
                <p class="review-text">${review.text || 'No comment provided'}</p>
                ${reviewImageSrc ? `<img src="${reviewImageSrc}" alt="Review image" class="review-image">` : ''}
            </div>
            <div class="review-footer">
                <span class="review-date">${new Date(review.created_at).toLocaleDateString("de-DE")}</span>
            </div>
        `;
        productContainer.appendChild(reviewCard);

        // Add click event listener for review user
        const reviewUser = reviewCard.querySelector('.review-user');
        reviewUser.addEventListener('click', function() {
            const username = this.getAttribute('data-username');
            if (username) {
                window.location.href = `../profile.html?profile=${username}`;
            } else {
                console.log('No username found for review');
            }
        });
    });
}

// Helper function for star ratings
function renderStars(rating) {
    return Array(5).fill().map((_, i) =>
        `<i class="fas fa-star ${i < rating ? 'filled-star' : 'empty-star'}"></i>`
    ).join('');
}

// Setup tab switching
async function setupTabSwitching() {
    const reviewTab = document.querySelector('#profileCategories p:nth-child(1)');
    const addReviewTab = document.querySelector('#profileCategories p:nth-child(2)');
    const productContainer = document.getElementById('productContainer');
    const addReviewForm = document.getElementById('addReviewForm');

    const currentUser = await getCurrentUser();
    const product = await fetchProduct();

    if (!currentUser || !product) {
        console.log('Current user or product not found:', { currentUser, product });
        addReviewTab.style.display = 'none';
        return;
    }

    const userId = parseInt(currentUser.id);
    const productOwnerId = parseInt(product.user_id);
    const isOwnProduct = userId === productOwnerId;
    const hasReviewed = await hasUserReviewedProduct(userId, product.id_product);

    console.log('User check:', { userId, productOwnerId, isOwnProduct, hasReviewed });

    if (isOwnProduct || hasReviewed) {
        addReviewTab.style.pointerEvents = 'none';
        addReviewTab.style.opacity = '0.5';
        addReviewTab.title = isOwnProduct ? "You cannot review your own product." : "You have already reviewed this product.";
        addReviewForm.style.display = 'none';
    } else {
        addReviewTab.style.pointerEvents = 'auto';
        addReviewTab.style.opacity = '1';
        addReviewTab.title = '';
    }

    reviewTab.addEventListener('click', () => {
        reviewTab.classList.add('clicked');
        addReviewTab.classList.remove('clicked');
        productContainer.style.display = 'block';
        addReviewForm.style.display = 'none';
        renderReviews();
    });

    addReviewTab.addEventListener('click', () => {
        if (isOwnProduct || hasReviewed) {
            console.log('Click prevented due to own product or already reviewed');
            return;
        }
        addReviewTab.classList.add('clicked');
        reviewTab.classList.remove('clicked');
        productContainer.style.display = 'none';
        addReviewForm.style.display = 'block';
    });
}

// Setup review form
async function setupReviewForm() {
    const reviewForm = document.getElementById('reviewForm');
    const productId = parseInt(new URLSearchParams(window.location.search).get('productId'));
    if (!productId) {
        showMessage('No product ID found in URL.', 'error');
        return;
    }

    const product = await fetchProduct();
    if (!product) {
        showMessage('Product not found.', 'error');
        return;
    }

    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) {
            showMessage('Please log in to submit a review.', 'error');
            return;
        }

        const userId = parseInt(currentUser.id);
        const productOwnerId = parseInt(product.user_id);
        if (userId === productOwnerId) {
            console.log('Submission blocked: User owns this product', { userId, productOwnerId });
            showMessage('You cannot review your own product.', 'error');
            return;
        }

        const rating = parseInt(document.getElementById('rating').value);
        const text = document.getElementById('reviewText').value;
        const imageInput = document.getElementById('reviewImage');
        const imageBase64 = imageInput.files[0] ? await convertToBase64(imageInput.files[0]) : null;

        const reviewData = {
            user_id: userId,
            product_id: productId,
            rating,
            text,
            image: imageBase64
        };

        try {
            const response = await fetch(`${BASE_URL}/api/review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reviewData),
                credentials: 'include'
            });
            const result = await response.json();
            if (response.ok) {
                showMessage('Review submitted successfully!', 'success');
                const email = (await getCurrentUser())?.email;
                const response = await fetch(`${BASE_URL}/api/badges/${email}/9`, {
                    method: 'POST',
                    credentials: 'include'
                });
                reviewForm.reset();
                document.querySelector('#profileCategories p:nth-child(1)').click();
            } else {
                showMessage(result.error || 'Failed to submit review.', 'error');
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            showMessage('An error occurred while submitting your review.', 'error');
        }
    });
}

// Convert image to Base64
function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
    });
}

// Setup quantity controls
async function setupQuantityControls() {
    const data = fetchProduct();
    console.log(data);

    const counterValue = document.getElementById('counter-value');
    const incrementBtn = document.getElementById('increment');
    const decrementBtn = document.getElementById('decrement');

    let quantity = 1;
    let stock;

    const product = await fetchProduct();
    stock = product.stock;

    incrementBtn.addEventListener('click', () => {

        if (quantity + 1 > stock) {
            errorMessage.textContent = `Cannot exceed stock limit of ${stock}`;
            return;
        }

        quantity++;
        counterValue.textContent = quantity;
    });

    decrementBtn.addEventListener('click', () => {
        if (quantity > 1) {
            quantity--;
            counterValue.textContent = quantity;
        }
    });
}

// Add item to cart
window.addItemToCart = function () {
    // Get current user and cart ID
    getCurrentUser().then(currentUser => {
        if (!currentUser || !currentUser.id) {
            showMessage('Please log in to add items to your cart.', 'error');
            return;
        }

        const cart_id = parseInt(currentUser.id);
        console.log('Cart_id:', cart_id);

        const urlParams = new URLSearchParams(window.location.search);
        const product_id = parseInt(urlParams.get('productId'));
        console.log('Product_id:', product_id);

        const quantityElement = document.getElementById('counter-value');
        const quantity = parseInt(quantityElement.textContent);
        console.log('Quantity:', quantity);

        if (isNaN(product_id) || isNaN(quantity) || quantity < 1) {
            showMessage('Please select a valid product and quantity.', 'error');
            return;
        }

        if (isNaN(cart_id)) {
            showMessage('Invalid cart ID. Please log in again.', 'error');
            return;
        }

        const data = {
            cart_id,
            quantity
        };
        console.log('Request data:', data);

        fetch(`https://localhost:3000/api/cart/${product_id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include'
        })
            .then(response => {

                const responseStatus = response.ok;
                return response.json().then(result => ({ result, responseStatus }));
            })
            .then(({ result, responseStatus }) => {
                if (responseStatus) {
                    initApp()
                    showMessage(result.message, 'success');
                } else {
                    showMessage(result.error || 'Failed to add item to cart.', 'error');
                }
            })
            .catch(error => {
                console.error('Error adding item to cart:', error);
                showMessage('An error occurred while adding the item to the cart.', 'error');
            });
    }).catch(error => {
        console.error('Error fetching current user:', error);
        showMessage('Failed to retrieve user information. Please log in again.', 'error');
    });
};

// Add or remove item from wishlist (Toggle)
window.addItemToWishlist = async function() {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
        showMessage('Bitte melde dich an, um Produkte zur Wunschliste hinzuzufügen oder zu entfernen.', 'error');
        return;
    }

    const productId = parseInt(new URLSearchParams(window.location.search).get('productId'));
    const userId = parseInt(currentUser.id);

    if (isNaN(productId)) {
        showMessage('Ungültige Produkt-ID.', 'error');
        return;
    }

    const isInWishlist = await isProductInWishlist(userId, productId);

    try {
        if (isInWishlist) {
            const response = await fetch(`${BASE_URL}/api/wishlist/${userId}/item/${productId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const result = await response.json();
            if (response.ok) {
                showMessage('Produkt aus der Wunschliste entfernt.', 'success');
                updateWishlistIcon(false);
            } else {
                showMessage(result.error || 'Fehler beim Entfernen aus der Wunschliste.', 'error');
            }
        } else {
            const data = { user_id: userId };
            const response = await fetch(`${BASE_URL}/api/wishlist/${productId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                credentials: 'include'
            });
            const result = await response.json();
            if (response.ok) {
                showMessage(result.message, 'success');
                updateWishlistIcon(true);
            } else {
                showMessage(result.error || 'Fehler beim Hinzufügen zur Wunschliste.', 'error');
            }
        }
    } catch (error) {
        console.error('Fehler bei der Wunschlisten-Aktion:', error);
        showMessage('Ein Fehler ist aufgetreten.', 'error');
    }
};

// Show message
function showMessage(message, type) {
    const responseDiv = document.querySelector('.response-message');
    if (responseDiv) {
        responseDiv.textContent = message;
        responseDiv.className = `response-message ${type}`;
    }
}

// Display error
function displayError(message) {
    document.querySelector(".detail").innerHTML = `<p style="color: red;">${message}</p>`;
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    await renderProduct();
    await Promise.all([
        setupQuantityControls(),
        renderReviews(),
        setupTabSwitching(),
        setupReviewForm()
    ]);

    const wishlistButton = document.querySelector('.wishlist');
    if (wishlistButton) {
        wishlistButton.addEventListener('click', () => {
            window.addItemToWishlist();
        });
    }
});