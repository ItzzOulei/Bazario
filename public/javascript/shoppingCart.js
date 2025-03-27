import BASE_URL from './config.js';
let listProducts = [];
let carts = [];
let cartId = null;


// DOM-Elemente
const iconCart = document.getElementById("iconCart");
const body = document.querySelector("body");
const checkout = document.querySelector(".checkout");
const closeCart = document.querySelector(".close");
const listProductHTML = document.querySelector(".listProduct");
const listCartHTML = document.querySelector(".listCart");
const iconCartSpan = document.querySelector(".icon-cart span");

function getCurrentUser() {
    return fetch(`${BASE_URL}/api/me`, {
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) return null;
                throw new Error(`Error, Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            return parseInt(data.user.id);
        })
        .catch(error => {
            console.error('Error fetching user:', error);
            return null;
        });
}

// Generische Fetch-Funktion
const fetchAPI = async (endpoint, options = {}) => {
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            ...options
        });

        if (!response.ok) {
            throw new Error(`HTTP-Fehler! Status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Fehler beim Fetchen von ${endpoint}:`, error);
        throw error;
    }
};

// Initialisierung mit cartId
export const initApp = async () => {
    try {
        // Hole die cartId innerhalb der async-Funktion
        cartId = await getCurrentUser();
        console.log('Current Cart ID:', cartId);

        if (!cartId) {
            throw new Error("Can not find cart");
        }

        const cartResponse = await fetchAPI(`/api/cart/${cartId}`);
        carts = cartResponse.products.map(item => ({
            stock: item.stock,
            product_id: item.id_product,
            quantity: item.total_quantity,
            reserved_price: item.total_reserved_price
        }));

        listProducts = cartResponse.products;

        const storedCart = localStorage.getItem("cart");
        if (storedCart) {
            const localCart = JSON.parse(storedCart);
            localCart.forEach(localItem => {
                const existingItem = carts.find(item => item.product_id === localItem.product_id);
                if (!existingItem) {
                    carts.push(localItem);
                }
            });
        }

        if (listProductHTML) {
            addDataToHTML();
        }
        if (listCartHTML) {
            addCartHTML();
        }
    } catch (error) {
        console.error("Fehler beim Initialisieren der App:", error);

        listProducts = await fetch('testData/product.json').then(res => res.json());
        carts = await fetch('testData/cart.json').then(res => res.json()) || [];
        if (listProductHTML) addDataToHTML();
        if (listCartHTML) addCartHTML();
    }
};

// POST-Anfrage zum Aktualisieren des Warenkorbs
export const updateCartAPI = async (cartData, productId) => {
    try {
        const parsedProductId = parseInt(productId);

        const currentProduct = cartData.find(item => item.product_id === parsedProductId);

        if (!currentProduct) {
            console.error(`Produkt mit ID ${productId} nicht in cartData gefunden`);
            return null;
        }

        const formattedCartData = {
            quantity: currentProduct.quantity,
            cart_id: cartId // Verwende die globale cartId
        };

        const response = await fetchAPI(`/api/cart/${currentProduct.product_id}`, {
            method: 'PUT',
            body: JSON.stringify(formattedCartData)
        });

        return response;
    } catch (error) {
        console.error("Fehler beim Aktualisieren des Warenkorbs:", error);
    }
};

const addDataToHTML = () => {
    if (!listProductHTML) return;

    listProductHTML.innerHTML = "";
    if (listProducts.length > 0) {
        listProducts.forEach(product => {
            const string = atob(product.picture);
            const newProduct = document.createElement("div");
            newProduct.classList.add("item");
            newProduct.dataset.id = product.id_product;
            newProduct.innerHTML = `
                <img src="data:image/jpeg;base64,${string}" alt="${product.title}">
                <h2>${product.title}</h2>
                <div class="price">${product.price.toFixed(2)}.-</div>
                ${product.rabatt ? `<div class="discount">Rabatt: ${product.rabatt}%</div>` : ''}
                ${product.flash_sale_discount ? `<div class="flash-sale">Flash Sale: ${product.flash_sale_discount}%</div>` : ''}
                <button class="addCart">Zum Warenkorb</button>
            `;
            listProductHTML.appendChild(newProduct);
        });
    }
};

export const addToCart = (product_id) => {
    const productId = parseInt(product_id);
    const positionThisProductInCart = carts.findIndex((value) => value.product_id === productId);

    if (positionThisProductInCart < 0) {
        carts.push({
            product_id: productId,
            quantity: "1" // Als String für Konsistenz
        });
    } else {
        const currentQuantity = parseInt(carts[positionThisProductInCart].quantity);
        carts[positionThisProductInCart].quantity = (currentQuantity + 1).toString();
    }
    initApp();
    addCartHTML();
    updateCartAPI(carts, productId);
};

function deleteCartItem(product_id) {
    const positionItemInCart = carts.findIndex(item => item.product_id == product_id);

    if (positionItemInCart === -1) {
        console.error(`Produkt mit ID ${product_id} nicht in carts gefunden`);
        return;
    }

    const currentQuantity = carts[positionItemInCart].quantity;
    carts.splice(positionItemInCart, 1);

    addCartHTML();

    fetch(`https://localhost:3000/api/cart/${cartId}/item/${product_id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Fehler beim Löschen des Produkts aus dem Warenkorb');
            }
            return response.json();
        })
        .then(data => {
            console.log('Produkt erfolgreich aus dem Warenkorb entfernt:', data);
        })
        .catch(error => {
            console.error('Fehler beim Löschen:', error);
            carts.splice(positionItemInCart, 0, { product_id, quantity: currentQuantity });
            addCartHTML();
        });
}

const addCartHTML = () => {
    if (!listCartHTML) return;

    listCartHTML.innerHTML = "";

    if (carts.length > 0) {
        carts.forEach(cart => {
            const qty = parseInt(cart.quantity);

            const newCart = document.createElement("div");
            newCart.classList.add("item");
            newCart.dataset.id = cart.product_id;

            const positionProduct = listProducts.findIndex((value) => value.id_product === cart.product_id);
            if (positionProduct >= 0) {
                const info = listProducts[positionProduct];
                const string = atob(info.picture);
                const finalPrice = info.rabatt ?
                    info.price * (1 - info.rabatt / 100) :
                    info.price;
                newCart.innerHTML = `
                    <div class="image">
                        <img src="data:image/jpeg;base64,${string}" alt="${info.title}">
                    </div>
                    <div class="name">${info.title}</div>
                    <div class="totalPrice">${(finalPrice * qty).toFixed(2)}.-</div>
                    <div class="quantity">
                        <span class="minus"><</span>
                        <span>${qty}</span>
                        <span class="plus">></span>
                    </div>
                `;
                listCartHTML.appendChild(newCart);
            }
        });
        if (iconCartSpan) {
            const totalQuantity = carts.reduce((sum, item) => {
                return sum + parseInt(item.quantity); // quantity in Zahl umwandeln und addieren
            }, 0);
            iconCartSpan.textContent = totalQuantity;
        }
    }
};

const changeQuantity = (product_id, type) => {
    const positionItemInCart = carts.findIndex((value) => value.product_id === product_id);
    if (positionItemInCart >= 0) {
        const cartItem = carts[positionItemInCart];
        const stock = cartItem.stock;
        let currentQuantity = parseInt(cartItem.quantity);

        switch (type) {
            case "plus":
                if (currentQuantity + 1 > stock) {
                    console.error(`Kann nicht erhöht werden: Nur ${stock} Einheiten auf Lager`);
                    alert(`Nur ${stock} Einheiten auf Lager!`);
                    return;
                }
                currentQuantity += 1;
                break;
            case "minus":
                currentQuantity -= 1;
                if (currentQuantity <= 0) {
                    deleteCartItem(product_id);
                    return;
                }
                break;
            default:
                console.error(`Unbekannter Typ: ${type}`);
                return;
        }

        cartItem.quantity = currentQuantity;
        addCartHTML();
        updateCartAPI(carts, product_id);
    } else {
        console.error(`Produkt mit ID ${product_id} nicht im Warenkorb gefunden`);
    }
};

// Event-Listener
document.addEventListener("DOMContentLoaded", () => {
    initApp();

    if (listProductHTML) {
        listProductHTML.addEventListener("click", (event) => {
            const positionClick = event.target;
        });
    }

    if (iconCart) {
        iconCart.addEventListener("click", (event) => {
            body?.classList.toggle("showCart");
            const product_id = event.target.dataset.id;
            if (product_id) {
                addToCart(product_id);
            }
        });
    }

    if (closeCart) {
        closeCart.addEventListener("click", () => {
            body?.classList.toggle("showCart");
        });
    }

    if (checkout) {
        checkout.addEventListener("click", () => {
            window.location.href="/checkout.html";
        });
    }

    if (listCartHTML) {
        listCartHTML.addEventListener("click", (event) => {
            const positionClick = event.target;
            if (positionClick.classList.contains("minus") || positionClick.classList.contains("plus")) {
                const product_id = parseInt(positionClick.parentElement.parentElement.dataset.id);
                const type = positionClick.classList.contains("plus") ? "plus" : "minus";
                changeQuantity(product_id, type);
            }
        });
    }
});