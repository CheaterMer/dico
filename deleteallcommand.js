import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

async function wipe() {
  try {
    console.log("🗑  Deleting ALL Global Commands...");
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: [] }
    );

    console.log("🗑  Deleting ALL Guild Commands...");
    const guildId = process.env.GUILD_ID;
    if (guildId) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
        { body: [] }
      );
    }

    console.log("✅ All commands cleared.");
  } catch (err) {
    console.error(err);
  }
}

wipe();
