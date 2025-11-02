// events/interactionCreate.js
import fs from 'fs';
import path from 'path';

export default {
  name: "interactionCreate",

  async execute(interaction, client) {

    // Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(`❌ Command Error: ${interaction.commandName}`, err);
        if (interaction.deferred || interaction.replied) interaction.editReply("❌ Command failed.");
        else interaction.reply({ content: "❌ Command failed.", flags: 64 });
      }
      return;
    }

    // Buttons
    if (interaction.isButton()) {
      for (const [prefix, handler] of client.buttons) {
        if (interaction.customId.startsWith(prefix)) {
          try {
            return await handler.execute(interaction, client);
          } catch (err) {
            console.error(`❌ Button Error (${interaction.customId}):`, err);
            if (!interaction.replied && !interaction.deferred)
              return interaction.reply({ content: "❌ Button failed.", flags: 64 });
          }
        }
      }
      return;
    }

    // Select Menus (Optional)
    if (interaction.isStringSelectMenu()) {
      const handler = client.menus.get(interaction.customId);
      if (handler) return handler.execute(interaction, client).catch(() => {});
    }
  }
};
