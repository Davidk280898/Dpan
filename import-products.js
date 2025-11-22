const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://dpanparana_db_user:foo1KgcNGNFnfNyY@cluster0.mum4we8.mongodb.net/dpan?retryWrites=true&w=majority';

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

const Product = mongoose.model('Product', productSchema);

const products = [
  {
    "id": "bizcochos-grasa",
    "name": "Bizcochos de Grasa Artesanales (200g)",
    "short_description": "Ideales para el mate. Crujientes y sabrosos. 🧉",
    "long_description": "200 gramos de bizcochos artesanales, con grasa de verdad. Hechosa mano, como los de antes. O mejor 😋",
    "ingredients": ["Harina", "Grasa vacuna", "Agua", "Sal"],
    "price": 1700,
    "featured": true,
    "img_url": "https://lh3.googleusercontent.com/d/1qw9GvE2kyXOzy_dYNIzUK0pJcOOW-57q",
    "quiz_score": [1, 2]
  },
  {
    "id": "chipa-cuarto-kg",
    "name": "Chipá Artesanal (250g)",
    "short_description": "Crujiente por fuera, tierno por dentro. Sin TACC. 🧀",
    "long_description": "El clásico chipá, al estilo D'Pan, explotado de queso. Perfecto para celíacos.",
    "ingredients": ["Almidón de mandioca", "Queso estacionado", "Huevo", "Leche"],
    "price": 3200,
    "featured": true,
    "img_url": "/uploads/products/1759698783806-241439122.jpg",
    "quiz_score": [2, 3]
  },
  {
    "id": "pan-campo",
    "name": "Pan de Campo (medio kg)",
    "short_description": "Corteza gruesa y crujiente, miga elástica y sabor intenso. 🥖",
    "long_description": "Simple, clásico, casero y riquísimo. Te presentamos el pan de campo, un pan de medio kilo, con grasa, sin aditivos ni conservantes y todo el sabor de lo artesanal ",
    "ingredients": ["Harina de trigo", "Levadura", "Agua", "Sal"],
    "price": 2700,
    "featured": false,
    "img_url": "/uploads/products/1759698959753-188631635.jpg",
    "quiz_score": [5, 6]
  },
  {
    "id": "pan-integral-lactal",
    "name": "Pan lactal 100% integral",
    "short_description": "Máximo aporte de fibra. Un pan denso y nutritivo. 🌾",
    "long_description": "Con un auténtico sabor casero, sin conservantes ni aditivos artificiales, este pan lactal hecho 100% con harina integral es una excelente opción para darle un toque saludable a tu vida. \r\n\r\n💚BENEFICIOS\r\n- Alto en fibra\r\n- Aporta gran cantidad de nutrientes, vitaminas y minerales\r\n- Favorece a reducir el colesterol ",
    "ingredients": ["Harina de trigo 100% integral", "Semillas (opcionales)", "Agua", "Levadura"],
    "price": 3100,
    "featured": true,
    "img_url": "/uploads/products/1759699124272-753042555.jpg",
    "quiz_score": [7, 8, 3]
  },
  {
    "id": "product-1759535527100",
    "name": "Pan con chicharrón",
    "short_description": "Pan con grasa de chicharrón de verdad, seleccionado y armado a tu medida. ",
    "long_description": "Comprar un pan con chicharrón prensado no tiene gracia (ni el mismo gusto), por eso quise hacer este pan con chicharrón 101% artesanal, desde la cocción de la grasa hasta empaquetarlo para vos",
    "ingredients": ["Harina", "Agua", "Grasa", "Chicharrón"],
    "price": 3200,
    "featured": true,
    "img_url": "/uploads/products/1759535537214-672100929.jpg",
    "quiz_score": [7, 8, 9]
  },
  {
    "id": "product-1759699363205",
    "name": "Bocaditos o pancitos chips integrales (250-300g)",
    "short_description": "Una opción saludable para acompañar cualquier comida ",
    "long_description": "Estos bocaditos integrales son una de mis primeras recetas, suaves, riquísimos y con un toque de ajo y provenzal que los hacen irresistibles. ",
    "ingredients": ["Harina Integral", "Sal", "Ajo y provenzal / Orégano (a elección)"],
    "price": 2500,
    "featured": false,
    "img_url": "/uploads/products/1759699363238-246622898.jpg",
    "quiz_score": [2, 3]
  },
  {
    "id": "product-1759699519781",
    "name": "Pizzetas (base - 4 unidades) ",
    "short_description": "Pizzetas artesanales 🍕, solo la base de tomate lista para que le pongas lo que quieras.",
    "long_description": "Pizzetas artesanales de D'Pan 🍕, solo la base de tomate lista para preparar en casa. Hechas con dedicación y con ingredientes reales, perfectas para tus toppings favoritos 🙌",
    "ingredients": ["Harina", "Sal", "Puré de tomate ", "Ajo y provenzal / Orégano"],
    "price": 1000,
    "featured": true,
    "img_url": "/uploads/products/1759793816875-336799549.jpg",
    "quiz_score": [2, 3]
  },
  {
    "id": "product-1759699632394",
    "name": "Pan lactal ",
    "short_description": "Pan lactal artesanal, suave, esponjoso y hecho con ingredientes reales. Perfecto para tus sandwiches, tostadas o lo que se te ocurra 😋✨",
    "long_description": "Con ingredientes reales, sin químicos ni procesos industriales. Suave, esponjoso y perfecto para todo tipo de sandwiches y tostadas. Un sabor único que solo vas a encontrar en D'Pan",
    "ingredients": ["Harina", "Sal", "Leche"],
    "price": 2800,
    "featured": false,
    "img_url": "/uploads/products/1759793928246-454184913.jpg",
    "quiz_score": [1]
  },
  {
    "id": "product-1759700017222",
    "name": "Malteadas 100% integrales (250g)",
    "short_description": ".",
    "long_description": "¿Cómo hacés unas malteadas integrales sin que queden amargas? Endulzarlas.\r\n¿Y cómo hacés para que sean saladas, y no agridulces? Encontrando el balance justo.\r\n\r\nCrocantes, artesanales e ideales si queres comer algo sano y no te gusta tanto lo integral (y sino, también 😋)",
    "ingredients": ["Harina Integral", "Sal", "Azúcar", "Aceite"],
    "price": 1400,
    "featured": false,
    "img_url": "/uploads/products/1759700037002-618176950.jpg",
    "quiz_score": []
  },
  {
    "id": "product-1759700223294",
    "name": "Pan dulce estilo japonés (4 unidades)",
    "short_description": "Una reinversión propia de un pancito dulce de la cultura asiática.",
    "long_description": "Te presento una versión propia de este pan estilo japonés, que no te podés perder. Con una corteza crujiente, y un interior suave, esponjoso y dulce. \r\n\r\nTe tiro un tipo: andá desmenuzándolo, así descubrís su espectacular interior. \r\n\r\nPeso aproximado: 80g por unidad.",
    "ingredients": ["Harina", "Leche", "Agua", "Materia grasa"],
    "price": 2000,
    "featured": true,
    "img_url": "/uploads/products/1759700223328-473981152.jpg",
    "quiz_score": [1, 2]
  },
  {
    "id": "product-1759792237201",
    "name": "Budines artesanales",
    "short_description": "Budines de 300g, de vainilla, naranja, o limón. A tu elección 😋",
    "long_description": "Budines artesanales de 300g en sabores vainilla, naranja y limón. Preparados con ingredientes reales y sin apuros, ideales para disfrutar en cualquier momento del día. ",
    "ingredients": ["Harina", "Vainilla / Limón / Naranja", "Azúcar", "Huevo"],
    "price": 2700,
    "featured": false,
    "img_url": "/uploads/products/1759792237241-458853087.jpg",
    "quiz_score": [7, 8, 9]
  },
  {
    "id": "product-1759793031652",
    "name": "Tortitas negras (media docena) ",
    "short_description": "Media docena de Tortitas Negras artesanales, únicas de D'Pan. Dulces, tiernas y hechas con receta artesanal, no las vas a encontrar en cualquier lado 😋✨",
    "long_description": "Tortitas Negras caseras de D'Pan. Media docena de dulces tiernas y únicas, hechas a mano con ingredientes reales",
    "ingredients": ["Harina", "Azúcar negra", "Esencia de vainilla"],
    "price": 3100,
    "featured": true,
    "img_url": "/uploads/products/1759793031688-131246394.jpg",
    "quiz_score": [7, 8]
  },
  {
    "id": "product-1759793420782",
    "name": "Pan de hamburguesa (4 unidades)",
    "short_description": "Pan de hamburguesa casero 🍔, suave y esponjoso, hecho en D'Pan con ingredientes reales. Ideal para tus burgers favoritas, ¡como hecho en casa\r\n\r\nTambién conocidas como pan de papa, ideales para llevar tus hamburguesas a otro nivel 🍔😎",
    "long_description": "Descubrí el pan de hamburguesa de D'Pan, hecho 100% casero con ingredientes reales. Nada de industrial: esponjoso, sabroso y perfecto para armar hamburguesas únicas en tu casa.",
    "ingredients": ["Harina ", "Puré de papa real", "Materia grasa", "Huevo"],
    "price": 3000,
    "featured": true,
    "img_url": "/uploads/products/1759793420824-77162180.jpg",
    "quiz_score": [1, 2]
  }
];

async function importProducts() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Conectado a MongoDB');
        
        await Product.insertMany(products);
        console.log('✅ Productos importados exitosamente');
        
        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

importProducts();
