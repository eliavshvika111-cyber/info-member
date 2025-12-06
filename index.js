const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const sqlite3 = require("sqlite3").verbose();

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// ===== DATABASE =====
const db = new sqlite3.Database("./players.db");

db.run(`
CREATE TABLE IF NOT EXISTS players (
    user_id TEXT PRIMARY KEY,
    start_time INTEGER
)
`);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

const commands = [
    new SlashCommandBuilder()
        .setName("info")
        .setDescription("קבלת מידע על שחקן")
        .addUserOption(option =>
            option.setName("member")
                .setDescription("בחר משתמש")
                .setRequired(true)
        )
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);
rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands })
    .then(() => console.log("Commands registered"))
    .catch(console.error);

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "info") {
        const member = interaction.options.getUser("member");

        db.get("SELECT start_time FROM players WHERE user_id = ?", [member.id], (err, row) => {
            if (err) return interaction.reply("❌ Database error.");

            const now = Date.now();

            if (!row) {
                db.run("INSERT INTO players(user_id, start_time) VALUES(?, ?)", [member.id, now]);
                return interaction.reply(`🎮 המשתמש **${member.username}** התחיל לשחק עכשיו (נרשם במערכת).`);
            }

            const start = row.start_time;
            const diff = now - start;

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / (1000 * 60)) % 60);

            const startDate = new Date(start).toLocaleString("he-IL");

            return interaction.reply(`
