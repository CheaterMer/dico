// scheduler/checkHtExpiry.js
import { pool } from "../config/db.js";
import { EmbedBuilder } from "discord.js";

const LOG_CHANNEL = "1433141180371304448"; // 시험 관련 알림 / 관리 채널

export async function checkHtExpiry(client) {
  try {
    const now = Date.now();
    const DAY = 86400000;

    // 현재 열려있는 시험 요청들 불러오기
    const [rows] = await pool.query(`
      SELECT id, guild_id, player_id, expiry_at, status
      FROM ht_requests
      WHERE status='OPEN'
    `);

    for (const req of rows) {
      const remainingDays = Math.ceil((req.expiry_at - now) / DAY);

      // ✅ 3일 남았을 때 DM 알림
      if (remainingDays === 3) {
        const guild = client.guilds.cache.get(req.guild_id);
        if (!guild) continue;

        // DM 보내기
        const user = await client.users.fetch(req.player_id).catch(() => null);
        let dmSent = false;
        if (user) {
          await user.send(
            `⏳ **High Test Reminder**\nYour test window will expire in **3 days.**\nPlease contact a High Tester to complete your test.`
          ).then(() => dmSent = true).catch(()=>{});
        }

        // ❗ DM 실패 → 로그 채널에 알림 전송
        if (!dmSent) {
          const logCh = guild.channels.cache.get(LOG_CHANNEL);
          if (logCh) {
            logCh.send(`⚠️ <@${req.player_id}>'s High Test expires in **3 days**, but I couldn't DM them.`);
          }
        }
      }

      // ⛔ 유효기간 종료 → 요청 만료 처리
      if (remainingDays <= 0) {
        await pool.query(`
          UPDATE ht_requests SET status='EXPIRED' WHERE id=?
        `, [req.id]);

        const guild = client.guilds.cache.get(req.guild_id);
        const logCh = guild?.channels.cache.get(LOG_CHANNEL);

        if (logCh) {
          logCh.send(`❌ <@${req.player_id}>'s High Test request has **expired** due to inactivity.`);
        }
      }
    }

  } catch (err) {
    console.error("❌ HT expiry scheduler error:", err);
  }
}
