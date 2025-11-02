// commands/admin/setrank.js
import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { pool } from "../../config/db.js";
import { applyRoles } from "../../utils/roleUtils.js";
import { examinerRoles } from "../../config/rolemap.js";

const data = new SlashCommandBuilder()
  .setName("setrank")
  .setDescription("Set a user's rank and region, and record promotion date.")
  .addUserOption(opt =>
    opt.setName("target")
      .setDescription("Target user")
      .setRequired(true)
  )
  .addStringOption(opt =>
    opt.setName("rg")
      .setDescription("Region to assign")
      .setRequired(true)
      .addChoices(
        { name: "JP", value: "Japan" },
        { name: "SG", value: "Singapore" },
        { name: "IND", value: "India" }
      )
  )
        .addStringOption(opt => opt.setName('rank').setDescription('The rank to assign').setRequired(true)
        .addChoices(
          { name: 'RHT1', value: 'RHT1' }, { name: 'RLT1', value: 'RLT1' },
          { name: 'RHT2', value: 'RHT2' }, { name: 'RLT2', value: 'RLT2' },
          { name: 'RHT3', value: 'RHT3' }, { name: 'HT1', value: 'HT1' },
          { name: 'LT1', value: 'LT1' }, { name: 'HT2', value: 'HT2' },
          { name: 'LT2', value: 'LT2' }, { name: 'HT3', value: 'HT3' },
          { name: 'LT3', value: 'LT3' }, { name: 'HT4', value: 'HT4' },
          { name: 'LT4', value: 'LT4' }, { name: 'HT5', value: 'HT5' },
          { name: 'LT5', value: 'LT5' }, { name: 'UnRanked', value: 'UnRanked' }
        ))

async function execute(interaction, client) {
  await interaction.deferReply();

  const guildId = interaction.guild.id;
  const target = interaction.options.getUser("target");
  const region = interaction.options.getString("rg");
  const newRank = interaction.options.getString("rank");
  const now = Date.now();

      // ✅ 명령 실행자 정보 가져오기
      const executor = await interaction.guild.members.fetch(interaction.user.id);
  
      // ✅ 서버 owner → 바로 허용
      if (interaction.user.id !== process.env.OWNER_ID) {
        const allowed = executor.roles.cache.some(r => examinerRoles.includes(r.id));
        if (!allowed) {
          return interaction.editReply("🚫 You don't have permission to use this command.");
        }
      }

  // ✅ 기존 Rank 가져오기 (여기서 오류났었음)
  const [[existing]] = await pool.query(
    `SELECT \`rank\` FROM members WHERE guild_id=? AND user_id=?`,
    [guildId, target.id]
  );
  const previousRank = existing?.rank || "UnRanked";

  // ✅ 없으면 insert
  await pool.query(
    `INSERT IGNORE INTO members (guild_id, user_id, \`rank\`, status)
     VALUES (?, ?, 'UnRanked', 'Active')`,
    [guildId, target.id]
  );

  // ✅ 업데이트
  await pool.query(
    `UPDATE members SET \`rank\`=?, clan=?, lastPromotedAt=? WHERE guild_id=? AND user_id=?`,
    [newRank, region, now, guildId, target.id]
  );

  // ✅ 역할 동기화
  const member = await interaction.guild.members.fetch(target.id).catch(() => null);
  if (member) await applyRoles(member, newRank, region);

  // ✅ 임베드 표시
  const embed = new EmbedBuilder()
    .setTitle(`${target.username}'s Test Results 🏆`)
    .setThumbnail(target.displayAvatarURL({ extension: "png", size: 256 }))
    .setColor("#94ffaf")
    .addFields(
      { name: "Tester", value: interaction.user.tag, inline: false },
      { name: "Region", value: region, inline: false },
      { name: "Username", value: `<@${target.id}>`, inline: false },
      { name: "Previous Rank", value: previousRank, inline: false },
      { name: "Rank Earned", value: newRank, inline: false },
    )
    .setFooter({ text: "Rank System | Rank Card" })
    .setTimestamp();

  return interaction.editReply({
    content: `✅ <@${target.id}>'s rank has been set.`,
    embeds: [embed]
  });
}

export default { data, execute };
