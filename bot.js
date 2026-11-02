const { Telegraf } = require('telegraf');
const admin = require('firebase-admin');

const BOT_TOKEN = '9287446614:AAEEM16fjrbFOVEEJG37CaRSgX7Hb8xLm-E';
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://zapis-35a65-default-rtdb.firebaseio.com' 
});
const db = admin.database();

const bot = new Telegraf(BOT_TOKEN);

const TEMPLATES = {
  beauty:  { name: "Салон красоты", emoji: "💅", price: 2500, services: ["Стрижка", "Маникюр", "Окрашивание"] },
  auto:    { name: "Автосервис",    emoji: "🚗", price: 2500, services: ["Замена масла", "Шиномонтаж", "Диагностика"] },
  edu:     { name: "Обучение",      emoji: "📚", price: 2500, services: ["Пробный урок", "Курс", "Консультация"] },
  dental:  { name: "Стоматология",  emoji: "🦷", price: 5000, services: ["Чистка", "Лечение", "Имплант"] },
  fitness: { name: "Фитнес",        emoji: "🏋️", price: 2000, services: ["Тренировка", "Консультация"] },
  zoo:     { name: "Зооуслуги",     emoji: "🐶", price: 1500, services: ["Груминг", "Ветеринар"] },
  photo:   { name: "Фото/Видео",    emoji: "📸", price: 3000, services: ["Фотосессия", "Видеосъемка"] },
  spa:     { name: "Массаж / СПА",  emoji: "💆‍♀️", price: 2500, services: ["Массаж", "СПА-ритуал"] },
  repair:  { name: "Ремонт",        emoji: "🏠", price: 2000, services: ["Замер", "Консультация"] },
  it:      { name: "IT / Digital",  emoji: "💻", price: 3000, services: ["Консультация", "Настройка"] },
  art:     { name: "Творчество",    emoji: "🎨", price: 1500, services: ["Урок рисования", "Вокал"] },
  law:     { name: "Юристы",        emoji: "⚖️", price: 5000, services: ["Консультация", "Аудит"] }
};

bot.start(async (ctx) => {
  if (ctx.startPayload) {
    const bizId = ctx.startPayload;
    try {
      const snapshot = await db.ref(`businesses/${bizId}`).once('value');
      const biz = snapshot.val();
      if (!biz) return ctx.reply("❌ Бизнес не найден.");
      
      ctx.reply(`Добро пожаловать в ${biz.name}! ${biz.emoji}\nВыберите услугу:`, {
        reply_markup: { keyboard: biz.services.map(s => [{ text: s }]), resize_keyboard: true }
      });
    } catch (e) {
      ctx.reply("Ошибка подключения к базе. Попробуйте позже.");
    }
  } else {
    ctx.reply("Привет! Я создаю ботов для записи.\nВыберите вашу нишу:", {
      reply_markup: {
        inline_keyboard: Object.keys(TEMPLATES).map(key => [{
          text: `${TEMPLATES[key].emoji} ${TEMPLATES[key].name}`, callback_data: `select_${key}`
        }])
      }
    });
  }
});

bot.action(/select_(.+)/, async (ctx) => {
  const key = ctx.match[1];
  const template = TEMPLATES[key];
  const bizId = ctx.from.id.toString();

  try {
    await db.ref(`businesses/${bizId}`).set({
      ownerId: ctx.from.id,
      name: `Мой ${template.name}`,
      emoji: template.emoji,
      services: template.services,
      price: template.price,
      trialEndsAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
      createdAt: Date.now()
    });

    const link = `https://t.me/${ctx.botInfo.username}?start=${bizId}`;
    ctx.reply(`✅ Бизнес создан!\n\nСтоимость: ${template.price} ₽/мес (7 дней бесплатно)\n\nТвоя ссылка:\n${link}\n\nОтправь её клиентам!`);
  } catch (e) {
    ctx.reply("Ошибка при создании бизнеса.");
  }
});

const allServices = Object.values(TEMPLATES).flatMap(t => t.services);
bot.hears(allServices, async (ctx) => {
  const service = ctx.message.text;
  const clientName = ctx.from.first_name;
  
  try {
    await db.ref('bookings').push({
      service: service,
      clientName: clientName,
      date: new Date().toLocaleString('ru-RU'),
      timestamp: Date.now()
    });
    ctx.reply(`✅ Вы записаны!\nУслуга: ${service}\nИмя: ${clientName}\n\nЖдем вас!`, {
      reply_markup: { remove_keyboard: true }
    });
  } catch (e) {
    ctx.reply("Ошибка при сохранении записи.");
  }
});

bot.launch().then(() => console.log('Бот запущен!'));
