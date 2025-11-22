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

mongoose.connect(MONGODB_URI).then(() => console.log('✅ MongoDB conectado'))
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
        
        const isValid = (password === user.password);
        
        if (!isValid) {
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

// ✅ ARREGLADO: Busca por el campo "id" personalizado, no por _id de MongoDB
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
        
        // CAMBIO: findOneAndUpdate en vez de findByIdAndUpdate
        const product = await Product.findOneAndUpdate(
            { id: req.params.id },
            updateData, 
            { new: true }
        );
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
});

// ✅ ARREGLADO: Busca por el campo "id" personalizado, no por _id de MongoDB
app.delete('/api/admin/products/:id', isAuthenticated, async (req, res) => {
    try {
        // CAMBIO: findOneAndDelete en vez de findByIdAndDelete
        await Product.findOneAndDelete({ id: req.params.id });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
});

app.post('/api/import-products', async (req, res) => {
    const products = [
  {"id":"bizcochos-grasa","name":"Bizcochos de Grasa Artesanales (200g)","short_description":"Ideales para el mate. Crujientes y sabrosos. 🧉","long_description":"200 gramos de bizcochos artesanales, con grasa de verdad. Hechosa mano, como los de antes. O mejor 😋","ingredients":["Harina","Grasa vacuna","Agua","Sal"],"price":1700,"discount":0,"featured":true,"img_url":"https://lh3.googleusercontent.com/d/1qw9GvE2kyXOzy_dYNIzUK0pJcOOW-57q","quiz_score":[1,2]},
  {"id":"chipa-cuarto-kg","name":"Chipá Artesanal (250g)","short_description":"Crujiente por fuera, tierno por dentro. Sin TACC. 🧀","long_description":"El clásico chipá, al estilo D'Pan, explotado de queso. Perfecto para celíacos.","ingredients":["Almidón de mandioca","Queso estacionado","Huevo","Leche"],"price":3200,"discount":0,"featured":true,"img_url":"/uploads/products/1759698783806-241439122.jpg","quiz_score":[2,3]},
  {"id":"pan-campo","name":"Pan de Campo (medio kg)","short_description":"Corteza gruesa y crujiente, miga elástica y sabor intenso. 🥖","long_description":"Simple, clásico, casero y riquísimo. Te presentamos el pan de campo, un pan de medio kilo, con grasa, sin aditivos ni conservantes y todo el sabor de lo artesanal ","ingredients":["Harina de trigo","Levadura","Agua","Sal"],"price":2700,"discount":0,"featured":false,"img_url":"/uploads/products/1759698959753-188631635.jpg","quiz_score":[5,6]},
  {"id":"pan-integral-lactal","name":"Pan lactal 100% integral","short_description":"Máximo aporte de fibra. Un pan denso y nutritivo. 🌾","long_description":"Con un auténtico sabor casero, sin conservantes ni aditivos artificiales, este pan lactal hecho 100% con harina integral es una excelente opción para darle un toque saludable a tu vida. \r\n\r\n💚BENEFICIOS\r\n- Alto en fibra\r\n- Aporta gran cantidad de nutrientes, vitaminas y minerales\r\n- Favorece a reducir el colesterol ","ingredients":["Harina de trigo 100% integral","Semillas (opcionales)","Agua","Levadura"],"price":3100,"discount":0,"featured":true,"img_url":"/uploads/products/1759699124272-753042555.jpg","quiz_score":[7,8,3]},
  {"id":"product-1759535527100","name":"Pan con chicharrón","short_description":"Pan con grasa de chicharrón de verdad, seleccionado y armado a tu medida. ","long_description":"Comprar un pan con chicharrón prensado no tiene gracia (ni el mismo gusto), por eso quise hacer este pan con chicharrón 101% artesanal, desde la cocción de la grasa hasta empaquetarlo para vos","ingredients":["Harina","Agua","Grasa","Chicharrón"],"price":3200,"discount":0,"featured":true,"img_url":"/uploads/products/1759535537214-672100929.jpg","quiz_score":[7,8,9]},
  {"id":"product-1759699363205","name":"Bocaditos o pancitos chips integrales (250-300g)","short_description":"Una opción saludable para acompañar cualquier comida ","long_description":"Estos bocaditos integrales son una de mis primeras recetas, suaves, riquísimos y con un toque de ajo y provenzal que los hacen irresistibles. ","ingredients":["Harina Integral","Sal","Ajo y provenzal / Orégano (a elección)"],"price":2500,"discount":0,"featured":false,"img_url":"/uploads/products/1759699363238-246622898.jpg","quiz_score":[2,3]},
  {"id":"product-1759699519781","name":"Pizzetas (base - 4 unidades) ","short_description":"Pizzetas artesanales 🍕, solo la base de tomate lista para que le pongas lo que quieras.","long_description":"Pizzetas artesanales de D'Pan 🍕, solo la base de tomate lista para preparar en casa. Hechas con dedicación y con ingredientes reales, perfectas para tus toppings favoritos 🙌","ingredients":["Harina","Sal","Puré de tomate ","Ajo y provenzal / Orégano"],"price":1000,"discount":0,"featured":true,"img_url":"/uploads/products/1759793816875-336799549.jpg","quiz_score":[2,3]},
  {"id":"product-1759699632394","name":"Pan lactal ","short_description":"Pan lactal artesanal, suave, esponjoso y hecho con ingredientes reales. Perfecto para tus sandwiches, tostadas o lo que se te ocurra 😋✨","long_description":"Con ingredientes reales, sin químicos ni procesos industriales. Suave, esponjoso y perfecto para todo tipo de sandwiches y tostadas. Un sabor único que solo vas a encontrar en D'Pan","ingredients":["Harina","Sal","Leche"],"price":2800,"discount":0,"featured":false,"img_url":"/uploads/products/1759793928246-454184913.jpg","quiz_score":[1]},
  {"id":"product-1759700017222","name":"Malteadas 100% integrales (250g)","short_description":".","long_description":"¿Cómo hacés unas malteadas integrales sin que queden amargas? Endulzarlas.\r\n¿Y cómo hacés para que sean saladas, y no agridulces? Encontrando el balance justo.\r\n\r\nCrocantes, artesanales e ideales si queres comer algo sano y no te gusta tanto lo integral (y sino, también 😋)","ingredients":["Harina Integral","Sal","Azúcar","Aceite"],"price":1400,"discount":0,"featured":false,"img_url":"/uploads/products/1759700037002-618176950.jpg","quiz_score":[]},
  {"id":"product-1759700223294","name":"Pan dulce estilo japonés (4 unidades)","short_description":"Una reinversión propia de un pancito dulce de la cultura asiática.","long_description":"Te presento una versión propia de este pan estilo japonés, que no te podés perder. Con una corteza crujiente, y un interior suave, esponjoso y dulce. \r\n\r\nTe tiro un tipo: andá desmenuzándolo, así descubrís su espectacular interior. \r\n\r\nPeso aproximado: 80g por unidad.","ingredients":["Harina","Leche","Agua","Materia grasa"],"price":2000,"discount":0,"featured":true,"img_url":"/uploads/products/1759700223328-473981152.jpg","quiz_score":[1,2]},
  {"id":"product-1759792237201","name":"Budines artesanales","short_description":"Budines de 300g, de vainilla, naranja, o limón. A tu elección 😋","long_description":"Budines artesanales de 300g en sabores vainilla, naranja y limón. Preparados con ingredientes reales y sin apuros, ideales para disfrutar en cualquier momento del día. ","ingredients":["Harina","Vainilla / Limón / Naranja","Azúcar","Huevo"],"price":2700,"discount":0,"featured":false,"img_url":"/uploads/products/1759792237241-458853087.jpg","quiz_score":[7,8,9]},
  {"id":"product-1759793031652","name":"Tortitas negras (media docena) ","short_description":"Media docena de Tortitas Negras artesanales, únicas de D'Pan. Dulces, tiernas y hechas con receta artesanal, no las vas a encontrar en cualquier lado 😋✨","long_description":"Tortitas Negras caseras de D'Pan. Media docena de dulces tiernas y únicas, hechas a mano con ingredientes reales","ingredients":["Harina","Azúcar negra","Esencia de vainilla"],"price":3100,"discount":0,"featured":true,"img_url":"/uploads/products/1759793031688-131246394.jpg","quiz_score":[7,8]},
  {"id":"product-1759793420782","name":"Pan de hamburguesa (4 unidades)","short_description":"Pan de hamburguesa casero 🍔, suave y esponjoso, hecho en D'Pan con ingredientes reales. Ideal para tus burgers favoritas, ¡como hecho en casa\r\n\r\nTambién conocidas como pan de papa, ideales para llevar tus hamburguesas a otro nivel 🍔😎","long_description":"Descubrí el pan de hamburguesa de D'Pan, hecho 100% casero con ingredientes reales. Nada de industrial: esponjoso, sabroso y perfecto para armar hamburguesas únicas en tu casa.","ingredients":["Harina ","Puré de papa real","Materia grasa","Huevo"],"price":3000,"discount":0,"featured":true,"img_url":"/uploads/products/1759793420824-77162180.jpg","quiz_score":[1,2]}
    ];
    try {
        await Product.insertMany(products);
        res.json({ success: true, imported: products.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server on port ${PORT}`);
});
