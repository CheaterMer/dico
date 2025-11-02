import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { pool } from "../../config/db.js";
import { rankRoleMap, regionRoleMap } from "../../config/rolemap.js";
import dotenv from "dotenv";
dotenv.config();

export const data = new SlashCommandBuilder()
  .setName("syncregion")
  .setDescription("Synchronize members' region data to database using region roles.")
  .addUserOption(opt =>
    opt.setName("user")
      .setDescription("Target user (optional)")
      .setRequired(false)
  );

export async function execute(interaction) {
  if (interaction.user.id !== process.env.OWNER_ID) {
    return interaction.reply({ content: "❌ Owner only.", ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: false });

  const guild = interaction.guild;
  const guildId = guild.id;
  const target = interaction.options.getUser("user");

  // 역매핑: roleId → regionName
  const reverseRegion = Object.fromEntries(
    Object.entries(regionRoleMap).map(([region, roleId]) => [roleId, region])
  );

  let updated = [];
  let missingRegion = [];
  let missingRank = [];

  const logUser = (arr, member, reason) => {
    console.log(`[LOG] ${member.user.tag} (${member.id}) → ${reason}`);
    arr.push(`<@${member.id}>`);
  };

  // ✅ 단일 유저 모드
  if (target) {
    const member = await guild.members.fetch(target.id).catch(() => null);
    if (!member) return interaction.editReply("⚠ Member not found.");

    const regionRole = member.roles.cache.find(r => reverseRegion[r.id]);
    if (!regionRole) {
      logUser(missingRegion, member, "❌ Missing region role");
    } else {
      const regionName = reverseRegion[regionRole.id];
      await pool.query("UPDATE members SET clan=? WHERE guild_id=? AND user_id=?", [
        regionName, guildId, member.id
      ]);
      logUser(updated, member, `✅ Region synced: ${regionName}`);
    }

    return interaction.editReply({
      content: "✅ Done.",
      embeds: [
        new EmbedBuilder()
          .setTitle("🌍 Region Sync Result (Single User)")
          .setColor("#00BFFF")
          .addFields(
            { name: "✅ Updated", value: updated.length ? updated.join(", ") : "None" },
            { name: "❌ Missing Region Role", value: missingRegion.length ? missingRegion.join(", ") : "None" }
          )
      ]
    });
  }

  // ✅ 전체 유저 모드 — 역할 가진 멤버만 순회
  for (const [regionName, roleId] of Object.entries(regionRoleMap)) {
    const role = guild.roles.cache.get(roleId);
    if (!role) continue;

    for (const member of role.members.values()) {

      const regionRole = member.roles.cache.find(r => reverseRegion[r.id]);
      const rankRole = member.roles.cache.find(r => Object.values(rankRoleMap).includes(r.id));

      if (!regionRole) {
        logUser(missingRegion, member, "❌ Missing region role");
        continue;
      }

      if (!rankRole) {
        logUser(missingRank, member, "⚠ Member has region role but no rank role");
      }

      const region = reverseRegion[regionRole.id];
      await pool.query("UPDATE members SET clan=? WHERE guild_id=? AND user_id=?", [
        region, guildId, member.id
      ]);

      logUser(updated, member, `✅ Region synced: ${region}`);
      await new Promise(r => setTimeout(r, 250));
    }
  }

  // ✅ 결과 임베드 출력
  const embed = new EmbedBuilder()
    .setTitle("🌍 Region Sync Complete")
    .setColor("#00BFFF")
    .addFields(
      { name: `✅ Updated (${updated.length})`, value: updated.length ? updated.join("\n") : "None" },
      { name: `❌ Missing Region Role (${missingRegion.length})`, value: missingRegion.length ? missingRegion.join("\n") : "None" },
      { name: `⚠ Missing Rank Role (${missingRank.length})`, value: missingRank.length ? missingRank.join("\n") : "None" }
    )
    .setFooter({ text: `Run by ${interaction.user.tag}` })
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}

export default { data, execute };
