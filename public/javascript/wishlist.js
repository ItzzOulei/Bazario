import BASE_URL from './config.js';

let wishlist = [];
let userId = null;

const wishlistTableBody = document.querySelector('.wishlist-table tbody');

function getCurrentUser() {
    return fetch(`${BASE_URL}/api/me`, { credentials: 'include' })
        .then(response => {
            if (!response.ok) throw new Error('User not authenticated');
            return response.json();
        })
        .then(data => parseInt(data.user.id))
        .catch(error => {
            console.error('Error fetching user:', error);
            return null;
        });
}

const initApp = async () => {
    try {
        userId = await getCurrentUser();
        console.log('Current user ID:', userId);
        if (!userId || isNaN(userId) || userId <= 0) {
            throw new Error('Ungültige Benutzer-ID');
        }

        const response = await fetch(`${BASE_URL}/api/wishlist/${userId}`, {
            credentials: 'include'
        });
        const wishlistResponse = await response.json();
        console.log('Wishlist response:', wishlistResponse);

        if (!response.ok) {
            throw new Error(wishlistResponse.error || 'Failed to fetch wishlist');
        }

        wishlist = wishlistResponse.products;
        addWishlistToHTML();
    } catch (error) {
        console.error('Error initializing wishlist:', error);
        if (wishlistTableBody) {
            wishlistTableBody.innerHTML = '<tr><td colspan="4">Fehler beim Laden der Wunschliste</td></tr>';
        }
    }
};

const addWishlistToHTML = () => {
    console.log('Rendering wishlist:', wishlist);
    if (!wishlistTableBody) return;

    wishlistTableBody.innerHTML = '';
    if (wishlist.length > 0) {
        wishlist.forEach(item => {
            console.log('Item.id_product:', item.id_product);
            console.log('Raw picture data:', item.picture);
            console.log('Picture length:', item.picture ? item.picture.length : 'N/A');
            let imageSrc;
            if (item.picture) {
                try {
                    const decodedBase64 = atob(item.picture.trim()); // Wie Produkt-Seite
                    imageSrc = `data:image/jpeg;base64,${decodedBase64}`;
                } catch (e) {
                    console.error('Base64 decoding failed for', item.title, ':', e);
                    imageSrc = `data:image/jpeg;base64,${item.picture.trim()}`; // Fallback ohne atob
                }
            } else {
                imageSrc = '../images/defaultProfile.jpg';
            }
            const row = document.createElement('tr');
            row.innerHTML = `
    <tr>
        <td>
            <a href="../productSite.html?productId=${item.id_product}" class="product-link">
                <img src="${imageSrc}" alt="${item.title} Bild" onerror="this.src='../images/defaultProfile.jpg'; console.error('Image failed to load for ${item.title}');">
            </a>
        </td>
        <td>
            <a href="../productSite.html?productId=${item.id_product}" class="product-link">${item.title}</a>
        </td>
        <td>
            <a href="../productSite.html?productId=${item.id_product}" class="product-link">${parseFloat(item.price).toFixed(2)} CHF</a>
        </td>
        <td>
            <button class="remove-btn" data-id="${item.id_product}">
                <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 24 24">
                    <path fill-rule="evenodd" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm7.707-3.707a1 1 0 0 0-1.414 1.414L10.586 12l-2.293 2.293a1 1 0 1 0 1.414 1.414L12 13.414l2.293 2.293a1 1 0 0 0 1.414-1.414L13.414 12l2.293-2.293a1 1 0 0 0-1.414-1.414L12 10.586 9.707 8.293Z" clip-rule="evenodd"/>
                </svg> 
            </button>
        </td>
    </tr>
`;
            wishlistTableBody.appendChild(row);
        });

        const removeButtons = wishlistTableBody.querySelectorAll('.remove-btn');
        removeButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const productId = button.dataset.id;
                console.log('Product ID vor DELETE:', productId);
                if (!productId || isNaN(parseInt(productId)) || parseInt(productId) <= 0) {
                    console.error('Ungültige Produkt-ID:', productId);
                    return;
                }
                console.log('DELETE URL:', `${BASE_URL}/api/wishlist/${userId}/item/${productId}`);
                try {
                    const response = await fetch(`${BASE_URL}/api/wishlist/${userId}/item/${productId}`, {
                        method: 'DELETE',
                        credentials: 'include'
                    });
                    const result = await response.json();
                    if (response.ok) {
                        wishlist = wishlist.filter(item => item.id_product !== parseInt(productId));
                        addWishlistToHTML();
                    } else {
                        console.error('Delete error:', result);
                    }
                } catch (error) {
                    console.error('Fetch error on delete:', error);
                }
            });
        });
    } else {
        wishlistTableBody.innerHTML = '<tr><td colspan="4">Deine Wunschliste ist leer</td></tr>';
    }
};

document.addEventListener('DOMContentLoaded', initApp);