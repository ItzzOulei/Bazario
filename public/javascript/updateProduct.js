import BASE_URL from './config.js';

let productBlob = null;
let currentProduct = null; // Variable, um die aktuellen Produktdaten zu speichern

async function getCurrentUser() {
    try {
        const response = await fetch(`${BASE_URL}/api/me`, {
            credentials: 'include'
        });

        if (!response.ok) {
            console.error("Fehler beim Abrufen des aktuellen Benutzers:", response.status, response.statusText);
            return null;
        }

        const data = await response.json();
        return data.user;
    } catch (error) {
        console.error("Fehler in getCurrentUser:", error.message);
        return null;
    }
}

async function loadProductData() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get("productId");

        if (!productId) {
            showToast("Produkt-ID fehlt!", true);
            return;
        }

        const response = await fetch(`${BASE_URL}/api/products/findId/${productId}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            console.error("Fehler beim Laden des Produkts:", response.status, response.statusText);
            showToast("Produkt konnte nicht geladen werden!", true);
            return;
        }

        const data = await response.json();
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            showToast("Bitte einloggen!", true);
            return;
        }

        if (data.products[0]?.publisher !== currentUser.username) {
            showToast("Du besitzt dieses Produkt nicht!", true);
            return;
        }

        currentProduct = data.products[0]; // Speichere die Produktdaten global
        populateForm(currentProduct);

    } catch (error) {
        console.error("Unerwarteter Fehler in loadProductData:", error.message);
        showToast("Ein unerwarteter Fehler ist aufgetreten!", true);
    }
}

function populateForm(product) {
    try {
        document.getElementById('title').value = product.title || '';
        document.getElementById('description').value = product.description || '';
        document.getElementById('price').value = product.price || '';
        document.getElementById('stock').value = product.stock || '';
        document.getElementById('rabatt').value = product.rabatt || 0;

        const categoryButton = document.getElementById('category-button');
        const categoryHidden = document.getElementById('category');
        if (product.category) {
            categoryButton.textContent = product.category;
            categoryHidden.value = product.category;
        }

        if (product.image) {
            const imageArea = document.getElementById('image-area');
            imageArea.innerHTML = '';
            const img = document.createElement('img');
            img.src = `data:image/jpeg;base64,${atob(product.image)}`;
            imageArea.appendChild(img);
            document.getElementById('file-name').textContent = 'Current image';
        }
    } catch (error) {
        console.error("Fehler in populateForm:", error.message);
    }
}

async function submitProduct(productData) {
    try {
        console.log("Sende Produkt-Update-Anfrage:", productData);
        const response = await fetch(`${BASE_URL}/api/products/${productData.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData),
            credentials: 'include'
        });

        if (!response.ok) {
            const result = await response.json();
            console.error("Error in updating products:", response.status, response.statusText, result);
            throw new Error(result.error || `API-Fehler: ${response.status}`);
        }

        showToast("Produkt succesfully updated!");

        setTimeout(() => {
            window.location.href = `../profile.html?profile=${encodeURIComponent(productData.username)}`;
        }, 1500);

    } catch (error) {
        console.error("Error in submitProduct:", error.message);
        showToast(`Fehler: ${error.message}`, true);
    }
}

async function deleteProduct(productId) {
    try {

        const response = await fetch(`${BASE_URL}/api/products/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_deleted: 1 }),
            credentials: 'include'
        });

        console.log("Antwort-Status:", response.status, response.statusText);

        if (!response.ok) {
            let result;
            try {
                result = await response.json();
                console.error("Fehler-Details vom Server:", result);
            } catch (jsonError) {
                console.error("Konnte die Fehler-Details nicht parsen:", jsonError.message);
                result = { error: "Unbekannter Fehler" };
            }
            throw new Error(result.error || `API-Fehler: ${response.status} - ${response.statusText}`);
        }

        showToast("Product succesfully deleted!");

        setTimeout(async () => {
            const currentUser = await getCurrentUser();
            if (currentUser) {
                window.location.href = `../profile.html?profile=${encodeURIComponent(currentUser.username)}`;
            } else {
                console.error("Benutzer konnte nicht abgerufen werden für Redirect.");
                window.location.href = "../profile.html";
            }
        }, 1500);

    } catch (error) {
        console.error("Eroor in deleteProduct:", error.message);
        showToast(`Error: Product couldn't be deleted - ${error.message}`, true);
    }
}

function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '4px';
    toast.style.zIndex = '1000';
    toast.style.color = 'white';
    toast.style.backgroundColor = isError ? '#f44336' : '#4CAF50';
    toast.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    toast.style.animation = 'slideIn 0.5s, fadeOut 0.5s 2.5s';

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    loadProductData();

    const form = document.getElementById('updateProductForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const productData = {
            id: new URLSearchParams(window.location.search).get("productId"),
            title: formData.get('title'),
            description: formData.get('description'),
            price: parseFloat(formData.get('price')),
            stock: parseInt(formData.get('stock')),
            category: formData.get('category'),
            rabatt: parseFloat(formData.get('rabatt') || 0),
            username: (await getCurrentUser())?.username
        };

        await submitProduct(productData);
    });

    const fileInput = document.getElementById('image');
    const imageArea = document.getElementById('image-area');

    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imageArea.innerHTML = '';
                const img = document.createElement('img');
                img.src = event.target.result;
                imageArea.appendChild(img);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });

    const deleteIcon = document.getElementById('deleteIcon');
    deleteIcon.addEventListener('click', async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get("productId");

        if (!productId) {
            showToast("Produkt-ID fehlt!", true);
            return;
        }

        if (confirm("Bist du sicher, dass du dieses Produkt löschen möchtest?")) {
            await deleteProduct(productId);
        }
    });
});