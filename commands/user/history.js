// commands/user/history.js
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pool } from '../../config/db.js';

export const data = new SlashCommandBuilder()
  .setName('history')
  .setDescription('View a user\'s test & promotion history.')
  .addUserOption(opt =>
    opt.setName('user')
      .setDescription('The user to check')
      .setRequired(false)
  );

export async function execute(interaction) {
  await interaction.deferReply();

  const target = interaction.options.getUser('user') || interaction.user;
  const guildId = interaction.guild.id;

  // ✅ DB에서 사용자 정보 가져오기
  const [[member]] = await pool.query(
    `SELECT \`rank\`, clan, lastPromotedAt FROM members WHERE guild_id = ? AND user_id = ?`,
    [guildId, target.id]
  );

  if (!member) {
    return interaction.editReply(`❌ No record found for **${target.tag}**.`);
  }

  // ✅ 승급 기록 가져오기
    const [rankUps] = await pool.query(
    `SELECT details, created_at
    FROM interaction_logs
    WHERE guild_id = ?
    AND user_id = ?
    AND command IN ('setrank', 'opentest', 'join_test')
    ORDER BY created_at DESC
    LIMIT 10`,
    [guildId, target.id]
    );


  const recentPromos = rankUps.slice(0, 3).map(l => {
    let data = l.details;
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch { return `• ${data}`; }
    }

    const newRank = data["New Rank"] ?? "Unknown Rank";
    const tester = data.Tester ?? "Unknown";
    const timestamp = Math.floor(new Date(l.created_at).getTime() / 1000);

    return `• **${newRank}** (by ${tester}) — <t:${timestamp}:R>`;
  }).join("\n") || "None";

  // ✅ 최근 테스트 참여 기록 가져오기
  const [sessions] = await pool.query(
    `SELECT session_id, region, status, participants, created_at
     FROM test_sessions
     WHERE guild_id = ?`,
    [guildId]
  );

  const participated = sessions.filter(s => {
    try {
      const arr = JSON.parse(s.participants || "[]");
      return arr.includes(target.id);
    } catch {
      return false;
    }
  });

  const recentSessions = participated.slice(0, 5)
    .map(s => {
      const ts = Math.floor(new Date(s.created_at).getTime() / 1000);
      const st = s.status === "OPEN"
        ? "🟢 Open"
        : s.status === "STOPPED"
          ? "🟡 Paused"
          : "🔴 Closed";

      return `• **Session #${s.session_id}** — ${s.region} ${st} — <t:${ts}:R>`;
    })
    .join("\n") || "None";

  // ✅ 승급 경과일 계산
  let promotedText = "Never Promoted";
  if (member.lastPromotedAt) {
    promotedText = `<t:${Math.floor(member.lastPromotedAt / 1000)}:R>`;
  }

  // ✅ 생성 임베드
  const embed = new EmbedBuilder()
    .setTitle(`📜 History — ${target.tag}`)
    .setColor('#00BFFF')
    .addFields(
      { name: 'Rank', value: member.rank || 'UnRanked', inline: true },
      { name: 'Region', value: member.clan || 'None', inline: true },
      { name: 'Last Promotion', value: promotedText, inline: true },
      { name: `🏆 Recent Promotions (${rankUps.length})`, value: recentPromos, inline: false },
      { name: `📝 Recent Test Participation (${participated.length})`, value: recentSessions, inline: false },
    )
    .setThumbnail(target.displayAvatarURL({ dynamic: true }))
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}

export default { data, execute };
