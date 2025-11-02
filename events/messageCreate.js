import badWords from "../config/badwords.js";
import removeAccents from "remove-accents";
import { EmbedBuilder, PermissionsBitField } from "discord.js";

const LOG_CHANNEL_ID = "1433141180371304448";

// 혼동 문자 맵
const confusables = {
  "ı": "i", "İ": "i",
  "ß": "ss",
  "Æ": "ae","æ": "ae",
  "Œ": "oe","œ": "oe",
  "ł": "l","Ł": "l",
  "α": "a", "а": "a",
  "ѕ": "s", "ϱ": "p"
};

function normalize(text) {
  if (!text) return "";
  text = text.replace(/[Ａ-Ｚａ-ｚ０-９]/g, c =>
    String.fromCharCode(c.charCodeAt(0) - 0xFEE0)
  );
  text = removeAccents(text.toLowerCase());
  text = text.replace(/[^\u0000-\u007E]/g, c => confusables[c] || c);
  return text
    .replace(/[^a-z0-9]/gi, "")
    .replace(/1/g, "i")
    .replace(/!/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/0/g, "o")
    .replace(/7/g, "t");
}

export default {
  name: "messageCreate",
  async execute(message) {
    try {
      if (message.author.bot) return;
      if (!message.content) return;

      // ✅ **관리자는 필터 무시**
      const member = await message.guild.members.fetch(message.author.id).catch(() => null);
      if (member && member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return; // 필터 건너뜀
      }

      const raw = message.content;
      const norm = normalize(raw);

      // 금지어 리스트 검사
      let blocked = badWords.some(w => norm.includes(normalize(w)));

      // 동성애/트랜스 비하 문맥 감지 (중립 사용은 허용)
      if (!blocked) {
        if (/\b(gay|lesbian|trans|queer|homo)\b/i.test(raw)) {
          if (/\b(asf|as hell|wtf|lmao|lol|bro|dumb|weird|ew|tf|hell|stupid)\b/i.test(raw)) {
            blocked = true;
          }
        }
      }

      if (!blocked) return;

      await message.delete().catch(() => {});

      const log = await message.guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
      if (!log) return;

      const embed = new EmbedBuilder()
        .setTitle("🚫 Chat Filter Triggered")
        .setColor("#ff4f4f")
        .addFields(
          { name: "User", value: `<@${message.author.id}> (${message.author.id})`, inline: false },
          { name: "Message", value: raw, inline: false },
          { name: "Normalized", value: norm, inline: false }
        )
        .setTimestamp();

      await log.send({ embeds: [embed] });

    } catch (err) {
      console.log("Chat Filter Error:", err?.message || err);
    }
  }
};
