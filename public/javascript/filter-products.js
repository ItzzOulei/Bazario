import BASE_URL from './config.js';

// Create all variables
let allProducts = [];
let categories = [];
let selectedCategory = 'all';
let minPrice = 0;
let maxPrice = 100000;
let amountProductsCount = 0;

// Fetch categories from the backend
async function fetchCategories() {
    try {
        const response = await fetch(`${BASE_URL}/api/categories`);
        if (!response.ok) {
            throw new Error(`Error fetching categories, Status: ${response.status}`);
        }
        const data = await response.json();
        categories = data.categories || [];
        populateCategoryDropdown();
        preSelectCategoryFromURL();
    } catch (error) {
        console.error('Error fetching categories:', error);
    }
}

// Get all categories
function populateCategoryDropdown() {
    const categoryOptions = document.getElementById('category-options');
    categoryOptions.innerHTML = '';
    const allOption = document.createElement('li');
    allOption.setAttribute('data-value', 'all');
    allOption.textContent = 'All Categories';
    categoryOptions.appendChild(allOption);

    categories.forEach(category => {
        const li = document.createElement('li');
        li.setAttribute('data-value', category.id_genre);
        li.textContent = category.name;
        categoryOptions.appendChild(li);
    });

    categoryOptions.querySelectorAll('li').forEach(option => {
        option.addEventListener('click', () => {
            const selectButton = document.getElementById('category-button');
            selectButton.textContent = option.textContent;
            selectedCategory = option.getAttribute('data-value');
            document.getElementById('category').value = selectedCategory;
            categoryOptions.classList.remove('active');
            fetchAndFilterProducts();
        });
    });
}

// Fetch products from the backend
async function fetchProducts() {
    try {
        const url = selectedCategory === 'all'
            ? `${BASE_URL}/api/productsDisplay`
            : `${BASE_URL}/api/productsDisplay?categoryId=${selectedCategory}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error fetching products, Status: ${response.status}`);
        }
        const data = await response.json();
        allProducts = data.products || [];
        filterProductsByPrice();
    } catch (error) {
        console.error('Error fetching products:', error);
        displayProducts({ error: 'Failed to load products' });
    }
}

// Fetch products and apply filters
function fetchAndFilterProducts() {
    fetchProducts();
}

// Display products
function displayProducts(products) {
    amountProductsCount = 0;
    const productContainer = document.getElementById('productContainer');
    productContainer.innerHTML = '';

    if (products.error || !Array.isArray(products) || products.length === 0) {
        const noProductsElement = document.createElement('div');
        noProductsElement.classList.add('no-product-item');
        noProductsElement.innerHTML = `
            <p class='description'>No Products Found</p>
        `;
        productContainer.appendChild(noProductsElement);
    } else {
        products.forEach(product => {
            amountProductsCount += 1;
            const productElement = document.createElement('div');
            productElement.classList.add('product-item');

            const productImage = document.createElement('img');
            if (product.picture) {
                const string = atob(product.picture);
                productImage.src = `data:image/jpeg;base64,${string}`;
                productImage.alt = `${product.title} Image`;
            } else {
                productImage.src = '../images/defaultProfile.jpg';
                productImage.alt = 'Default Product Image';
            }

            const productDetails = document.createElement('div');
            productDetails.classList.add('product-details');
            productDetails.innerHTML = `
                <p class='title'>${truncateText(product.title, 15)}</p>
                <p class='description'>${truncateText(product.description, 60)}</p>
                <div class='bottomProductLabels'>
                    <p class='publisher'>${product.publisher}</p>
                    <p class='price'>${product.price} CHF</p>
                </div>
                <p hidden id="productID">${product.id}</p>
            `;

            productElement.appendChild(productImage);
            productElement.appendChild(productDetails);
            productContainer.appendChild(productElement);

            productElement.addEventListener('click', () => {
                const productId = productElement.querySelector('#productID').textContent;
                window.location.href = `../productSite.html?productId=${productId}`;
            });
        });
    }

    displayAmountProducts();
}

// Truncate text for display
function truncateText(text, maxLength) {
    if (!text) return 'No description';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

// Filter products based on price range
function filterProductsByPrice() {
    const filteredProducts = allProducts.filter(product => {
        const price = parseFloat(product.price);
        return price >= minPrice && price <= maxPrice;
    });
    displayProducts(filteredProducts);
}

// Add category dropdown
function setupCategoryDropdown() {
    const selectButton = document.getElementById('category-button');
    const selectOptions = document.getElementById('category-options');

    selectButton.addEventListener('click', () => {
        selectOptions.classList.toggle('active');
    });
}

// Initialize the price range slider
function setupPriceSlider() {
    const minPriceInput = document.getElementById('price-min');
    const maxPriceInput = document.getElementById('price-max');

    function updatePriceFilter() {
        minPrice = parseInt(minPriceInput.value) || 0;
        maxPrice = parseInt(maxPriceInput.value) || 100000;

        if (minPrice > maxPrice) {
            [minPrice, maxPrice] = [maxPrice, minPrice];
            minPriceInput.value = minPrice;
            maxPriceInput.value = maxPrice;
        }

        filterProductsByPrice();
    }

    minPriceInput.addEventListener('input', updatePriceFilter);
    maxPriceInput.addEventListener('input', updatePriceFilter);
}

// Toggle filter UI when clicking icon
function setupFilterToggle() {
    const filterButton = document.getElementById('filter-button');
    const filterContainer = document.querySelector('.filter-container');

    filterButton.addEventListener('click', (event) => {
        event.stopPropagation();
        const isActive = filterContainer.classList.toggle('active');
        document.body.classList.toggle('filter-active', isActive);
    });

    document.addEventListener('click', (event) => {
        if (!filterContainer.contains(event.target) && !filterButton.contains(event.target)) {
            filterContainer.classList.remove('active');
            document.body.classList.remove('filter-active');
        }
    });
}

function displayAmountProducts() {
    const amountProducts = document.getElementById('amountOfProductsFound');
    amountProducts.innerHTML = `
            <p>${amountProductsCount} products</p>
        `;
}

// Load site with preloaded category
function preSelectCategoryFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryId = urlParams.get('categoryId');

    if (categoryId) {
        selectedCategory = categoryId;
        const category = categories.find(cat => cat.id_genre == categoryId);
        const selectButton = document.getElementById('category-button');
        if (category) {
            selectButton.textContent = category.name;
        } else {
            selectButton.textContent = 'Unknown Category';
        }
        document.getElementById('category').value = selectedCategory;
        fetchAndFilterProducts();
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    fetchCategories();
    setupCategoryDropdown();
    setupPriceSlider();
    setupFilterToggle();
    if (!new URLSearchParams(window.location.search).get('categoryId')) {
        fetchProducts();
    }
});