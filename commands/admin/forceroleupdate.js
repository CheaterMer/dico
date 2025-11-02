import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { pool } from "../../config/db.js";
import { rankRoleMap, regionRoleMap } from "../../config/rolemap.js";
import dotenv from "dotenv";
dotenv.config();

export const data = new SlashCommandBuilder()
  .setName("forceroleupdate")
  .setDescription("Force sync RANK + REGION roles to match database.")
  .addUserOption(opt =>
    opt.setName("user")
      .setDescription("Target user (optional)")
      .setRequired(false)
  );

export async function execute(interaction) {

  // ✅ Owner Only
  if (interaction.user.id !== process.env.OWNER_ID) {
    return interaction.reply({ content: `❌ Only <@${process.env.OWNER_ID}> can use this command.`, ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: false }); // ✅ 공개 메시지로 진행

  const guild = interaction.guild;
  const guildId = guild.id;
  const target = interaction.options.getUser("user");

  // 역매핑
  const reverseRank = Object.fromEntries(Object.entries(rankRoleMap).map(([k, v]) => [v, k]));
  const reverseRegion = Object.fromEntries(Object.entries(regionRoleMap).map(([k, v]) => [v, k]));

  // 로그
  let updated = [], skipped = [], failed = [];

  const embed = new EmbedBuilder()
    .setTitle("🔁 Role Synchronization Progress")
    .setColor("#00BFFF")
    .setDescription("Processing... Please wait.")
    .addFields(
      { name: "✅ Updated", value: `0`, inline: true },
      { name: "⏭ Skipped", value: `0`, inline: true },
      { name: "⚠ Failed", value: `0`, inline: true },
    );

  await interaction.editReply({ embeds: [embed] });
  const refresh = () => {
    return interaction.editReply({
      embeds: [
        embed.setFields(
          { name: "✅ Updated", value: `${updated.length}`, inline: true },
          { name: "⏭ Skipped", value: `${skipped.length}`, inline: true },
          { name: "⚠ Failed", value: `${failed.length}`, inline: true },
        )
      ]
    });
  };

  // 역할 적용 함수
  const applySync = async (member, dbRank, dbRegion) => {
    const current = member.roles.cache.map(r => r.id);

    // Rank Role
    const shouldRank = rankRoleMap[dbRank];
    if (shouldRank) {
      for (const r of Object.values(rankRoleMap)) {
        if (current.includes(r) && r !== shouldRank) await member.roles.remove(r).catch(() => {});
      }
      if (!current.includes(shouldRank)) await member.roles.add(shouldRank).catch(() => {});
    }

    // Region Role
    const shouldRegion = regionRoleMap[dbRegion];
    if (shouldRegion) {
      for (const r of Object.values(regionRoleMap)) {
        if (current.includes(r) && r !== shouldRegion) await member.roles.remove(r).catch(() => {});
      }
      if (!current.includes(shouldRegion)) await member.roles.add(shouldRegion).catch(() => {});
    }
  };

  // ✅ Single User Mode
  if (target) {
    const member = await guild.members.fetch(target.id).catch(() => null);
    if (!member) return interaction.editReply("⚠ Member not found in guild.");

    const [[row]] = await pool.query(
      "SELECT `rank`, clan FROM members WHERE guild_id=? AND user_id=?",
      [guildId, member.id]
    );

    if (!row) return interaction.editReply("❌ User is missing in database.");

    await applySync(member, row.rank, row.clan);
    updated.push(member.id);
    await refresh();

    return interaction.followUp(`✅ Synced **${member.user.tag}** → Rank: **${row.rank}**, Region: **${row.clan}**`);
  }

  // ✅ Full Server Sync Mode
  const [rows] = await pool.query("SELECT user_id, `rank`, clan FROM members WHERE guild_id=?", [guildId]);

  for (const row of rows) {
    const member = await guild.members.fetch(row.user_id).catch(() => null);
    if (!member) { skipped.push(row.user_id); await refresh(); continue; }

    try {
      await applySync(member, row.rank, row.clan);
      updated.push(row.user_id);
    } catch (e) {
      failed.push(row.user_id);
    }

    await refresh();
    await new Promise(r => setTimeout(r, 200)); // 속도 조절
  }

  embed.setDescription("✅ Completed. All applicable roles have been synchronized.");
  return interaction.editReply({ embeds: [embed] });
}

export default { data, execute };
