export async function respondSafe(interaction, payload) {
  try {
    if (!interaction.deferred && !interaction.replied) {
      return await interaction.reply(payload);
    } else {
      return await interaction.followUp({ ...payload, ephemeral: true });
    }
  } catch {
    return await interaction.followUp({ content: '⚠️ Interaction handling failed.', ephemeral: true });
  }
}
