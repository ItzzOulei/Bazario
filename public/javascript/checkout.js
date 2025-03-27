const BASE_URL = 'https://localhost:3000';

let cartItems = [];
let subtotal = 0;
let discount = 0;
let total = 0;

const cartItemsContainer = document.querySelector('.cart-items');
const subtotalSpan = document.getElementById('subtotal');
const discountSpan = document.getElementById('discount');
const totalSpan = document.getElementById('total');
const couponInput = document.getElementById('coupon-code');
const applyCouponBtn = document.getElementById('apply-coupon');
const confirmCheckoutBtn = document.getElementById('confirm-checkout');
const checkoutMessage = document.getElementById('checkout-message');

async function getCurrentUser() {
    const response = await fetch(`${BASE_URL}/api/me`, { credentials: 'include' });
    if (!response.ok) return null;
    const data = await response.json();
    return parseInt(data.user.id);
}

async function loadCart() {
    const userId = await getCurrentUser();
    if (!userId) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/api/cart/${userId}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to load cart');
        const data = await response.json();
        cartItems = data.products;

        if (cartItems.length === 0) {
            cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
            confirmCheckoutBtn.disabled = true;
            return;
        }

        cartItemsContainer.innerHTML = '';
        subtotal = 0;

        cartItems.forEach(item => {
            const price = item.rabatt > 0 ? item.price * (1 - item.rabatt / 100) : item.price;
            const itemTotal = price * item.total_quantity;
            subtotal += itemTotal;

            const itemDiv = document.createElement('div');
            itemDiv.classList.add('cart-item');
            itemDiv.innerHTML = `
                <img src="data:image/jpeg;base64,${atob(item.picture)}" alt="${item.title}">
                <div class="item-details">
                    <div class="information">
                        <h3>${item.title}</h3>
                        <p>Price: ${roundTo(price, 2)} CHF</p>
                    </div>
                    <div class="information-quanitity">
                        <p>${item.total_quantity}</p>
                    </div>
                </div>
            `;
            cartItemsContainer.appendChild(itemDiv);
        });

        updateSummary();
    } catch (error) {
        console.error('Error loading cart:', error);
    }
}

function updateSummary() {
    total = subtotal - discount;
    subtotalSpan.textContent = subtotal.toFixed(2);
    discountSpan.textContent = discount.toFixed(2);
    totalSpan.textContent = total.toFixed(2);
}

async function applyCoupon() {
    const couponCode = couponInput.value.trim();
    if (!couponCode) {
        checkoutMessage.textContent = 'Please enter a coupon code.';
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/api/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ couponCode })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error);
        }

        const data = await response.json();
        discount = parseFloat(data.discount);
        updateSummary();
        checkoutMessage.textContent = 'Coupon applied successfully!';
        checkoutMessage.style.color = 'green';
    } catch (error) {
        console.error('Coupon error:', error);
        discount = 0;
        updateSummary();
        checkoutMessage.textContent = error.message;
        checkoutMessage.style.color = 'red';
    }
}

async function confirmCheckout() {
    const couponCode = couponInput.value.trim() || null;
    try {
        const response = await fetch(`${BASE_URL}/api/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ couponCode })
        });

        if (!response.ok) throw new Error('Checkout failed');

        const data = await response.json();

        const notification = document.createElement('div');
        notification.className = 'card';
        notification.style.position = 'fixed';
        notification.style.top = '50%';
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.zIndex = '1000';
        notification.innerHTML = `
            <button class="dismiss" type="button">×</button>
            <div class="notification-container">
                <div class="div_image_v">
                    <div class="image">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                            <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                            <g id="SVGRepo_iconCarrier">
                                <path d="M20 7L9.00004 18L3.99994 13" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                            </g>
                        </svg>
                    </div>
                </div>
                <div class="content">
                    <span class="title">Order validated</span>
                    <p class="message">Thank you for your purchase. Order ID: ${data.orderId}. </p>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        // Add dismiss functionality
        notification.querySelector('.dismiss').addEventListener('click', () => {
            notification.remove();
            window.location.href = 'index.html';
        });
    } catch (error) {
        console.error('Checkout error:', error);
        checkoutMessage.textContent = 'Checkout failed. Please try again.';
        checkoutMessage.style.color = 'red';
    }
}

function roundTo(num, decimalPlaces) {
    const factor = 10 ** decimalPlaces;
    return Math.round(num * factor) / factor;
}

document.addEventListener('DOMContentLoaded', () => {
    loadCart();

    applyCouponBtn.addEventListener('click', applyCoupon);
    confirmCheckoutBtn.addEventListener('click', confirmCheckout);
});