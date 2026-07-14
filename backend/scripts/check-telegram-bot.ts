import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN no está configurado en .env');
  process.exit(1);
}

console.log('🔍 Verificando bot de Telegram...');
console.log(`Token: ${token.substring(0, 10)}...`);

async function checkBot() {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await response.json();
    if (!data.ok) {
      console.error('❌ Error al verificar bot:', data.description);
      process.exit(1);
    }
    console.log('✅ Bot encontrado!');
    console.log('ID:', data.result.id);
    console.log('Nombre:', data.result.first_name);
    console.log('Username:', data.result.username);
    console.log('Es bot:', data.result.is_bot);
  } catch (error) {
    console.error('❌ Error al hacer la solicitud:', error);
    process.exit(1);
  }
}

checkBot();
