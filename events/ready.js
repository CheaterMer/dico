// events/ready.js
import { ActivityType, REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID || null;

export default {
  name: 'clientReady',
  once: true,

  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);

    // ------- Load Slash Commands -------
    client.commands = new Map();
    const commands = [];

    const commandsDir = path.resolve('commands');
    const categories = fs.readdirSync(commandsDir);

    for (const category of categories) {
      const categoryPath = path.join(commandsDir, category);
      const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));

      for (const file of files) {
        const command = (await import(`../commands/${category}/${file}`)).default;
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
      }
    }

    // ------- Register Commands (Guild or Global) -------
    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
      if (GUILD_ID) {
        await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), {
          body: commands,
        });
        console.log(`✅ Slash commands registered to Guild (${GUILD_ID})`);
      } else {
        await rest.put(Routes.applicationCommands(client.user.id), {
          body: commands,
        });
        console.log(`🌍 Slash commands registered Globally`);
      }
    } catch (err) {
      console.error('❌ Command Registration Failed:', err);
    }

    // ------- Set Bot Presence -------
    client.user.setActivity('TSBAC Rank System', { type: ActivityType.Playing });
  }
};
