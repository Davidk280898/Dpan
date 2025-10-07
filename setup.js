const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

async function setup() {
    console.log('🔧 Configurando D\'PAN...\n');

    // Crear directorios necesarios
    const dirs = [
        './data',
        './uploads',
        './uploads/products',
        './public'
    ];

    for (const dir of dirs) {
        try {
            await fs.mkdir(dir, { recursive: true });
            console.log(`✅ Directorio creado: ${dir}`);
        } catch (err) {
            console.error(`❌ Error creando ${dir}:`, err);
        }
    }

    // Crear usuario admin por defecto
    const usersFile = path.join(__dirname, 'data', 'users.json');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const users = [{
        id: 'user-1',
        username: 'admin',
        password: hashedPassword,
        role: 'admin'
    }];

    await fs.writeFile(usersFile, JSON.stringify(users, null, 2));
    console.log('✅ Usuario admin creado (user: admin, pass: admin123)');

    // Crear archivo de productos inicial con tus productos actuales
    const productsFile = path.join(__dirname, 'data', 'products.json');
    const initialProducts = [
        {
            id: "bizcochos-grasa",
            name: "Bizcochos de Grasa Artesanales (250g)",
            short_description: "Ideales para el mate. Crujientes y sabrosos. 🧉",
            long_description: "Bizcochos de grasa hechos con grasa real. El clásico argentino, compañero perfecto del mate.",
            ingredients: ["Harina", "Grasa vacuna", "Agua", "Sal"],
            price: 1600,
            featured: true,
            img_url: 'https://lh3.googleusercontent.com/d/1qw9GvE2kyXOzy_dYNIzUK0pJcOOW-57q',
            quiz_score: [1, 2]
        },
        {
            id: "chipa-cuarto-kg",
            name: "Chipá Artesanal (250g)",
            short_description: "Crujiente por fuera, tierno por dentro. Sin TACC. 🧀",
            long_description: "El clásico chipá, al estilo D'Pan, explotado de queso. Perfecto para celíacos.",
            ingredients: ["Almidón de mandioca", "Queso estacionado", "Huevo", "Leche"],
            price: 1800,
            featured: true,
            img_url: 'https://lh3.googleusercontent.com/d/1OnWYIXYqR4jVuKocJFnERXDgqmsHgaYm',
            quiz_score: [2, 3]
        },
        {
            id: "pan-campo",
            name: "Pan de Campo Rústico",
            short_description: "Corteza gruesa y crujiente, miga elástica y sabor intenso. 🥖",
            long_description: "Nuestro pan estrella. Elaborado con levadura natural y un proceso de leudado tradicional, lo que le otorga un sabor rústico inigualable.",
            ingredients: ["Harina de trigo", "Levadura", "Agua", "Sal marina"],
            price: 2500,
            featured: true,
            img_url: 'https://lh3.googleusercontent.com/d/1daJchnkrpaTVsO0LTJLi-v-jXKwcSynl',
            quiz_score: [5, 6]
        },
        {
            id: "pan-integral-lactal",
            name: "Pan Integral Lactal (100% Granos)",
            short_description: "Máximo aporte de fibra. Un pan denso y nutritivo. 🌾",
            long_description: "Pan 100% integral. Utilizamos granos enteros y semillas para garantizar la máxima fibra y nutrientes. Ideal para tostadas fitness.",
            ingredients: ["Harina de trigo 100% integral", "Semillas variadas", "Agua", "Miel de caña"],
            price: 2300,
            featured: true,
            img_url: 'https://lh3.googleusercontent.com/d/1GOT2aDt9yWQrIXqpV0HKjg90WFUKTDa9',
            quiz_score: [7, 8, 9]
        }
    ];

    await fs.writeFile(productsFile, JSON.stringify(initialProducts, null, 2));
    console.log('✅ Productos iniciales creados');

    console.log('\n✨ ¡Configuración completa!');
    console.log('\n📝 Próximos pasos:');
    console.log('1. npm start (para iniciar el servidor)');
    console.log('2. Abrí http://localhost:3000/admin.html');
    console.log('3. Iniciá sesión con: admin / admin123');
    console.log('\n⚠️  IMPORTANTE: Cambiá la contraseña después del primer login!\n');
}

setup().catch(console.error);