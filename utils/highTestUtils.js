// utils/highTestUtils.js
import { pool } from "../config/db.js";
import { applyRoles } from "./roleUtils.js";
import { EmbedBuilder } from "discord.js";

export async function promotePlayer(guild, tester, playerId) {
  const guildId = guild.id;
  const now = Date.now();
  const player = await guild.members.fetch(playerId);

  // ✅ 기존 Rank & Region 불러오기
  const [[existing]] = await pool.query(
    `SELECT \`rank\`, clan FROM members WHERE guild_id=? AND user_id=?`,
    [guildId, playerId]
  );

  const previousRank = existing?.rank || "UnRanked";
  const region = existing?.clan || "Unknown";

  // ✅ 승급 순서 (높을수록 상위)
  const tiers = ["LT5","HT5","LT4","HT4","LT3","HT3","LT2","HT2","LT1","HT1","RLT1","RHT1"];
  
  const idx = tiers.indexOf(previousRank);
  const newRank = idx > 0 ? tiers[idx - 1] : previousRank; // 이미 최고면 유지

  // ✅ DB 업데이트
  await pool.query(
    `UPDATE members SET \`rank\`=?, clan=?, lastPromotedAt=? WHERE guild_id=? AND user_id=?`,
    [newRank, region, now, guildId, playerId]
  );

  // ✅ 역할 동기화
  await applyRoles(player, newRank, region);

  // ✅ 결과 임베드
  const embed = new EmbedBuilder()
    .setTitle(`${player.user.username}'s Test Results 🏆`)
    .setThumbnail(player.user.displayAvatarURL({ extension: "png", size: 256 }))
    .setColor("#94ffaf")
    .addFields(
      { name: "Tester", value: tester.user.tag, inline: false },
      { name: "Region", value: region, inline: false },
      { name: "Username", value: `<@${player.id}>`, inline: false },
      { name: "Previous Rank", value: previousRank, inline: false },
      { name: "Rank Earned", value: newRank, inline: false },
    )
    .setFooter({ text: "Rank System | Rank Card" })
    .setTimestamp();

  return { embed, previousRank, newRank, region };
}

export function createFailureEmbed(player, tester, reason, terrible = false) {
  return new EmbedBuilder()
    .setTitle(`${player.user.username}'s Test Result`)
    .setColor(terrible ? "#ff3b3b" : "#ff9c3b")
    .setThumbnail(player.user.displayAvatarURL({ extension: "png", size: 256 }))
    .addFields(
      { name: "Tester", value: tester.user.tag, inline: false },
      { name: "Player", value: `<@${player.id}>`, inline: false },
      { name: "Outcome", value: terrible ? "💀 **TERRIBLE LOSS**" : "❌ **FAIL**", inline: false },
      { name: "Reason", value: reason, inline: false }
    )
    .setFooter({ text: "Rank System | Test Review Log" })
    .setTimestamp();
}