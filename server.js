const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://dpanparana_db_user:foo1KgcNGNFnfNyY@cluster0.mum4we8.mongodb.net/dpan?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB conectado'))
  .catch(err => console.error('❌ Error MongoDB:', err));

// Esquemas MongoDB
const productSchema = new mongoose.Schema({
    id: String,
    name: String,
    short_description: String,
    long_description: String,
    ingredients: [String],
    price: Number,
    discount: Number,
    featured: Boolean,
    img_url: String,
    quiz_score: [Number]
});

const userSchema = new mongoose.Schema({
    id: String,
    username: String,
    password: String,
    role: String
});

const couponSchema = new mongoose.Schema({
    id: String,
    code: String,
    discount: Number,
    type: String,
    active: Boolean
});

const Product = mongoose.model('Product', productSchema);
const User = mongoose.model('User', userSchema);
const Coupon = mongoose.model('Coupon', couponSchema);

// CORS
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept']
}));

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
      secure: false
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
        cb(new Error('Solo imagenes permitidas'));
    }
});

function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    res.status(401).json({ error: 'No autorizado' });
}

app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('Login:', username);
        const user = await User.findOne({ username });
        
        if (!user) {
            return res.status(401).json({ error: 'Usuario o contrasena incorrectos' });
        }
        
        console.log('Stored password:', user.password);
        console.log('Provided password:', password);
        
        const isValid = (password === user.password);
        console.log('Direct comparison result:', isValid);
        
        if (!isValid) {
            console.log('Invalid password - returning 401');
            return res.status(401).json({ error: 'Usuario o contrasena incorrectos' });
        }
        
        req.session.userId = user.id;
        req.session.username = user.username;
        
        res.json({ success: true, username: user.username });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error' });
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

app.post('/api/validate-coupon', async (req, res) => {
    try {
        const { code } = req.body;
        const coupon = await Coupon.findOne({ code: code.toUpperCase(), active: true });
        
        if (!coupon) {
            return res.status(404).json({ error: 'Invalido' });
        }
        
        res.json({ valid: true, discount: coupon.discount, type: coupon.type });
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
});

app.get('/api/admin/coupons', isAuthenticated, async (req, res) => {
    try {
        const coupons = await Coupon.find();
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
});

app.post('/api/admin/coupons', isAuthenticated, async (req, res) => {
    try {
        const newCoupon = new Coupon({
            id: `coupon-${Date.now()}`,
            code: req.body.code.toUpperCase(),
            discount: parseFloat(req.body.discount),
            type: req.body.type,
            active: req.body.active !== 'false'
        });
        await newCoupon.save();
        res.json(newCoupon);
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
});

app.put('/api/admin/coupons/:id', isAuthenticated, async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndUpdate(req.params.id, {
            code: req.body.code.toUpperCase(),
            discount: parseFloat(req.body.discount),
            type: req.body.type,
            active: req.body.active !== 'false'
        }, { new: true });
        res.json(coupon);
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
});

app.delete('/api/admin/coupons/:id', isAuthenticated, async (req, res) => {
    try {
        await Coupon.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findOne({ id: req.params.id });
        if (!product) return res.status(404).json({ error: 'No encontrado' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
});

app.post('/api/admin/products', isAuthenticated, upload.single('image'), async (req, res) => {
    try {
        const newProduct = new Product({
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
        });
        await newProduct.save();
        res.json(newProduct);
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
});

app.put('/api/admin/products/:id', isAuthenticated, upload.single('image'), async (req, res) => {
    try {
        const updateData = {
            name: req.body.name,
            short_description: req.body.short_description,
            long_description: req.body.long_description,
            ingredients: JSON.parse(req.body.ingredients || '[]'),
            price: parseFloat(req.body.price),
            discount: parseInt(req.body.discount) || 0,
            featured: req.body.featured === 'true',
            quiz_score: JSON.parse(req.body.quiz_score || '[]')
        };
        if (req.file) updateData.img_url = `/uploads/products/${req.file.filename}`;
        
        const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
});

app.delete('/api/admin/products/:id', isAuthenticated, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server on port ${PORT}`);
});

