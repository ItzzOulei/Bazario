// Run this before starting:
// npm install express mysql2 cors multer bcrypt sharp express-session

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcrypt');
const sharp = require('sharp');
const https = require('https');
const fs = require('fs');
const session = require('express-session');

const app = express();
const PORT = 3000;
const BASE_URL = 'https://localhost';

// Database connection
let db = mysql.createConnection({
    host: 'localhost',
    user: 'bazario',
    password: '1234',
    database: 'bazario'
});

db.connect((err) => {
    if (err) {
        console.error('Connection failed, trying Fallback:', err);

        db = mysql.createConnection({
            host: 'localhost',
            user: 'bazario',
            password: '1234',
            database: 'bazario'
        });

        db.connect((err) => {
            if (err) {
                console.error('Error while connecting:', err);
            } else {
                console.log('DB Successfully connected');
            }
        });
    } else {
        console.log('DB Successfully connected');
    }
});

// Increase limits to handle larger Base64-encoded images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Session setup
app.use(session({
    secret: '5FC449C4D3BE9B8783E66E962574C',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Configure multer for file uploads with increased size limit
const upload = multer({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

app.use(express.static(path.join(__dirname, '..', 'public')));

// HTTPS options
const options = {
    key: fs.readFileSync(path.join(__dirname, '..', 'server.key')),
    cert: fs.readFileSync(path.join(__dirname, '..', 'server.cert'))
};

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Please log in first' });
    }
};

// Login endpoint
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const sql = 'SELECT id_user, username, email, password FROM user WHERE email = ?';
        const [user] = await db.promise().query(sql, [email]);

        if (!user.length) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const passwordMatch = await bcrypt.compare(password, user[0].password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        req.session.userId = user[0].id_user;
        req.session.username = user[0].username;
        req.session.email = user[0].email;

        res.json({ message: `User ${user[0].username} logged in successfully`, username: user[0].username });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Signup endpoint
app.post('/api/signup', async (req, res) => {
    console.log('Signup request received:', req.body);
    const { firstname, name, username, email, password, birthdate } = req.body;

    if (!firstname || !name || !username || !email || !password || !birthdate) {
        console.log('Missing fields:', req.body);
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const checkSql = 'SELECT id_user FROM user WHERE username = ? OR email = ?';
        const [existing] = await db.promise().query(checkSql, [username, email]);
        if (existing.length > 0) {
            console.log('Duplicate found:', { username, email });
            return res.status(409).json({ error: 'Username or email already exists' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        await db.promise().beginTransaction();
        const insertSql = `
            INSERT INTO user (firstname, name, username, email, password, birthdate, rating, products_sold, picture)
            VALUES (?, ?, ?, ?, ?, ?, 0, 0, NULL)
        `;
        const [result] = await db.promise().query(insertSql, [
            firstname, name, username, email, hashedPassword, birthdate
        ]);

        console.log('User inserted:', { insertId: result.insertId, username });
        if (!result.insertId) {
            throw new Error('User insertion failed - no ID returned');
        }

        await db.promise().commit();
        console.log('Transaction committed');

        req.session.userId = result.insertId;
        req.session.username = username;
        req.session.email = email;

        res.status(201).json({
            message: 'User registered successfully',
            userId: result.insertId,
            username
        });
    } catch (error) {
        console.error('Signup error:', {
            message: error.message,
            sqlMessage: error.sqlMessage,
            sqlState: error.sqlState,
            stack: error.stack
        });
        await db.promise().rollback();
        res.status(500).json({
            error: 'Server error during signup',
            details: error.message,
            sqlMessage: error.sqlMessage || 'N/A'
        });
    }
});

// Get current user info
app.get('/api/me', isAuthenticated, async (req, res) => {
    try {
        const sql = 'SELECT id_user AS id, username, email, rating, products_sold, products_bought, TO_BASE64(picture) AS profile_image FROM user WHERE id_user = ?';
        const [user] = await db.promise().query(sql, [req.session.userId]);

        if (!user.length) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: user[0] });
    } catch (error) {
        console.error('Error fetching current user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Logout endpoint
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Error logging out' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out successfully' });
    });
});

// Routes for serving static pages
app.get('/home', (req, res) => {
    const filePath = path.join(__dirname, '..', 'public', 'index.html');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(500).send('Server error');
        }
    });
});

app.get('/login', (req, res) => {
    const filePath = path.join(__dirname, '..', 'public', 'login.html');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(500).send('Server error');
        }
    });
});

app.get('/register', (req, res) => {
    const filePath = path.join(__dirname, '..', 'public', 'register.html');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(500).send('Server error');
        }
    });
});

// API for productsDisplay
app.get('/api/productsDisplay', (req, res) => {
    const { categoryId } = req.query; // Optional categoryId query parameter

    let sql = `
        SELECT p.id_product AS id, p.title, p.description, u.username AS publisher, p.price, p.rabatt AS rabatt, TO_BASE64(p.picture) AS picture
        FROM product p
                 JOIN user u ON p.user_id = u.id_user
    `;
    const params = [];

    if (categoryId) {
        sql += `
            JOIN product_genre pg ON p.id_product = pg.id_product 
            WHERE pg.id_genre = ?
        `;
        params.push(parseInt(categoryId));
    }

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Failed to retrieve products:', err);
            return res.status(500).json({ error: 'Failed to retrieve products' });
        }
        res.json({ products: results });
    });
});

// API for products in sale
app.get('/api/products/inSale', (req, res) => {
    const sql = 'SELECT p.id_product AS id, p.title, p.description, u.username AS publisher, p.price, p.rabatt AS rabatt, TO_BASE64(p.picture) AS picture FROM product p JOIN product_genre pg ON p.id_product = pg.id_product JOIN genre g ON pg.id_genre = g.id_genre JOIN user u ON p.user_id = u.id_user WHERE p.rabatt > 0;';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Failed to retrieve products', err);
            return res.status(500).json({ error: 'Failed to retrieve products' });
        }
        res.json({ products: results });
    });
});

// API for product by ID
app.get('/api/products/findId/:id', (req, res) => {
    const productId = parseInt(req.params.id);
    if (isNaN(productId) || productId <= 0) {
        return res.status(404).json({ error: 'Invalid product id' });
    }

    const sql = 'SELECT p.id_product AS id, p.creation_date AS created_at, p.title, p.description, u.username AS publisher, u.id_user AS publisher_id, p.price, TO_BASE64(p.picture) AS image, p.stock, p.rabatt, p.is_deleted, GROUP_CONCAT(g.name) AS category FROM product p JOIN user u ON p.user_id = u.id_user LEFT JOIN product_genre pg ON p.id_product = pg.id_product LEFT JOIN genre g ON pg.id_genre = g.id_genre WHERE p.id_product = ? GROUP BY p.id_product, p.creation_date, p.title, p.description, u.username, u.id_user, p.price, p.picture, p.stock, p.rabatt, p.is_deleted;';

    db.query(sql, [productId], (err, results) => {
        if (err) {
            console.error('Failed to retrieving products', err);
            return res.status(500).json({ error: 'Failed to retrieving products' });
        }
        console.log('Products retrieved from DB:', results); // Debugging
        res.json({ products: results });
    });
});

// Get products by publisher username
app.get('/api/products/publisher/:username', (req, res) => {
    const username = req.params.username;
    if (!username || typeof username !== 'string' || username.trim() === '') {
        return res.status(400).json({ error: 'Invalid username' });
    }
    const sql = 'SELECT p.id_product AS id, p.title, p.description, u.username AS publisher, p.price, TO_BASE64(p.picture) AS image, p.stock, p.rabatt, p.is_deleted FROM product p JOIN user u ON p.user_id = u.id_user WHERE u.username = ?;';
    db.query(sql, [username], (err, results) => {
        if (err) {
            console.error('Failed to retrieve products', err);
            return res.status(500).json({ error: 'Failed to retrieve products' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'No products found for this publisher' });
        }
        console.log('Products retrieved:', results); // Debugging
        res.json({ products: results });
    });
});

app.get('/api/users/:username', (req, res) => {
    const username = req.params.username;
    if (!username || typeof username !== 'string' || username.trim() === '') {
        return res.status(400).json({ error: 'Invalid username' });
    }

    const sql = `
        SELECT
            u.id_user AS id,
            u.username,
            u.rating,
            u.products_sold,
            u.email,
            u.products_bought,
            TO_BASE64(u.picture) AS profile_image,
            COALESCE(AVG(r.rating), 0) AS calculated_rating
        FROM user u
                 LEFT JOIN product p ON u.id_user = p.user_id
                 LEFT JOIN review r ON p.id_product = r.product_id
        WHERE u.username = ?
        GROUP BY u.id_user, u.username, u.rating, u.products_sold, u.email, u.picture
    `;

    db.query(sql, [username], (err, results) => {
        if (err) {
            console.error('Failed to retrieve user:', err);
            return res.status(500).json({ error: 'Failed to retrieve user' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = results[0];
        user.calculated_rating = parseFloat(user.calculated_rating).toFixed(2); // Format rating
        res.json({ user });
    });
});

// API for all users
app.get('/api/users', (req, res) => {
    const sql = 'SELECT u.id_user AS id, u.username, u.rating, u.products_sold, TO_BASE64(u.picture) AS profile_image FROM user u;';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Failed to retrieve users', err);
            return res.status(500).json({ error: 'Failed to retrieve users' });
        }
        res.json({ users: results });
    });
});

// API to get products in cart
app.get('/api/cart/:id', (req, res) => {
    const cartId = parseInt(req.params.id);

    // Validate cart ID
    if (isNaN(cartId) || cartId <= 0) {
        return res.status(400).json({ error: 'Invalid cart ID' });
    }

    const sql = `
        SELECT
            p.id_product,
            p.title,
            p.description,
            p.price,
            p.stock,
            p.rabatt,
            TO_BASE64(p.picture) AS picture,
            p.creation_date,
            p.is_deleted,
            p.flash_sale_discount,
            SUM(ci.quantity) AS total_quantity,
            SUM(ci.reserved_price) AS total_reserved_price
        FROM
            cart c
                JOIN cart_item ci ON c.id_cart = ci.cart_id
                JOIN product p ON ci.product_id = p.id_product
        WHERE
            c.id_cart = ?
        GROUP BY
            p.id_product,
            p.title,
            p.description,
            p.price,
            p.stock,
            p.rabatt,
            p.picture,
            p.creation_date,
            p.is_deleted,
            p.flash_sale_discount;
    `;

    db.query(sql, [cartId], (err, results) => {
        if (err) {
            console.error('Failed to retrieve products in cart:', err);
            return res.status(500).json({ error: 'Failed to retrieve products in cart' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'No products found in cart' });
        }

        res.json({ products: results });
    });
});

// API to delete a product
app.delete('/api/cart/:cart_id/item/:product_id', (req, res) => {
    const { cart_id, product_id } = req.params;
    const productId = parseInt(product_id);

    console.log(req.params);
    console.log(productId);
    console.log(cart_id);

    if (!cart_id || !productId) {
        return res.status(400).json({ error: 'Invalid cart- or product- ID' });
    }

    sql = `delete from cart_item where cart_id = ? and product_id = ?;`

    db.query(sql, [cart_id, productId], (err, results) => {
        if (err) {
            console.error('Failed to retrieve products in cart:', err);
            return res.status(500).json({ error: 'Failed to retrieve products in cart' });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'No products found in cart' });
        }

        db.commit()
        return res.status(200).json({ message: 'Successfully deleted!' });
    })
})

// API to update products
app.put('/api/cart/:id', (req, res) => {
    const productId = parseInt(req.params.id);
    const { cart_id, quantity } = req.body;

    if (!quantity || !cart_id || isNaN(productId)) {
        return res.status(400).json({ error: 'Invalid request' });
    }

    if (quantity <= 0) {
        return res.status(400).json({ error: 'Quantity must be a positive number' });
    }

    const sql = `UPDATE cart_item SET reserved_price = (reserved_price / quantity) * ?, quantity = ? WHERE cart_id = ? AND product_id = ?;`;

    db.query(sql, [quantity, quantity, cart_id, productId], (err, results) => {
        if (err) {
            console.error('Failed to update cart item:', err);
            return res.status(500).json({ error: 'Failed to update cart item' });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Cart item not found for the given cart_id and product_id' });
        }

        db.commit();
        return res.status(200).json({ message: 'Cart item updated successfully', affectedRows: results.affectedRows });
    });
});


// API to add product to cart
app.post('/api/cart/:id', (req, res) => {
    const product_id = parseInt(req.params.id);
    const { cart_id, quantity } = req.body;

    if (!cart_id || !quantity || isNaN(product_id)) {
        return res.status(400).json({ error: 'Missing or invalid cart_id, product_id, or quantity' });
    }

    const quantityNum = parseInt(quantity, 10);
    if (isNaN(quantityNum) || quantityNum <= 0) {
        return res.status(400).json({ error: 'Invalid quantity' });
    }

    const getPriceSql = 'SELECT price FROM product WHERE id_product = ?';
    db.query(getPriceSql, [product_id], (err, priceResult) => {
        if (err) {
            console.error('Failed to retrieve product price', err);
            return res.status(500).json({ error: 'Failed to retrieve product price' });
        }

        if (priceResult.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const price = parseFloat(priceResult[0].price);
        if (isNaN(price)) {
            return res.status(500).json({ error: 'Invalid price in database' });
        }

        const reserved_price = price * quantityNum;
        if (isNaN(reserved_price) || !Number.isFinite(reserved_price)) {
            return res.status(500).json({ error: 'Invalid calculated reserved_price' });
        }

        const checkSql = 'SELECT id_cart_item, quantity, reserved_price FROM cart_item WHERE cart_id = ? AND product_id = ?';
        db.query(checkSql, [cart_id, product_id], (err, existingItems) => {
            if (err) {
                console.error('Failed to check existing cart item:', err);
                return res.status(500).json({ error: 'Failed to check existing cart item' });
            }

            if (existingItems.length > 0) {
                const existingItem = existingItems[0];
                const newQuantity = existingItem.quantity + quantityNum;
                const existingReservedPrice = parseFloat(existingItem.reserved_price);
                const newReservedPrice = existingReservedPrice + reserved_price;

                if (isNaN(newReservedPrice) || !Number.isFinite(newReservedPrice)) {
                    return res.status(500).json({ error: 'Invalid updated reserved_price' });
                }

                const updateSql = 'UPDATE cart_item SET quantity = ?, reserved_price = ? WHERE id_cart_item = ?';
                db.query(updateSql, [newQuantity, newReservedPrice, existingItem.id_cart_item], (err, updateResult) => {
                    if (err) {
                        console.error('Failed to update cart item:', err);
                        return res.status(500).json({ error: 'Failed to update cart item' });
                    }

                    db.commit();
                    res.status(200).json({
                        message: 'Cart item updated successfully',
                        cart_item: { cart_id, product_id, quantity: newQuantity, reserved_price: newReservedPrice }
                    });
                });
            } else {
                const insertSql = 'INSERT INTO cart_item (cart_id, product_id, quantity, reserved_price) VALUES (?, ?, ?, ?)';
                db.query(insertSql, [cart_id, product_id, quantityNum, reserved_price], (err, insertResult) => {
                    if (err) {
                        console.error('Failed to add item to cart:', err);
                        return res.status(500).json({ error: 'Failed to add item to cart' });
                    }

                    db.commit();
                    res.status(201).json({
                        message: 'Item added to cart successfully',
                        cart_item: { cart_id, product_id, quantity: quantityNum, reserved_price }
                    });
                });
            }
        });
    });
});

// API to get reviews for a product
app.get('/api/review/:id', (req, res) => {
    const product_id = parseInt(req.params.id);

    if (isNaN(product_id) || product_id <= 0) {
        return res.status(400).json({ error: 'Invalid product ID' });
    }

    const sql = `
        SELECT
            r.rating,
            r.text,
            TO_BASE64(r.image) AS image,
            r.created_at,
            u.username,
            r.user_id,
            TO_BASE64(u.picture) AS picture
        FROM review r
                 JOIN user u ON r.user_id = u.id_user
        WHERE r.product_id = ?
    `;

    db.query(sql, [product_id], (err, results) => {
        if (err) {
            console.error('Failed to retrieve reviews:', err);
            return res.status(500).json({ error: 'Failed to retrieve reviews' });
        }
        res.json({ reviews: results });
    });
});

// API to add a review
app.post('/api/review', isAuthenticated, express.json(), (req, res) => {
    const { user_id, product_id, rating, text, image } = req.body;

    if (!user_id || !product_id || !rating) {
        return res.status(400).json({ error: 'User ID, product ID, and rating are required' });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Validate authenticated user matches the provided user_id
    if (parseInt(req.session.userId) !== parseInt(user_id)) {
        return res.status(403).json({ error: 'Unauthorized: User ID does not match session' });
    }

    db.beginTransaction(async (err) => {
        if (err) {
            console.error('Transaction error:', err);
            return res.status(500).json({ error: 'Transaction initialization failed' });
        }

        try {
            // Check if user has already reviewed this product
            const [existingReview] = await db.promise().query(
                'SELECT id_review FROM review WHERE user_id = ? AND product_id = ?',
                [user_id, product_id]
            );
            if (existingReview.length > 0) {
                throw new Error('User has already reviewed this product');
            }

            // Check if the user is the owner of the product
            const [product] = await db.promise().query(
                'SELECT user_id FROM product WHERE id_product = ?',
                [product_id]
            );
            if (product.length === 0) {
                throw new Error('Product not found');
            }
            if (parseInt(product[0].user_id) === parseInt(user_id)) {
                throw new Error('You cannot review your own product');
            }

            // Insert review
            const sql = `
                INSERT INTO review (user_id, product_id, rating, text, image, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            const values = [
                user_id,
                product_id,
                rating,
                text || null,
                image ? Buffer.from(image, 'base64') : null, // Convert Base64 to binary if provided
                new Date()
            ];

            const [result] = await db.promise().query(sql, values);

            await db.promise().commit();
            res.status(201).json({
                message: 'Review added successfully',
                reviewId: result.insertId
            });
        } catch (error) {
            console.error('Error adding review:', error);
            await db.promise().rollback();
            res.status(error.message === 'You cannot review your own product' ? 403 : 500).json({
                error: error.message || 'Failed to add review'
            });
        }
    });
});
// API to create a product
app.post('/api/products', (req, res) => {
    const { title, picture, description, price, stock, username, category, rabatt = 0 } = req.body;

    if (!title || !description || !price || !stock || !username || !category) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    let processedImage = picture;
    if (picture) {
        const base64Data = picture.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        sharp(imageBuffer)
            .resize({ width: 600, height: 600, fit: 'cover', position: 'center' })
            .toBuffer((err, buffer) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to process image' });
                }
                processedImage = buffer.toString('base64');
                insertProduct();
            });
    } else {
        insertProduct();
    }

    function insertProduct() {
        db.beginTransaction((err) => {
            if (err) return res.status(500).json({ error: 'Transaction failed' });

            db.query('SELECT id_user FROM user WHERE username = ?', [username], (err, userResults) => {
                if (err || !userResults.length) {
                    return rollbackAndError('User not found');
                }
                const user_id = userResults[0].id_user;

                db.query('SELECT id_genre FROM genre WHERE name = ?', [category], (err, categoryResult) => {
                    let genre_id;
                    if (err) return rollbackAndError('Database error');
                    if (!categoryResult.length) {
                        db.query('INSERT INTO genre (name, is_flash_sale) VALUES (?, ?)', [category, 0], (err, insertResult) => {
                            if (err) return rollbackAndError('Failed to create genre');
                            genre_id = insertResult.insertId;
                            insertProductData();
                        });
                    } else {
                        genre_id = categoryResult[0].id_genre;
                        insertProductData();
                    }

                    function insertProductData() {
                        const sql = `INSERT INTO product (title, picture, description, price, stock, user_id, rabatt, creation_date, is_deleted, flash_sale_discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                        const values = [title, processedImage, description, price, stock, user_id, rabatt, new Date(), 0, 0];
                        db.query(sql, values, (err, productResult) => {
                            if (err) return rollbackAndError('Failed to insert product');
                            const productId = productResult.insertId;

                            db.query('INSERT INTO product_genre (id_product, id_genre) VALUES (?, ?)', [productId, genre_id], (err) => {
                                if (err) return rollbackAndError('Failed to link genre');

                                db.commit((err) => {
                                    if (err) return rollbackAndError('Commit failed');
                                    res.status(201).json({ message: 'Product added successfully', productId, category });
                                });
                            });
                        });
                    }
                });
            });

            function rollbackAndError(message) {
                db.rollback(() => res.status(500).json({ error: message }));
            }
        });
    }
});

// API to update product
// API to update product
app.put('/api/products/:id', isAuthenticated, express.json(), (req, res) => {
    const productId = parseInt(req.params.id);
    const updates = req.body; // z. B. { is_deleted: 1 }

    // Input validation
    if (isNaN(productId)) {
        return res.status(400).json({ error: 'Invalid product ID' });
    }

    // Der Benutzer kommt aus der Session (dank isAuthenticated Middleware)
    const currentUserId = req.session.userId;
    const currentUsername = req.session.username;

    if (!currentUserId || !currentUsername) {
        return res.status(401).json({ error: 'Unauthorized: No user logged in' });
    }

    // Produkt abrufen und user_id überprüfen
    db.query('SELECT id_product, picture, user_id, is_deleted FROM product WHERE id_product = ?', [productId], (err, existingProduct) => {
        if (err) {
            console.error('Error checking product:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!existingProduct.length) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Überprüfe, ob der aktuelle Benutzer der Besitzer des Produkts ist
        if (existingProduct[0].user_id !== currentUserId) {
            return res.status(403).json({ error: 'Forbidden: You can only edit your own products' });
        }

        // Wenn is_deleted bereits 1 ist und wieder auf 1 gesetzt werden soll, keine Änderung nötig
        if (existingProduct[0].is_deleted === 1 && updates.is_deleted === true) {
            return res.status(400).json({ error: 'Product is already deleted' });
        }

        // Erstelle ein Objekt mit den zu aktualisierenden Feldern
        const updateFields = {};
        const updateValues = [];

        // Nur Felder hinzufügen, die in der Anfrage übergeben wurden
        if (updates.title !== undefined) {
            updateFields.title = updates.title;
            if (!updates.title) {
                return res.status(400).json({ error: 'Title cannot be empty' });
            }
        }
        if (updates.description !== undefined) {
            updateFields.description = updates.description;
        }
        if (updates.price !== undefined) {
            updateFields.price = updates.price;
            if (typeof updates.price !== 'number' || updates.price < 0) {
                return res.status(400).json({ error: 'Price must be a non-negative number' });
            }
        }
        if (updates.stock !== undefined) {
            updateFields.stock = updates.stock;
            if (typeof updates.stock !== 'number' || updates.stock < 0) {
                return res.status(400).json({ error: 'Stock must be a non-negative number' });
            }
        }
        if (updates.rabatt !== undefined) {
            updateFields.rabatt = updates.rabatt;
        }
        if (updates.is_deleted !== undefined) {
            updateFields.is_deleted = updates.is_deleted ? 1 : 0;
        }

        // Bildverarbeitung (nur wenn ein neues Bild hochgeladen wird und nicht gelöscht wird)
        if (updates.picture !== undefined && updates.is_deleted !== true) {
            const base64Data = updates.picture.replace(/^data:image\/\w+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');

            sharp(imageBuffer)
                .resize({
                    width: 600,
                    height: 600,
                    fit: 'cover',
                    position: 'center'
                })
                .toBuffer((err, buffer) => {
                    if (err) {
                        console.error('Image processing failed:', err);
                        return res.status(500).json({ error: 'Failed to process image' });
                    }
                    updateFields.picture = buffer.toString('base64');
                    updateProduct();
                });
        } else {
            updateProduct();
        }

        function updateProduct() {
            // Wenn keine Felder zu aktualisieren sind, sende eine Fehlermeldung
            if (Object.keys(updateFields).length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            db.beginTransaction((err) => {
                if (err) {
                    console.error('Transaction begin error:', err);
                    return res.status(500).json({ error: 'Transaction failed' });
                }

                // Erstelle die SQL-Abfrage dynamisch
                const fields = Object.keys(updateFields).map(field => `${field} = ?`).join(', ');
                const values = Object.values(updateFields);
                values.push(productId); // Für die WHERE-Klausel

                const updateProductSql = `
                    UPDATE product
                    SET ${fields}
                    WHERE id_product = ?;
                `;

                db.query(updateProductSql, values, (err, productUpdateResult) => {
                    if (err) {
                        return rollbackAndError(err, 'Failed to update product');
                    }
                    if (productUpdateResult.affectedRows === 0) {
                        return rollbackAndError(new Error('No rows affected'), 'Product update failed');
                    }

                    // Genre-Änderungen nur bei normaler Aktualisierung
                    if (updates.genre && updates.is_deleted !== true) {
                        db.query('DELETE FROM product_genre WHERE id_product = ?', [productId], (err) => {
                            if (err) {
                                return rollbackAndError(err, 'Failed to delete genre');
                            }

                            db.query(
                                'INSERT INTO product_genre (id_product, id_genre) VALUES (?, ?)',
                                [productId, updates.genre],
                                (err) => {
                                    if (err) {
                                        return rollbackAndError(err, 'Failed to insert genre');
                                    }
                                    commitAndRespond('Product and genre updated successfully');
                                }
                            );
                        });
                    } else {
                        commitAndRespond(updates.is_deleted === true ? 'Product marked as deleted successfully' : 'Product updated successfully');
                    }
                });

                function rollbackAndError(error, message) {
                    db.rollback(() => {
                        console.error('Error updating product:', error);
                        res.status(500).json({ error: message, details: error.message });
                    });
                }

                function commitAndRespond(message) {
                    db.commit((err) => {
                        if (err) {
                            return rollbackAndError(err, 'Commit failed');
                        }
                        res.status(200).json({ message });
                    });
                }
            });
        }
    });
});

// API to update profile
app.put('/api/update-profile', express.json(), async (req, res) => {
    try {
        const { username, newUsername, email, password, profile_image } = req.body;

        if (!username || !newUsername || !email) {
            return res.status(400).json({ error: 'Username, new username, and email are required' });
        }

        const userResults = await new Promise((resolve, reject) => {
            const getUserSql = 'SELECT id_user FROM user WHERE username = ?';
            db.query(getUserSql, [username], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        if (userResults.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = userResults[0].id_user;
        const saltRounds = 10;
        const values = [newUsername, email];
        let updateSql = 'UPDATE user SET username = ?, email = ?';

        if (password) {
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            updateSql += ', password = ?';
            values.push(hashedPassword);
        }

        if (profile_image) {
            updateSql += ', picture = ?';
            values.push(profile_image);
        }

        updateSql += ' WHERE id_user = ?';
        values.push(userId);

        await new Promise((resolve, reject) => {
            db.query(updateSql, values, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error while updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// API to get all categories
app.get('/api/categories', (req, res) => {
    const sql = 'SELECT id_genre, name FROM genre';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Failed to retrieve categories:', err);
            return res.status(500).json({ error: 'Failed to retrieve categories' });
        }
        res.json({ categories: results });
    });
});

// API to get badges for a user by username
app.get('/api/users/:username/badges', (req, res) => {
    const username = req.params.username;
    if (!username || typeof username !== 'string' || username.trim() === '') {
        return res.status(400).json({ error: 'Invalid username' });
    }

    const sql = `
        SELECT b.id_badge AS id, b.name, b.description, b.picture, ub.assigned_at
        FROM badge b
                 JOIN user_badge ub ON b.id_badge = ub.id_badge
                 JOIN user u ON ub.id_user = u.id_user
        WHERE u.username = ?;
    `;
    db.query(sql, [username], (err, results) => {
        if (err) {
            console.error('Failed to retrieve badges:', err);
            return res.status(500).json({ error: 'Failed to retrieve badges' });
        }

        // Convert the picture to base64
        const badges = results.map(badge => {
            badge.picture = badge.picture.toString('base64');
            return badge;
        });

        res.json({ badges });
    });
});
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Error logging out' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out successfully' });
    });
});
app.get('/logout', (req, res) => {
    const filePath = path.join(__dirname, '..', 'public', 'logout.html');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(500).send('Server error');
        }
    });
});

// API to assign badge
app.post('/api/badges/:email/:badgeId', isAuthenticated, (req, res) => {
    const { email, badgeId } = req.params;
    const id_badge = parseInt(badgeId);

    if (!email || typeof email !== 'string' || email.trim() === '') {
        return res.status(400).json({ error: 'Invalid email' });
    }
    if (isNaN(id_badge) || id_badge <= 0) {
        return res.status(400).json({ error: 'Invalid badge ID' });
    }

    // Check if user exists
    db.query('SELECT id_user FROM user WHERE email = ?', [email], (err, userResults) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (userResults.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const id_user = userResults[0].id_user;

        // Check if the badge exists
        db.query('SELECT id_badge FROM badge WHERE id_badge = ?', [id_badge], (err, badgeResults) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (badgeResults.length === 0) {
                return res.status(404).json({ error: 'Badge not found' });
            }

            // Check if user owns badge
            db.query(
                'SELECT * FROM user_badge WHERE id_user = ? AND id_badge = ?',
                [id_user, id_badge],
                (err, existingAssignment) => {
                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }
                    if (existingAssignment.length > 0) {
                        return res.status(409).json({ error: 'Badge already assigned to this user' });
                    }

                    // Assign the badge to the user
                    db.query(
                        'INSERT INTO user_badge (id_user, id_badge, assigned_at) VALUES (?, ?, ?)',
                        [id_user, id_badge, new Date()],
                        (err, result) => {
                            if (err) {
                                return res.status(500).json({ error: 'Failed to assign badge', details: err.message });
                            }

                            db.commit((err) => {
                                if (err) {
                                    return db.rollback(() => {
                                        res.status(500).json({ error: 'Failed to commit transaction', details: err.message });
                                    });
                                }
                                res.status(201).json({
                                    message: `Badge ${id_badge} assigned to user ${email} successfully`
                                });
                            });
                        }
                    );
                }
            );
        });
    });
});
app.get('/impressum', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'impressum.html'));
});

app.get('/agb', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'agb.html'));
});

app.get('/dataprivacy', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'dataprivacy.html'));
});

// Checkout API
app.post('/api/checkout', isAuthenticated, express.json(), (req, res) => {
    const userId = req.session.userId;
    const cartId = userId;
    const { couponCode } = req.body;

    if (!cartId) {
        return res.status(400).json({ error: 'Cart ID is required' });
    }

    db.beginTransaction((err) => {
        if (err) {
            console.error('Transaction error:', err);
            return res.status(500).json({ error: 'Transaction initialization failed' });
        }

        db.query(`
            SELECT ci.product_id, ci.quantity, ci.reserved_price, p.price, p.stock, p.rabatt, p.user_id
            FROM cart_item ci
                     JOIN product p ON ci.product_id = p.id_product
            WHERE ci.cart_id = ?
        `, [cartId], (err, cartItems) => {
            if (err) {
                return db.rollback(() => {
                    console.error('Query error:', err);
                    res.status(500).json({ error: 'Failed to fetch cart items' });
                });
            }

            if (!cartItems.length) {
                return db.rollback(() => {
                    res.status(400).json({ error: 'Cart is empty' });
                });
            }

            let subtotal = 0;
            for (const item of cartItems) {
                if (item.quantity > item.stock) {
                    return db.rollback(() => {
                        res.status(400).json({ error: `Insufficient stock for product ID ${item.product_id}` });
                    });
                }
                const price = item.rabatt > 0 ? item.price * (1 - item.rabatt / 100) : item.price;
                subtotal += price * item.quantity;
            }

            let totalAmount = subtotal;
            let discountApplied = 0;

            if (couponCode) {
                db.query(`
                    SELECT discount AS discount, min_amount AS min_amount, expiration_date, is_active
                    FROM coupon
                    WHERE code = ? AND is_active = TRUE AND expiration_date >= CURDATE()
                `, [couponCode], (err, coupon) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error('Coupon query error:', err);
                            res.status(500).json({ error: 'Failed to check coupon' });
                        });
                    }

                    if (!coupon.length) {
                        return db.rollback(() => {
                            res.status(400).json({ error: 'Invalid or expired coupon' });
                        });
                    }

                    const { discount, min_amount } = coupon[0];
                    if (subtotal < min_amount) {
                        return db.rollback(() => {
                            res.status(400).json({ error: `You have to spend a minimum of ${min_amount} CHF` });
                        });
                    }

                    discountApplied = subtotal * (discount / 100);
                    totalAmount = subtotal - discountApplied;

                    processOrder();
                });
            } else {
                processOrder();
            }

            function processOrder() {
                db.query(`
                    INSERT INTO bazario.order (user_id, total_price, delivery_address)
                    VALUES (?, ?, 'Teststreet')
                `, [userId, totalAmount], (err, orderResult) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error('Order insert error:', err);
                            res.status(500).json({ error: 'Failed to create order' });
                        });
                    }
                    const orderId = orderResult.insertId;

                    let completedItems = 0;
                    cartItems.forEach((item, index) => {
                        const price = item.rabatt > 0 ? item.price * (1 - item.rabatt / 100) : item.price;
                        db.query(`
                            INSERT INTO order_item (order_id, product_id, quantity, price_at_time)
                            VALUES (?, ?, ?, ?)
                        `, [orderId, item.product_id, item.quantity, price], (err) => {
                            if (err) {
                                return db.rollback(() => {
                                    console.error('Order item insert error:', err);
                                    res.status(500).json({ error: 'Failed to add order item' });
                                });
                            }

                            db.query(`
                                UPDATE user
                                SET products_sold = products_sold + ?
                                WHERE id_user = ?
                            `, [item.quantity, item.user_id], (err) => {
                                if (err) {
                                    return db.rollback(() => {
                                        console.error('Product update error:', err);
                                        res.status(500).json({ error: 'Failed to update product stock' });
                                    });
                                };

                                db.query(`
                                    UPDATE user
                                    SET products_bought = products_bought + ?
                                    WHERE id_user = ?
                                `, [item.quantity, userId], (err, results) => {
                                    if (err) {
                                        console.error('Buyer update error:', err);
                                        return db.rollback(() => {
                                            res.status(500).json({ error: 'Failed to update buyer stats' });
                                        });
                                    }

                                    db.query(`
                                        UPDATE product
                                        SET stock = stock - ?
                                        WHERE id_product = ?
                                    `, [item.quantity, item.product_id], (err) => {
                                        if (err) {
                                            return db.rollback(() => {
                                                console.error('Product update error:', err);
                                                res.status(500).json({error: 'Failed to update product stock'});
                                            });
                                        }


                                        completedItems++;
                                        if (completedItems === cartItems.length) {
                                            db.query('DELETE FROM cart_item WHERE cart_id = ?', [cartId], (err) => {
                                                if (err) {
                                                    return db.rollback(() => {
                                                        console.error('Cart clear error:', err);
                                                        res.status(500).json({ error: 'Failed to clear cart' });
                                                    });
                                                }

                                                db.commit((err) => {
                                                    if (err) {
                                                        return db.rollback(() => {
                                                            console.error('Commit error:', err);
                                                            res.status(500).json({ error: 'Failed to commit transaction' });
                                                        });
                                                    }

                                                    res.status(200).json({
                                                        message: 'Checkout completed successfully',
                                                        orderId,
                                                        subtotal: subtotal.toFixed(2),
                                                        discount: discountApplied.toFixed(2),
                                                        totalAmount: totalAmount.toFixed(2)
                                                    });
                                                });
                                            });
                                        }
                                    });
                                });
                            });
                        });
                    });
                });
            }
        });
    });
});

//------------------------wishlist
//--------------------------------------------------------------------------------------------------

// API to add product to wishlist
app.post('/api/wishlist/:productId', isAuthenticated, express.json(), async (req, res) => {
    const productId = parseInt(req.params.productId);
    const userId = req.session.userId;

    console.log('POST /api/wishlist called:', { productId, userId });

    if (isNaN(productId) || productId <= 0) {
        console.log('Invalid product ID');
        return res.status(400).json({ error: 'Invalid product ID' });
    }

    db.beginTransaction(async (err) => {
        if (err) {
            console.error('Transaction error:', err);
            return res.status(500).json({ error: 'Transaction initialization failed' });
        }

        try {
            console.log('Checking if product exists...');
            const [productCheck] = await db.promise().query(
                'SELECT id_product FROM product WHERE id_product = ?',
                [productId]
            );
            console.log('Product check result:', productCheck);
            if (productCheck.length === 0) {
                throw new Error('Product not found');
            }

            console.log('Checking if already in wishlist...');
            const [existing] = await db.promise().query(
                'SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?',
                [userId, productId]
            );
            console.log('Existing wishlist entry:', existing);
            if (existing.length > 0) {
                throw new Error('Product already in wishlist');
            }

            console.log('Inserting into wishlist...');
            const [result] = await db.promise().query(
                'INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)',
                [userId, productId]
            );
            console.log('Insert result:', result);

            console.log('Committing transaction...');
            await db.promise().commit();
            console.log('Transaction committed successfully');

            res.status(201).json({
                message: 'Product added to wishlist successfully',
                wishlistId: result.insertId
            });
        } catch (error) {
            console.error('Error in wishlist transaction:', error);
            await db.promise().rollback();
            res.status(error.message === 'Product already in wishlist' ? 409 : 500).json({
                error: error.message || 'Failed to add product to wishlist'
            });
        }
    });
});
// API to get wishlist for a user
app.get('/api/wishlist/:userId', isAuthenticated, async (req, res) => {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Sicherstellen, dass nur der eingeloggte Benutzer seine eigene Wunschliste sehen kann
    if (userId !== req.session.userId) {
        return res.status(403).json({ error: 'Unauthorized: You can only view your own wishlist' });
    }

    try {
        const [results] = await db.promise().query(
            `SELECT 
                p.id_product, 
                p.title, 
                p.price, 
                p.stock, 
                p.rabatt, 
                TO_BASE64(p.picture) AS picture,
                w.added_at
             FROM wishlist w
             JOIN product p ON w.product_id = p.id_product
             WHERE w.user_id = ?`,
            [userId]
        );

        res.json({ products: results });
    } catch (error) {
        console.error('Failed to retrieve wishlist:', error);
        res.status(500).json({ error: 'Failed to retrieve wishlist' });
    }
});
// API to remove product from wishlist
app.delete('/api/wishlist/:userId/item/:productId', isAuthenticated, async (req, res) => {
    const userId = parseInt(req.params.userId);
    const productId = parseInt(req.params.productId);

    if (isNaN(userId) || userId <= 0 || isNaN(productId) || productId <= 0) {
        return res.status(400).json({ error: 'Invalid user ID or product ID' });
    }

    if (userId !== req.session.userId) {
        return res.status(403).json({ error: 'Unauthorized: You can only modify your own wishlist' });
    }

    db.beginTransaction(async (err) => {
        if (err) {
            console.error('Transaction error:', err);
            return res.status(500).json({ error: 'Transaction initialization failed' });
        }

        try {
            const [result] = await db.promise().query(
                'DELETE FROM wishlist WHERE user_id = ? AND product_id = ?',
                [userId, productId]
            );

            if (result.affectedRows === 0) {
                throw new Error('Product not found in wishlist');
            }

            await db.promise().commit();
            res.status(200).json({ message: 'Product removed from wishlist successfully' });
        } catch (error) {
            console.error('Error removing from wishlist:', error);
            await db.promise().rollback();
            res.status(error.message === 'Product not found in wishlist' ? 404 : 500).json({
                error: error.message || 'Failed to remove product from wishlist'
            });
        }
    });
});

// Do not delete
app.use((req, res, next) => {
    res.status(404);
    // Check if the request expects JSON (API call)
    if (req.accepts('json') && !req.accepts('html')) {
        return res.json({ error: 'Not found' });
    }
    // Otherwise, serve the 404 HTML page
    res.sendFile(path.join(__dirname, '..', 'public', '404.html'));
});

// Start HTTPS server
https.createServer(options, app).listen(PORT, () => {
    console.log(`✅ HTTPS Server running at ${BASE_URL}:${PORT}`);
});