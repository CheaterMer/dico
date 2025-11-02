import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { pool } from "../../config/db.js";
import dotenv from "dotenv";
dotenv.config();

export const data = new SlashCommandBuilder()
  .setName("fix-timestamps")
  .setDescription("Initialize missing rank promotion timestamps (lastPromotedAt).")
  .addUserOption(opt =>
    opt.setName("user")
      .setDescription("Fix only this user (optional)")
  );

export async function execute(interaction) {

  // ✅ Owner Only
  if (interaction.user.id !== process.env.OWNER_ID) {
    return interaction.reply({
      content: `❌ Only <@${process.env.OWNER_ID}> can use this command.`,
      flags: MessageFlags.Ephemeral
    });
  }

  await interaction.deferReply();

  const guildId = interaction.guild.id;
  const target = interaction.options.getUser("user");
  const now = Date.now();

  const updated = [];
  const skipped = [];
  const failed = [];

  // ✅ Fix single user
  if (target) {
    try {
      const [[row]] = await pool.query(
        `SELECT lastPromotedAt FROM members WHERE guild_id=? AND user_id=?`,
        [guildId, target.id]
      );

      if (!row) {
        return interaction.editReply("⚠ User not found in database.");
      }

      if (row.lastPromotedAt) {
        skipped.push(target.id);
      } else {
        await pool.query(
          `UPDATE members SET lastPromotedAt=? WHERE guild_id=? AND user_id=?`,
          [now, guildId, target.id]
        );
        updated.push(target.id);
      }
    } catch (err) {
      failed.push(`${target.id} (${err.message})`);
    }
  }

  // ✅ Fix all users
  else {
    const [rows] = await pool.query(
      `SELECT user_id, lastPromotedAt FROM members WHERE guild_id=?`,
      [guildId]
    );

    for (const m of rows) {
      try {
        if (!m.lastPromotedAt) {
          await pool.query(
            `UPDATE members SET lastPromotedAt=? WHERE guild_id=? AND user_id=?`,
            [now, guildId, m.user_id]
          );
          updated.push(m.user_id);
        } else {
          skipped.push(m.user_id);
        }
      } catch (err) {
        failed.push(`${m.user_id} (${err.message})`);
      }
    }
  }

  function limit(str) {
    return String(str).slice(0, 1024);
  }

  const embed = new EmbedBuilder()
    .setTitle("🕒 Timestamp Initialization Results")
    .setColor("#00BFFF")
    .addFields(
      {
        name: `✅ Updated (${updated.length})`,
        value: updated.length ? limit(updated.map(id => `<@${id}>`).join(", ")) : "None"
      },
      {
        name: `⏭ Skipped (${skipped.length})`,
        value: skipped.length ? limit(skipped.map(id => `<@${id}>`).join(", ")) : "None"
      }
    )
    .setFooter({ text: `Executed by ${interaction.user.tag}` })
    .setTimestamp();

  if (failed.length > 0) {
    embed.addFields({
      name: `⚠ Failed (${failed.length})`,
      value: limit(failed.join("\n"))
    });
  }

  return interaction.editReply({ embeds: [embed] });
}

export default { data, execute };
