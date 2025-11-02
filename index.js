import { Client, GatewayIntentBits, Collection } from "discord.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initTables } from "./config/db.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();
client.buttons = new Collection();
client.menus = new Collection();

// -------- Load Commands --------
const commandsPath = path.join(__dirname, "commands");
for (const folder of fs.readdirSync(commandsPath)) {
  const folderPath = path.join(commandsPath, folder);
  for (const file of fs.readdirSync(folderPath).filter(f => f.endsWith(".js"))) {
    const command = (await import(`file://${path.join(folderPath, file)}`)).default;
    if (command.data && command.execute) client.commands.set(command.data.name, command);
  }
}

// -------- Load Events --------
const eventsPath = path.join(__dirname, "events");
for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith(".js"))) {
  const event = (await import(`file://${path.join(eventsPath, file)}`)).default;
  if (event.once) client.once(event.name, (...a) => event.execute(...a, client));
  else client.on(event.name, (...a) => event.execute(...a, client));
}

// -------- Load Buttons --------
const buttonsPath = path.join(__dirname, "interactions", "buttons");
if (fs.existsSync(buttonsPath)) {
  for (const file of fs.readdirSync(buttonsPath).filter(f => f.endsWith(".js"))) {
    const handler = (await import(`file://${path.join(buttonsPath, file)}`)).default;
    if (handler.customIdStartsWith && handler.execute) {
      client.buttons.set(handler.customIdStartsWith, handler);
    }
  }
}

// -------- Load Menus (Optional) --------
const menusPath = path.join(__dirname, "interactions", "menus");
if (fs.existsSync(menusPath)) {
  for (const file of fs.readdirSync(menusPath).filter(f => f.endsWith(".js"))) {
    const menu = (await import(`file://${path.join(menusPath, file)}`)).default;
    if (menu.customId) client.menus.set(menu.customId, menu);
  }
}

// -------- Init Database --------
await initTables();

client.login(process.env.TOKEN);

// ======= CRASH LOG TO DISCORD (EMBED VERSION) =======
import { EmbedBuilder } from "discord.js";

const LOG_CHANNEL_ID = "1406901680485826623"; // ⚠️ 로그 전송 채널

async function sendCrashLogToDiscord(error) {
  try {
    const channel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle("⚠️ Bot Crash Detected")
      .setColor(0xff4444)
      .addFields(
        { name: "Error Message", value: `\`\`\`${error?.message || String(error)}\`\`\`` },
      )
      .setTimestamp()
      .setFooter({ text: "TSBAC System Crash Logger" });

    // Stack 이 있으면 추가 (길면 자동 처리)
    if (error?.stack) {
      embed.addFields({ name: "Stack Trace", value: `\`\`\`${(error.stack).slice(0, 1900)}\`\`\`` });
    }

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("❌ Crash log send failed:", err);
  }
}

// ✅ 처리되지 않은 예외
process.on("uncaughtException", (err) => {
  console.error("🔥 Uncaught Exception:", err);
  sendCrashLogToDiscord(err);
});

// ✅ Promise 오류 (Unhandled Rejection)
process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled Rejection:", reason);
  sendCrashLogToDiscord(reason);
});

// ====================================
