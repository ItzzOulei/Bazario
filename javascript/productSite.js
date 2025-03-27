document.addEventListener("DOMContentLoaded", () => {
    fetch("http://nschaererle:3000/api/products/findId/2")
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const product = data.products[0];
            const productImage = atob(product.image);

            if (!product) {
                throw new Error("No product data found");
            }

            return fetch("http://nschaererle:3000/api/users")
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(userData => {
                    console.log("API-Antwort von /api/users:", userData); // Debugging
                    // Vergleiche publisher (Benutzername) statt publisher_id
                    const user = userData.users
                        ? userData.users.find(u => u.username === product.publisher)
                        : userData.find(u => u.username === product.publisher);
                    const profileImage = user ? atob(user.profile_image) : null;

                    const productDetail = document.querySelector(".detail");
                    productDetail.innerHTML = `
                        <div class="image-container">
                            <div class="image">
                                <img src="data:image/png;base64,${productImage}" alt="${product.description || 'Kein Bild verfügbar'}">
                            </div>
                            <div class="infos-publisher">
                                <div class="publisher-profile">
                                    ${profileImage ? `<img src="data:image/png;base64,${profileImage}" alt="Profilbild von ${product.publisher || 'Unbekannt'}" class="profile-image">` : ''}
                                    <div class="publisher" data-id="${product.publisher_id || ''}">
                                        Created by @${product.publisher || 'Unbekannt'}
                                    </div>
                                </div>
                                <div class="creation_date">
                                    ${product.created_at ? new Date(product.created_at).toLocaleDateString("de-DE") : 'Unbekannt'}
                                </div>
                            </div>
                        </div>
                        <div class="content">
                            <div class="title">${product.title || 'Unknown Titel'}</div>
                            <div class="price">${parseFloat(product.price || 0).toFixed(2)} €</div>
                            <div class="button">
                                <button class="add-to-cart">
                                    Add to Cart
                                    <span>
                                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 4h1.5L9 16m0 0h8m-8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-8.5-3h9.25L19 7H7.312"/>
                                        </svg>
                                    </span>
                                </button>
                                <input type="number" min="1" max="${product.stock || 0}" value="1" class="quantity-input" aria-label="Menge auswählen">
                            </div>
                            <div class="stock">In Stock ${product.stock || 0}</div>
                            <div class="description">${product.description || 'No description'}</div>
                        </div>
                    `;

                    const quantityInput = document.querySelector(".quantity-input");
                    quantityInput.max = product.stock;
                    if (product.stock < quantityInput.value) {
                        quantityInput.value = product.stock;
                    }

                    quantityInput.addEventListener("input", () => {
                        if (parseInt(quantityInput.value) > product.stock) {
                            quantityInput.value = product.stock;
                        } else if (parseInt(quantityInput.value) < 1) {
                            quantityInput.value = 1;
                        }
                    });
                });
        })
        .catch(error => {
            console.error("Error with fetching product or user:", error);
            const productDetail = document.querySelector(".detail");
            productDetail.innerHTML = `<p>Fehler beim Laden des Produkts: ${error.message}</p>`;
        });
});