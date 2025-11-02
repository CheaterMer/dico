// interactions/buttons/join_button.js
import {
  getSessionIdFromCustomId,
  getSessionById,
  addParticipant,
  updateSessionEmbed
} from "../../utils/sessionUtils.js";

export default {
  customIdStartsWith: "join_",

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});

    const sessionId = getSessionIdFromCustomId(interaction.customId);

    const added = await addParticipant(sessionId, interaction.user.id);
    if (!added)
      return interaction.editReply("⚠️ You are already registered or you are an examiner.");

    const session = await getSessionById(sessionId);
    await updateSessionEmbed(session, client);

    return interaction.editReply("✅ You have joined the session!");
  }
};
