import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN no está configurado en .env');
  process.exit(1);
}

const webhookUrl = process.argv[2];

if (!webhookUrl) {
  console.error('❌ Por favor proporciona la URL del webhook como argumento');
  console.error('Ejemplo: npx ts-node scripts/set-telegram-webhook.ts https://tu-backend.com/notificaciones/telegram/webhook');
  process.exit(1);
}

console.log('🔧 Configurando webhook de Telegram...');
console.log(`Token: ${token.substring(0, 10)}...`);
console.log(`Webhook URL: ${webhookUrl}`);

async function setWebhook() {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const data = await response.json();
    if (!data.ok) {
      console.error('❌ Error al configurar webhook:', data.description);
      process.exit(1);
    }
    console.log('✅ Webhook configurado exitosamente!');
    console.log('Resultado:', data.result);
    
    // Verificar el webhook
    console.log('\n🔍 Verificando webhook...');
    const infoResponse = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const infoData = await infoResponse.json();
    if (infoData.ok) {
      console.log('Webhook info:', infoData.result);
    }
  } catch (error) {
    console.error('❌ Error al hacer la solicitud:', error);
    process.exit(1);
  }
}

setWebhook();
