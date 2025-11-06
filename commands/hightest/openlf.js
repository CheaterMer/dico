// commands/hightest/openlf.js
import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";
import { pool } from "../../config/db.js";
import { rankRoleMap } from "../../config/rolemap.js";

const HIGH_TESTER_ROLE = "1408415932660846673";
const LF_CHANNEL = "1435575394152611870";

const phase1Opponents = {
  HT1: ["LT2"],
  LT1: ["LT2"],
  HT2: ["LT2"],
  LT2: ["LT2"],
  HT3: ["LT3"],
  LT3: ["LT3"]
};

export default {
  data: new SlashCommandBuilder()
    .setName("openlf")
    .setDescription("Open Phase 1 LF panel for the test request channel."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const executor = await guild.members.fetch(interaction.user.id);
    const channel = interaction.channel;

    if (!executor.roles.cache.has(HIGH_TESTER_ROLE)) {
      return interaction.editReply("🚫 You must be a **High Tester** to open LF panels.");
    }

    const match = channel.name.match(/req-[a-z0-9]+-(\d+)/i);
    if (!match) return interaction.editReply("⚠️ This command must be used in a **test request** channel.");

    const requestId = match[1];

    const [[request]] = await pool.query(
      `SELECT player_id FROM ht_requests WHERE id=? AND guild_id=?`,
      [requestId, guild.id]
    );

    const playerId = request.player_id;
    const player = await guild.members.fetch(playerId);

    const tier = Object.keys(rankRoleMap).find(t => player.roles.cache.has(rankRoleMap[t]));
    const allowed = phase1Opponents[tier];

    // ✅ opponents 초기화 → JSON 배열로 비움 (핵심 수정)
    await pool.query(`
      UPDATE ht_requests
      SET phase=1,
          status='OPEN',
          opponents=JSON_ARRAY(),
          allowed_roles=?,
          panel_channel_id=?
      WHERE id=?`,
      [JSON.stringify(allowed), LF_CHANNEL, requestId]
    );

    const embed = new EmbedBuilder()
      .setColor("#00bfff")
      .setTitle("🔍 Phase 1 — Looking For Opponents")
      .setDescription([
        `**Player:** <@${playerId}>`,
        `**Tier:** \`${tier}\``,
        `**Phase:** \`1/4\``,
        `**Allowed Opponents:** \`${allowed.join(", ")}\``,
        `**Needed:** \`2\``,
        `**Current:** \`0/2\``,
        ``,
        `Press **Volunteer** to join.`
      ].join("\n"))
      .setThumbnail(player.user.displayAvatarURL())
      .setTimestamp();

    const volunteer = new ButtonBuilder()
      .setCustomId(`volunteer:${requestId}`)
      .setLabel("Volunteer")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(volunteer);

    const lfChannel = await guild.channels.fetch(LF_CHANNEL);
    const panelMessage = await lfChannel.send({ embeds: [embed], components: [row] });

    await pool.query(`
      UPDATE ht_requests
      SET panel_message_id=?
      WHERE id=?`,
      [panelMessage.id, requestId]
    );

    return interaction.editReply(`✅ Phase 1 panel created in <#${LF_CHANNEL}>.`);
  }
};
