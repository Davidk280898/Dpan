const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS - DEBUG MODE
app.use(cors({
  origin: (origin, callback) => {
    console.log('CORS request from:', origin);
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept']
}));

// Preflight
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Sesiones
app.use(session({
    secret: 'dpan-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax',
      secure: true
    }
}));

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const dir = './uploads/products';
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (err) {
            console.error('Error:', err);
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
        cb(new Error('Solo imágenes permitidas'));
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

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

// Auth
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('Login attempt:', username);
        const users = await readUsers();
        console.log('Users available:', users.map(u => u.username));
        const user = users.find(u => u.username === username);
        
        if (!user) {
            console.log('User not found:', username);
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }
        
        // Intenta con bcrypt primero
        let isValid = false;
        try {
            isValid = await bcrypt.compare(password, user.password);
        } catch (e) {
            // Si bcrypt falla, compara directamente (para contraseñas simples)
            isValid = (password === user.password);
        }
        
        if (!isValid) {
            console.log('Invalid password for user:', username);
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }
        
        req.session.userId = user.id;
        req.session.username = user.username;
        console.log('Login successful:', username);
        
        res.json({ success: true, username: user.username });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error en servidor' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {
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

// Cupones
app.post('/api/validate-coupon', async (req, res) => {
    try {
        const { code } = req.body;
        const coupons = await readCoupons();
        const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase() && c.active);
        
        if (!coupon) {
            return res.status(404).json({ error: 'Inválido' });
        }
        
        res.json({ valid: true, discount: coupon.discount, type: coupon.type });
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
});

app.get('/api/admin/coupons', isAuthenticated, async (req, res) => {
    try {
        const coupons = await readCoupons();
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ error: 'Error' });
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
        res.status(500).json({ error: 'Error' });
    }
});

app.put('/api/admin/coupons/:id', isAuthenticated, async (req, res) => {
    try {
        const coupons = await readCoupons();
        const index = coupons.findIndex(c => c.id === req.params.id);
        if (index === -1) return res.status(404).json({ error: 'No encontrado' });
        
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
        res.status(500).json({ error: 'Error' });
    }
});

app.delete('/api/admin/coupons/:id', isAuthenticated, async (req, res) => {
    try {
        const coupons = await readCoupons();
        const filtered = coupons.filter(c => c.id !== req.params.id);
        await saveCoupons(filtered);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
});

// Productos
app.get('/api/products', async (req, res) => {
    try {
        const products = await readProducts();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const products = await readProducts();
        const product = products.find(p => p.id === req.params.id);
        if (!product) return res.status(404).json({ error: 'No encontrado' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Error' });
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
        res.status(500).json({ error: 'Error' });
    }
});

app.put('/api/admin/products/:id', isAuthenticated, upload.single('image'), async (req, res) => {
    try {
        const products = await readProducts();
        const index = products.findIndex(p => p.id === req.params.id);
        if (index === -1) return res.status(404).json({ error: 'No encontrado' });
        
        const updated = {
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
        if (req.file) updated.img_url = `/uploads/products/${req.file.filename}`;
        
        products[index] = updated;
        await saveProducts(products);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
});

app.delete('/api/admin/products/:id', isAuthenticated, async (req, res) => {
    try {
        const products = await readProducts();
        const filtered = products.filter(p => p.id !== req.params.id);
        await saveProducts(filtered);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server on port ${PORT}`);
});
