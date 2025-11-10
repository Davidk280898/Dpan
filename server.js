const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔹 CORS - Acepta cualquier origen (cambiar en producción si es necesario)
app.use(cors({
  origin: '*',
  credentials: false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Sesiones con configuración para producción
app.use(session({
    secret: process.env.SESSION_SECRET || 'dpan-secret-key-12345',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: false,
      sameSite: 'lax',
      secure: false
    }
}));

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const dir = './uploads/products';
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (err) {
            console.error('Error creando directorio:', err);
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Solo se permiten imágenes (jpg, png, gif, webp)'));
    }
});

const PRODUCTS_FILE = path.join(__dirname, 'data', 'products.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const COUPONS_FILE = path.join(__dirname, 'data', 'coupons.json');

async function readProducts() {
    try {
        const data = await fs.readFile(PRODUCTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

async function saveProducts(products) {
    await fs.mkdir(path.dirname(PRODUCTS_FILE), { recursive: true });
    await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

async function readUsers() {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

async function readCoupons() {
    try {
        const data = await fs.readFile(COUPONS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

async function saveCoupons(coupons) {
    await fs.mkdir(path.dirname(COUPONS_FILE), { recursive: true });
    await fs.writeFile(COUPONS_FILE, JSON.stringify(coupons, null, 2));
}

function isAuthenticated(req, res, next) {
    console.log('Session:', req.session);
    if (req.session && req.session.userId) {
        return next();
    }
    res.status(401).json({ error: 'No autorizado' });
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// Auth endpoints
app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('Login request:', req.body);
        const { username, password } = req.body;
        const users = await readUsers();
        console.log('Users en BD:', users);
        
        const user = users.find(u => u.username === username);
        
        if (!user) {
            console.log('Usuario no encontrado:', username);
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }
        
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            console.log('Contraseña inválida');
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }
        
        req.session.userId = user.id;
        req.session.username = user.username;
        console.log('Login exitoso:', user.username);
        
        res.json({ success: true, username: user.username });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Error al cerrar sesión' });
        }
        res.json({ success: true });
    });
});

app.get('/api/auth/check', (req, res) => {
    console.log('Check auth - Session:', req.session);
    if (req.session && req.session.userId) {
        res.json({ authenticated: true, username: req.session.username });
    } else {
        res.json({ authenticated: false });
    }
});

// Cupones
app.post('/api/validate-coupon', async (req, res) => {
    try {
        const { code } = req.body;
        const coupons = await readCoupons();
        const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase() && c.active);
        
        if (!coupon) {
            return res.status(404).json({ error: 'Cupón inválido' });
        }
        
        res.json({ valid: true, discount: coupon.discount, type: coupon.type });
    } catch (error) {
        res.status(500).json({ error: 'Error al validar cupón' });
    }
});

app.get('/api/admin/coupons', isAuthenticated, async (req, res) => {
    try {
        const coupons = await readCoupons();
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener cupones' });
    }
});

app.post('/api/admin/coupons', isAuthenticated, async (req, res) => {
    try {
        const coupons = await readCoupons();
        const newCoupon = {
            id: `coupon-${Date.now()}`,
            code: req.body.code.toUpperCase(),
            discount: parseFloat(req.body.discount),
            type: req.body.type,
            active: req.body.active !== 'false'
        };
        coupons.push(newCoupon);
        await saveCoupons(coupons);
        res.json(newCoupon);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear cupón' });
    }
});

app.put('/api/admin/coupons/:id', isAuthenticated, async (req, res) => {
    try {
        const coupons = await readCoupons();
        const index = coupons.findIndex(c => c.id === req.params.id);
        if (index === -1) return res.status(404).json({ error: 'Cupón no encontrado' });
        
        coupons[index] = {
            ...coupons[index],
            code: req.body.code.toUpperCase(),
            discount: parseFloat(req.body.discount),
            type: req.body.type,
            active: req.body.active !== 'false'
        };
        await saveCoupons(coupons);
        res.json(coupons[index]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar cupón' });
    }
});

app.delete('/api/admin/coupons/:id', isAuthenticated, async (req, res) => {
    try {
        const coupons = await readCoupons();
        const filteredCoupons = coupons.filter(c => c.id !== req.params.id);
        if (coupons.length === filteredCoupons.length) {
            return res.status(404).json({ error: 'Cupón no encontrado' });
        }
        await saveCoupons(filteredCoupons);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar cupón' });
    }
});

// Productos
app.get('/api/products', async (req, res) => {
    try {
        const products = await readProducts();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const products = await readProducts();
        const product = products.find(p => p.id === req.params.id);
        if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el producto' });
    }
});

app.post('/api/admin/products', isAuthenticated, upload.single('image'), async (req, res) => {
    try {
        const products = await readProducts();
        const newProduct = {
            id: req.body.id || `product-${Date.now()}`,
            name: req.body.name,
            short_description: req.body.short_description,
            long_description: req.body.long_description,
            ingredients: JSON.parse(req.body.ingredients || '[]'),
            price: parseFloat(req.body.price),
            discount: parseInt(req.body.discount) || 0,
            featured: req.body.featured === 'true',
            img_url: req.file ? `/uploads/products/${req.file.filename}` : '/uploads/placeholder.jpg',
            quiz_score: JSON.parse(req.body.quiz_score || '[]')
        };
        products.push(newProduct);
        await saveProducts(products);
        res.json(newProduct);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear producto' });
    }
});

app.put('/api/admin/products/:id', isAuthenticated, upload.single('image'), async (req, res) => {
    try {
        const products = await readProducts();
        const index = products.findIndex(p => p.id === req.params.id);
        if (index === -1) return res.status(404).json({ error: 'Producto no encontrado' });
        
        const updatedProduct = {
            ...products[index],
            name: req.body.name,
            short_description: req.body.short_description,
            long_description: req.body.long_description,
            ingredients: JSON.parse(req.body.ingredients || '[]'),
            price: parseFloat(req.body.price),
            discount: parseInt(req.body.discount) || 0,
            featured: req.body.featured === 'true',
            quiz_score: JSON.parse(req.body.quiz_score || '[]')
        };
        if (req.file) updatedProduct.img_url = `/uploads/products/${req.file.filename}`;
        
        products[index] = updatedProduct;
        await saveProducts(products);
        res.json(updatedProduct);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
});

app.delete('/api/admin/products/:id', isAuthenticated, async (req, res) => {
    try {
        const products = await readProducts();
        const filteredProducts = products.filter(p => p.id !== req.params.id);
        if (products.length === filteredProducts.length) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        await saveProducts(filteredProducts);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔹 Configuración de CORS - Acepta múltiples orígenes
const allowedOrigins = [
  'https://dpansaludybienestar.netlify.app',
  'https://d-pan.netlify.app',
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL // Si tienes variable de entorno
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('CORS bloqueado para:', origin);
      callback(null, true); // Cambiar a false si quieres bloquear estrictamente
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'dpan-secret-key-cambiar-en-produccion',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      maxAge: 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax'
    }
}));

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const dir = './uploads/products';
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (err) {
            console.error('Error creando directorio:', err);
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Solo se permiten imágenes (jpg, png, gif, webp)'));
    }
});

const PRODUCTS_FILE = path.join(__dirname, 'data', 'products.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const COUPONS_FILE = path.join(__dirname, 'data', 'coupons.json');

async function readProducts() {
    try {
        const data = await fs.readFile(PRODUCTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

async function saveProducts(products) {
    await fs.mkdir(path.dirname(PRODUCTS_FILE), { recursive: true });
    await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

async function readUsers() {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

async function readCoupons() {
    try {
        const data = await fs.readFile(COUPONS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

async function saveCoupons(coupons) {
    await fs.mkdir(path.dirname(COUPONS_FILE), { recursive: true });
    await fs.writeFile(COUPONS_FILE, JSON.stringify(coupons, null, 2));
}

function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    res.status(401).json({ error: 'No autorizado' });
}

app.post('/api/validate-coupon', async (req, res) => {
    try {
        const { code } = req.body;
        const coupons = await readCoupons();
        const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase() && c.active);
        
        if (!coupon) {
            return res.status(404).json({ error: 'Cupón inválido' });
        }
        
        res.json({ valid: true, discount: coupon.discount, type: coupon.type });
    } catch (error) {
        res.status(500).json({ error: 'Error al validar cupón' });
    }
});

app.get('/api/admin/coupons', isAuthenticated, async (req, res) => {
    try {
        const coupons = await readCoupons();
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener cupones' });
    }
});

app.post('/api/admin/coupons', isAuthenticated, async (req, res) => {
    try {
        const coupons = await readCoupons();
        
        const newCoupon = {
            id: `coupon-${Date.now()}`,
            code: req.body.code.toUpperCase(),
            discount: parseFloat(req.body.discount),
            type: req.body.type,
            active: req.body.active !== 'false'
        };
        
        coupons.push(newCoupon);
        await saveCoupons(coupons);
        
        res.json(newCoupon);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear cupón' });
    }
});

app.put('/api/admin/coupons/:id', isAuthenticated, async (req, res) => {
    try {
        const coupons = await readCoupons();
        const index = coupons.findIndex(c => c.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Cupón no encontrado' });
        }
        
        coupons[index] = {
            ...coupons[index],
            code: req.body.code.toUpperCase(),
            discount: parseFloat(req.body.discount),
            type: req.body.type,
            active: req.body.active !== 'false'
        };
        
        await saveCoupons(coupons);
        res.json(coupons[index]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar cupón' });
    }
});

app.delete('/api/admin/coupons/:id', isAuthenticated, async (req, res) => {
    try {
        const coupons = await readCoupons();
        const filteredCoupons = coupons.filter(c => c.id !== req.params.id);
        
        if (coupons.length === filteredCoupons.length) {
            return res.status(404).json({ error: 'Cupón no encontrado' });
        }
        
        await saveCoupons(filteredCoupons);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar cupón' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const users = await readUsers();
        const user = users.find(u => u.username === username);
        
        if (!user) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }
        
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }
        
        req.session.userId = user.id;
        req.session.username = user.username;
        
        res.json({ success: true, username: user.username });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Error al cerrar sesión' });
        }
        res.json({ success: true });
    });
});

app.get('/api/auth/check', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({ authenticated: true, username: req.session.username });
    } else {
        res.json({ authenticated: false });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        const products = await readProducts();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const products = await readProducts();
        const product = products.find(p => p.id === req.params.id);
        
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el producto' });
    }
});

app.post('/api/admin/products', isAuthenticated, upload.single('image'), async (req, res) => {
    try {
        const products = await readProducts();
        
        const newProduct = {
            id: req.body.id || `product-${Date.now()}`,
            name: req.body.name,
            short_description: req.body.short_description,
            long_description: req.body.long_description,
            ingredients: JSON.parse(req.body.ingredients || '[]'),
            price: parseFloat(req.body.price),
            discount: parseInt(req.body.discount) || 0,
            featured: req.body.featured === 'true',
            img_url: req.file ? `/uploads/products/${req.file.filename}` : '/uploads/placeholder.jpg',
            quiz_score: JSON.parse(req.body.quiz_score || '[]')
        };
        
        products.push(newProduct);
        await saveProducts(products);
        
        res.json(newProduct);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear producto' });
    }
});

app.put('/api/admin/products/:id', isAuthenticated, upload.single('image'), async (req, res) => {
    try {
        const products = await readProducts();
        const index = products.findIndex(p => p.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        const updatedProduct = {
            ...products[index],
            name: req.body.name,
            short_description: req.body.short_description,
            long_description: req.body.long_description,
            ingredients: JSON.parse(req.body.ingredients || '[]'),
            price: parseFloat(req.body.price),
            discount: parseInt(req.body.discount) || 0,
            featured: req.body.featured === 'true',
            quiz_score: JSON.parse(req.body.quiz_score || '[]')
        };
        
        if (req.file) {
            updatedProduct.img_url = `/uploads/products/${req.file.filename}`;
        }
        
        products[index] = updatedProduct;
        await saveProducts(products);
        
        res.json(updatedProduct);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
});

app.delete('/api/admin/products/:id', isAuthenticated, async (req, res) => {
    try {
        const products = await readProducts();
        const filteredProducts = products.filter(p => p.id !== req.params.id);
        
        if (products.length === filteredProducts.length) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        await saveProducts(filteredProducts);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`CORS habilitado para: ${allowedOrigins.join(', ')}`);
});
