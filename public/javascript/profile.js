import BASE_URL from './config.js';

const urlParams = new URLSearchParams(window.location.search);
let searchUsername = urlParams.get('profile');

async function getCurrentUser() {
    try {
        const response = await fetch(`${BASE_URL}/api/me`, {
            credentials: 'include',
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

async function readUserData() {
    try {
        if (!searchUsername) {
            throw new Error('Kein Benutzername in der URL gefunden');
        }
        console.log('Fetching data for username:', searchUsername);
        const response = await fetch(`${BASE_URL}/api/users/${searchUsername}`, {
            credentials: 'include',
        });
        if (!response.ok) {
            throw new Error(`Error, Status: ${response.status}`);
        }
        const data = await response.json();
        displayUser(data);
    } catch (error) {
        console.error('Error fetching user:', error);
        document.getElementById('userContainer').innerHTML = `<p>Fehler beim Laden der Benutzerdaten: ${error.message}</p>`;
    }
}

async function readUserProducts() {
    try {
        if (!searchUsername) {
            throw new Error('Kein Benutzername in der URL gefunden');
        }
        const response = await fetch(`${BASE_URL}/api/products/publisher/${searchUsername}`);
        if (!response.ok) {
            if (response.status === 404) {
                displayProducts({ error: 'No products found' });
                return;
            }
            throw new Error(`Error, Status: ${response.status}`);
        }
        const productData = await response.json();
        displayProducts(productData);
    } catch (error) {
        console.error('Error fetching product data:', error);
        document.getElementById('productContainer').innerHTML = `<p>Fehler beim Laden der Produkte: ${error.message}</p>`;
    }
}

async function readUserAchievements() {
    try {
        if (!searchUsername) {
            throw new Error('Kein Benutzername in der URL gefunden');
        }
        const response = await fetch(`${BASE_URL}/api/users/${searchUsername}/badges`);
        if (!response.ok) {
            if (response.status === 404) {
                displayAchievements({ error: 'No badges found' });
                return;
            }
            throw new Error(`Error, Status: ${response.status}`);
        }
        const badgeData = await response.json();
        displayAchievements(badgeData);
    } catch (error) {
        console.error('Error fetching badge data:', error);
    }
}

async function displayUser(userData) {
    const user = userData.user;
    const userContainer = document.getElementById('userContainer');
    userContainer.innerHTML = '';

    const userElement = document.createElement('div');
    userElement.classList.add('user-item');

    const profileImage = document.createElement('img');
    if (user.profile_image) {
        const string = atob(user.profile_image);
        profileImage.src = `data:image/jpeg;base64,${string}`;
    } else {
        profileImage.src = '../images/defaultProfile.jpg';
    }
    profileImage.alt = `${user.username}'s Profile Image`;

    const userDetails = document.createElement('div');
    userDetails.classList.add('user-details');
    userDetails.innerHTML = `
        <p class="username">${user.username}</p>
        <p class="description">Rating: ${user.calculated_rating || user.rating || 'Not rated yet'}</p>
        <p class="description">Products Sold: ${user.products_sold}</p>
    `;

    userElement.appendChild(profileImage);
    userElement.appendChild(userDetails);

    const currentUser = await getCurrentUser();
    if (currentUser && currentUser.username === user.username) {
        const settingsIcon = document.createElement('div');
        settingsIcon.classList.add('user-settings');
        settingsIcon.innerHTML = `
            <a href="../settingsProfile.html">
                <button class="image-button">
                    <img src="../images/settings.svg" alt="User Settings">
                </button>
            </a>
        `;
        userElement.appendChild(settingsIcon);
    }

    if (user.products_sold > 0) {
        const response = await fetch(`${BASE_URL}/api/badges/${user.email}/3`, {
            method: 'POST',
            credentials: 'include'
        });
    }
    if (user.products_sold > 100) {
        const response = await fetch(`${BASE_URL}/api/badges/${user.email}/4`, {
            method: 'POST',
            credentials: 'include'
        });
    }
    if (user.products_bought > 10) {
        const response = await fetch(`${BASE_URL}/api/badges/${user.email}/5`, {
            method: 'POST',
            credentials: 'include'
        });
    }

    userContainer.appendChild(userElement);
}

async function displayProducts(productData) {
    const productDisplay = document.getElementById('productContainer');
    productDisplay.innerHTML = '';

    const productWrapper = document.createElement('div');
    productWrapper.id = 'productWrapper';

    const activeSection = document.createElement('div');
    activeSection.classList.add('active-products');
    const activeHeader = document.createElement('h2');
    activeHeader.textContent = 'Active Products';
    const activeRow = document.createElement('div');
    activeRow.classList.add('product-row');

    const inactiveSection = document.createElement('div');
    inactiveSection.classList.add('inactive-products');
    const inactiveHeader = document.createElement('h2');
    inactiveHeader.textContent = 'Deleted products';
    const inactiveRow = document.createElement('div');
    inactiveRow.classList.add('product-row');

    activeSection.appendChild(activeHeader);
    activeSection.appendChild(activeRow);
    inactiveSection.appendChild(inactiveHeader);
    inactiveSection.appendChild(inactiveRow);

    if (productData.error || !productData.products || productData.products.length === 0) {
        const noProductsElement = document.createElement('div');
        noProductsElement.classList.add('no-product-item');
        noProductsElement.innerHTML = `<p class="description">No Products Yet</p>`;
        productWrapper.appendChild(noProductsElement);
        productDisplay.appendChild(productWrapper);
        return;
    }

    const currentUser = await getCurrentUser();
    const activeProducts = productData.products.filter(product => product.is_deleted === 0 || product.is_deleted === undefined);
    const inactiveProducts = productData.products.filter(product => product.is_deleted === 1);

    const createProductElement = (product) => {
        const productElement = document.createElement('div');
        productElement.classList.add('product-item');

        const isOwnProduct = currentUser && currentUser.username === product.publisher;
        const imageContainer = document.createElement('div');
        imageContainer.classList.add('image-container');

        const productImage = document.createElement('img');
        if (product.image) {
            try {
                const string = atob(product.image);
                productImage.src = `data:image/jpeg;base64,${string}`;
                productImage.alt = `${product.title} Image`;
            } catch (e) {
                console.error(`Error decoding image for product ${product.id}:`, e);
                productImage.src = '../images/defaultProfile.jpg';
                productImage.alt = 'Default Product Image';
            }
        } else {
            productImage.src = '../images/defaultProfile.jpg';
            productImage.alt = 'Default Product Image';
        }

        if (isOwnProduct) {
            productElement.setAttribute('data-uploaded', 'true');
            const editIcon = document.createElement('span');
            editIcon.classList.add('edit-icon');
            editIcon.innerHTML = `
                <a href="../updateProduct.html?productId=${product.id}">
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m14.3 4.8 2.9 2.9M7 17H17l3-3V7a1 1 0 0 0-1-1h-3M4 20v-3L14.3 6.7a1 1 0 0 1 1.4 0l2.9 2.9a1 1 0 0 1 0 1.4L8.4 21.3A1 1 0 0 1 7 22H4a1 1 0 0 1-1-1Z"/>
                    </svg>
                </a>
            `;
            imageContainer.appendChild(editIcon);
        }

        imageContainer.appendChild(productImage);
        productElement.appendChild(imageContainer);

        const productDetails = document.createElement('div');
        productDetails.classList.add('product-details');
        productDetails.innerHTML = `
            <p class="title">${truncateText(product.title, 15)}</p>
            <p class="description">${truncateText(product.description, 60)}</p>
            <div class="bottomProductLabels">
                <p class="publisher">${product.publisher}</p>
                <p class="price">${product.price} CHF</p>
            </div>
            <p hidden id="productID">${product.id}</p>
        `;
        productElement.appendChild(productDetails);

        return productElement;
    };

    if (activeProducts.length > 0) {
        activeProducts.map(createProductElement).forEach(element => activeRow.appendChild(element));
    } else {
        const noActiveElement = document.createElement('div');
        noActiveElement.innerHTML = '<p>No active products available</p>';
        activeRow.appendChild(noActiveElement);
    }

    if (inactiveProducts.length > 0) {
        inactiveProducts.map(createProductElement).forEach(element => inactiveRow.appendChild(element));
    } else {
        const noInactiveElement = document.createElement('div');
        noInactiveElement.innerHTML = '<p>No inactive products available</p>';
        inactiveRow.appendChild(noInactiveElement);
    }

    productWrapper.appendChild(activeSection);
    productWrapper.appendChild(inactiveSection);
    productDisplay.appendChild(productWrapper);

    [activeRow, inactiveRow].forEach(row => {
        row.querySelectorAll('.product-item').forEach(element => {
            element.addEventListener('mouseover', () => {
                const icon = element.querySelector('.edit-icon');
                if (icon) icon.style.opacity = '1';
            });
            element.addEventListener('mouseout', () => {
                const icon = element.querySelector('.edit-icon');
                if (icon) icon.style.opacity = '0';
            });
            element.addEventListener('click', function () {
                const productIdElement = this.querySelector('#productID');
                if (productIdElement) {
                    const productId = productIdElement.textContent;
                    window.location.href = `../productSite.html?productId=${productId}`;
                }
            });
        });
    });
}

async function displayAchievements(badgeData) {
    const productDisplay = document.getElementById('productContainer');
    productDisplay.innerHTML = '';

    if (badgeData.error || (Array.isArray(badgeData.badges) && badgeData.badges.length === 0)) {
        const noBadgesElement = document.createElement('div');
        noBadgesElement.classList.add('no-product-item');
        noBadgesElement.innerHTML = `<p class="description">No Achievements Yet</p>`;
        productDisplay.appendChild(noBadgesElement);
    } else if (Array.isArray(badgeData.badges) && badgeData.badges.length > 0) {
        badgeData.badges.forEach(badge => {
            const badgeElement = document.createElement('div');
            badgeElement.classList.add('badge-item');

            const badgeImage = document.createElement('img');
            badgeImage.classList.add('badge-picture');
            if (badge.picture) {
                const string = atob(badge.picture);
                badgeImage.src = `data:image/jpeg;base64,${string}`;
                badgeImage.alt = `${badge.name} Image`;
            } else {
                badgeImage.src = '../images/defaultProfile.jpg';
                badgeImage.alt = 'Default Badge Image';
            }
            badgeImage.setAttribute('aria-label', `Badge: ${badge.name}`);

            const badgePictureContainer = document.createElement('div');
            badgePictureContainer.classList.add('badge-picture-container');
            badgePictureContainer.appendChild(badgeImage);

            const tooltip = document.createElement('div');
            tooltip.classList.add('badge-tooltip');
            tooltip.innerHTML = `
                <h3 class="title">${badge.name}</h3>
                <p class="description">${badge.description}</p>
                <p class="description">Earned on: ${new Date(badge.assigned_at).toLocaleDateString()}</p>
            `;
            badgePictureContainer.appendChild(tooltip);

            badgeElement.appendChild(badgePictureContainer);
            productDisplay.appendChild(badgeElement);
        });
    } else {
        console.error('Unexpected badgeData format:', badgeData);
    }
}

async function displayAddProductForm() {
    console.log('displayAddProductForm wird aufgerufen'); // Debugging
    const productDisplay = document.getElementById('productContainer');
    productDisplay.innerHTML = '';

    const formElement = document.createElement('div');
    formElement.classList.add('add-product-form');
    formElement.innerHTML = `
        <h3>Add a New Product</h3>
        <form id="addProductForm">
            <div class="form-group">
                <label class="add-Product-label" for="title">Title:</label>
                <input type="text" id="title" name="title" required>
                <span class="error-message" id="title-error"></span>
            </div>
            <div class="form-group">
                <label class="add-Product-label" for="description">Description:</label>
                <textarea id="description" name="description" required></textarea>
                <span class="error-message" id="description-error"></span>
            </div>
            <div class="form-group">
                <label class="add-Product-label" for="price">Price (CHF):</label>
                <input type="number" id="price" name="price" step="0.01" required>
                <span class="error-message" id="price-error"></span>
            </div>
            <div class="form-group">
                <label class="add-Product-label" for="stock">Stock:</label>
                <input type="number" id="stock" name="stock" required>
                <span class="error-message" id="stock-error"></span>
            </div>
            <div class="form-group">
                <label class="add-Product-label" for="category">Category:</label>
                <div class="custom-select">
                    <div class="select-button" id="category-button">Select a category</div>
                    <ul class="select-options" id="category-options"></ul>
                </div>
                <input type="hidden" id="category" name="category" required>
                <span class="error-message" id="category-error"></span>
            </div>
            <label class="add-Product-label" for="image">Product Image:</label>
            <div class="image-area-container">
                <div class="image-area" id="image-area">
                    <span class="upload-icon">
                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h3a3 3 0 0 0 0-6h-.025a5.56 5.56 0 0 0 .025-.5A5.5 5.5 0 0 0 7.207 9.021C7.137 9.017 7.071 9 7 9a4 4 0 1 0 0 8h2.167M12 19v-9m0 0-2 2m2-2 2 2"/>
                        </svg>
                    </span>
                    <h3 class="upload-text">Upload Image</h3>
                    <p class="description-for-image">Drag or select image <span>here</span></p>
                </div>
                <label class="custom-file-upload" for="image">Choose image</label>
                <input class="select-image" type="file" id="image" name="image" accept="image/*">
                <span class="error-message" id="image-error"></span>
                <p class="file-name" id="file-name">No file selected</p>
            </div>
            <button type="submit">Add Product</button>
        </form>
    `;

    productDisplay.appendChild(formElement);

    const form = document.getElementById('addProductForm');
    if (!form) {
        console.error('Formular #addProductForm nicht gefunden!');
        return;
    }
    console.log('Formular gefunden, Event-Listener wird hinzugefügt'); // Debugging

    try {
        const response = await fetch(`${BASE_URL}/api/categories`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch categories');
        const data = await response.json();
        const categories = data.categories;

        const selectOptions = document.getElementById('category-options');
        selectOptions.innerHTML = '';
        categories.forEach(category => {
            const li = document.createElement('li');
            li.setAttribute('data-value', category.name);
            li.textContent = category.name;
            selectOptions.appendChild(li);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
        document.getElementById('category-options').innerHTML = '<li>Error loading categories</li>';
    }

    const selectButton = document.getElementById('category-button');
    const selectOptions = document.getElementById('category-options');
    const hiddenCategoryInput = document.getElementById('category');

    selectButton.addEventListener('click', () => {
        selectOptions.classList.toggle('active');
    });

    selectOptions.querySelectorAll('li').forEach(option => {
        option.addEventListener('click', () => {
            selectButton.textContent = option.textContent;
            hiddenCategoryInput.value = option.getAttribute('data-value');
            selectOptions.classList.remove('active');
        });
    });

    const fileInput = document.getElementById('image');
    const fileNameDisplay = document.getElementById('file-name');
    const imageArea = document.getElementById('image-area');

    const handleFile = (file) => {
        if (file) {
            fileNameDisplay.textContent = file.name;
            const reader = new FileReader();
            reader.onload = (e) => {
                imageArea.innerHTML = '';
                const img = document.createElement('img');
                img.src = e.target.result;
                imageArea.appendChild(img);
            };
            reader.readAsDataURL(file);
        } else {
            fileNameDisplay.textContent = 'No File selected';
            imageArea.innerHTML = `
                <span class="upload-icon">
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h3a3 3 0 0 0 0-6h-.025a5.56 5.56 0 0 0 .025-.5A5.5 5.5 0 0 0 7.207 9.021C7.137 9.017 7.071 9 7 9a4 4 0 1 0 0 8h2.167M12 19v-9m0 0-2 2m2-2 2 2"/>
                    </svg>
                </span>
                <h3 class="upload-text">Upload image</h3>
            `;
        }
    };

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        handleFile(file);
    });

    imageArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        imageArea.classList.add('dragover');
    });

    imageArea.addEventListener('dragleave', () => {
        imageArea.classList.remove('dragover');
    });

    imageArea.addEventListener('drop', (e) => {
        e.preventDefault();
        imageArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            fileInput.files = e.dataTransfer.files;
            handleFile(file);
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        console.log('Formular wird gesendet'); // Debugging

        const formData = new FormData(event.target);
        const title = formData.get('title').trim();
        const description = formData.get('description').trim();
        const price = formData.get('price');
        const stock = formData.get('stock');
        const category = formData.get('category');
        const imageFile = formData.get('image');

        const titleError = document.getElementById('title-error');
        const descriptionError = document.getElementById('description-error');
        const priceError = document.getElementById('price-error');
        const stockError = document.getElementById('stock-error');
        const categoryError = document.getElementById('category-error');
        const imageError = document.getElementById('image-error');

        titleError.textContent = '';
        descriptionError.textContent = '';
        priceError.textContent = '';
        stockError.textContent = '';
        categoryError.textContent = '';
        imageError.textContent = '';

        let hasError = false;

        if (!title) {
            titleError.textContent = 'Title is required.';
            hasError = true;
        } else if (title.length < 3 || title.length > 100) {
            titleError.textContent = 'Title must be between 3 and 100 characters.';
            hasError = true;
        }

        if (!description) {
            descriptionError.textContent = 'Description is required.';
            hasError = true;
        } else if (description.length < 10 || description.length > 1000) {
            descriptionError.textContent = 'Description must be between 10 and 1000 characters.';
            hasError = true;
        }

        const priceValue = parseFloat(price);
        if (!price) {
            priceError.textContent = 'Price is required.';
            hasError = true;
        } else if (priceValue > 100000) {
            priceError.textContent = 'Price cannot exceed 100,000 CHF.';
            hasError = true;
        }

        const stockValue = parseInt(stock);
        if (!stock) {
            stockError.textContent = 'Stock is required.';
            hasError = true;
        } else if (isNaN(stockValue) || stockValue < 0) {
            stockError.textContent = 'Stock must be a non-negative number.';
            hasError = true;
        } else if (stockValue > 1000) {
            stockError.textContent = 'Stock cannot exceed 1000 units.';
            hasError = true;
        }

        if (!category) {
            categoryError.textContent = 'Please select a category.';
            hasError = true;
        }

        if (imageFile && imageFile.size > 0) {
            const maxFileSize = 5 * 1024 * 1024;
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(imageFile.type)) {
                imageError.textContent = 'Only JPEG, PNG, or GIF images are allowed.';
                hasError = true;
            } else if (imageFile.size > maxFileSize) {
                imageError.textContent = 'Image size must not exceed 5 MB.';
                hasError = true;
            }
        }

        if (hasError) return;

        const productData = {
            title,
            description,
            price: priceValue,
            stock: stockValue,
            username: (await getCurrentUser())?.username || searchUsername,
            category,
        };

        console.log('Prepared product data:', productData); // Debugging
        if (imageFile && imageFile.size > 0) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const finalProductData = {
                    ...productData,
                    picture: reader.result.split(',')[1],
                };
                console.log('Final product data with image:', finalProductData); // Debugging
                await submitProduct(finalProductData);
            };
            reader.readAsDataURL(imageFile);
        } else {
            await submitProduct(productData);
        }
    });
}

async function submitProduct(productData) {
    const url = `${BASE_URL}/api/products`;
    console.log('Submitting product data:', productData); // Debugging
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData),
            credentials: 'include',
        });
        console.log('Response status:', response.status); // Debugging
        const result = await response.json();
        if (!response.ok) {
            throw new Error(`${result.error || 'Error adding product'}, Status: ${response.status}`);
        }
        const email = (await getCurrentUser())?.email;
        if (email) {
            console.log('Assigning badge for email:', email); // Debugging
            await fetch(`${BASE_URL}/api/badges/${email}/8`, {
                method: 'POST',
                credentials: 'include',
            });
        }
        alert('Product added successfully!');
        switchTab('Products');
    } catch (error) {
        console.error('Error adding product:', error);
        alert('Failed to add product: ' + error.message);
    }
}

async function switchTab(tabName) {
    const tabs = document.querySelectorAll('#profileCategories p');
    const currentUser = await getCurrentUser();

    tabs.forEach(tab => {
        tab.classList.remove('clicked');
        if (tab.textContent === tabName) {
            tab.classList.add('clicked');
        }
        if (tab.textContent === 'Add Product' && (!currentUser || currentUser.username !== searchUsername)) {
            tab.style.display = 'none';
        } else if (tab.textContent === 'Add Product') {
            tab.style.display = 'block';
        }
    });

    console.log('Switching to tab:', tabName); // Debugging
    if (tabName === 'Products') {
        readUserProducts();
    } else if (tabName === 'Achievements') {
        readUserAchievements();
    } else if (tabName === 'Add Product' && currentUser && currentUser.username === searchUsername) {
        displayAddProductForm();
    }
}

function truncateText(text, maxLength) {
    if (!text) return 'No description';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        console.log('No user logged in');
    } else {
        console.log(`Logged in as: ${currentUser.username}`);
    }

    if (!searchUsername && currentUser) {
        searchUsername = currentUser.username;
        console.log('Fallback auf aktuellen Benutzer:', searchUsername);
    }

    if (!searchUsername) {
        console.error('Kein Profil-Username verfügbar! URL:', window.location.href);
        document.body.innerHTML = '<h1>Fehler: Kein Profil angegeben.</h1>';
        return;
    }

    await readUserData();
    await readUserProducts();

    const tabs = document.querySelectorAll('#profileCategories p');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchTab(tab.textContent);
        });
        if (tab.textContent === 'Add Product' && (!currentUser || currentUser.username !== searchUsername)) {
            tab.style.display = 'none';
        } else if (tab.textContent === 'Add Product') {
            tab.style.display = 'block';
        }
    });
});