import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export function buildSessionButtons(session) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`join_${session.session_id}`)
        .setLabel("Join")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`next_${session.session_id}`)
        .setLabel("Next")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`stop_${session.session_id}`)
        .setLabel("Stop")
        .setStyle(ButtonStyle.Danger)
    )
  ];
}
