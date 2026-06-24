require('dotenv').config();
const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    SlashCommandBuilder,
    Routes,
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    ChannelType,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    AttachmentBuilder
} = require('discord.js');
const { REST } = require('@discordjs/rest');
const crypto = require('crypto');

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const CHANNEL_REVIEW = '⭐・øpin1e';
const CHANNEL_RESTOCK = '📦・r3støck';
const CHANNEL_ACTIVATE = '🔐・4ktywuj-kl7cz';
const ROLE_VERIFY = '・𝐔𝐳𝐲𝐭𝐤𝐨𝐰𝐧𝐢𝐤';
const ROLE_CLIENT = '・𝐊𝐥𝐢𝐞𝐧𝐭';
const ROLE_SPAMBOT = 'spambot.perms';
const ROLE_EXTERNAL = 'external.perms';
const CHANNEL_LOBBY = '🏡・løbby';
const WELCOME_BANNER = 'YOUR_IMAGE_LINK_HERE'; // Wklej tutaj link do obrazka

const MAIN_COLOR = 0xf69000;
let ticketCounter = 1;
let podanieCounter = 1;

const activeKeys = new Map();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
    ]
});

function parseTime(timeStr) {
    const regex = /^(\d+)([smhd])$/;
    const match = timeStr.match(regex);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60000;
        case 'h': return value * 3600000;
        case 'd': return value * 86400000;
        default: return null;
    }
}

const commands = [
    new SlashCommandBuilder().setName('opinia').setDescription('Dodaj opinię o serwerze (Tylko dla Klientów)').addIntegerOption(o => o.setName('gwiazdki').setDescription('Liczba gwiazdek (1-5)').setRequired(true).setMinValue(1).setMaxValue(5)).addStringOption(o => o.setName('tresc').setDescription('Twoja opinia').setRequired(true)),
    new SlashCommandBuilder().setName('regulamin').setDescription('Opublikuj regulamin serwera').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('weryfikacja').setDescription('Stwórz panel weryfikacji').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('wiadomosc').setDescription('Wyślij wiadomość w formie panelu').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('clear').setDescription('Usuń wybraną ilość wiadomości').addIntegerOption(o => o.setName('ilosc').setDescription('Ilość').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('giveaway').setDescription('Stwórz giveaway').addStringOption(o => o.setName('nagroda').setDescription('Nagroda').setRequired(true)).addStringOption(o => o.setName('czas').setDescription('Czas').setRequired(true)).addBooleanOption(o => o.setName('tylko_klient').setDescription('Tylko Klient?').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('restock').setDescription('Otwórz panel restocku kont').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('ticket').setDescription('Opublikuj panel ticketów z kategoriami').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('podanie').setDescription('Opublikuj panel podań').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('generuj').setDescription('Generuje klucz aktywacyjny').addStringOption(o => o.setName('typ').setDescription('Dla jakiej rangi?').setRequired(true).addChoices({ name: 'Spambot', value: 'spambot' }, { name: 'External', value: 'external' })).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('aktywacja-panel').setDescription('Publikuje panel do aktywacji kluczy').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('shutdown').setDescription('Wyłącza bota (tylko dla właścicieli)').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log(`Zalogowano jako ${client.user.tag}!`);
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        if (GUILD_ID) {
            await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
            await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), { body: commands });
        }
    } catch (error) { console.error(error); }
});

client.on('interactionCreate', async interaction => {

    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'shutdown') {
            try {
                const app = await client.application.fetch();
                const isBotOwner = app.owner?.members ? app.owner.members.has(interaction.user.id) : app.owner?.id === interaction.user.id;
                
                if (interaction.user.id !== interaction.guild.ownerId && !isBotOwner) {
                    return interaction.reply({ content: '❌ Ta komenda jest dostępna tylko dla właścicieli!', ephemeral: true });
                }
                
                await interaction.reply({ content: '🛑 Wyłączanie bota...', ephemeral: true });
                client.destroy();
                // Zapobiega wyłączeniu procesu, aby hosting go nie zrestartował
                setInterval(() => {}, 1000 * 60 * 60);
            } catch (error) {
                console.error('Błąd podczas wyłączania bota:', error);
                return interaction.reply({ content: '❌ Wystąpił błąd podczas wyłączania.', ephemeral: true });
            }
        }

        if (interaction.commandName === 'generuj') {
            const type = interaction.options.getString('typ');
            const key = `${type.toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
            activeKeys.set(key, type);
            await interaction.reply({ content: `✅ Wygenerowano klucz dla **${type}**: \`${key}\``, ephemeral: true });
        }

        if (interaction.commandName === 'aktywacja-panel') {
            const embed = new EmbedBuilder()
                .setColor(MAIN_COLOR) // Zmienione na ZIELONY
                .setTitle('🔐 Aktywacja Klucza')
                .setDescription('Jeśli posiadasz klucz aktywacyjny, kliknij przycisk poniżej i wpisz go, aby otrzymać rangę!')
                .setFooter({ text: interaction.guild.name });

            const btn = new ButtonBuilder().setCustomId('openActivateModal').setLabel('Aktywuj Klucz').setEmoji('🔑').setStyle(ButtonStyle.Success);
            await interaction.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
            await interaction.reply({ content: '✅ Panel aktywacji wysłany!', ephemeral: true });
        }

        // --- GIVEAWAY ---
        if (interaction.commandName === 'giveaway') {
            const prize = interaction.options.getString('nagroda');
            const duration = parseTime(interaction.options.getString('czas'));
            const onlyClient = interaction.options.getBoolean('tylko_klient');
            if (!duration) return interaction.reply({ content: '❌ Błąd czasu.', ephemeral: true });
            const endTime = Math.floor((Date.now() + duration) / 1000);
            const embed = new EmbedBuilder().setColor(MAIN_COLOR).setTitle('🎉 GIVEAWAY!').setDescription(`Nagroda: **${prize}**\nKoniec: <t:${endTime}:R>\n\n${onlyClient ? `Wymagana ranga: \`${ROLE_CLIENT}\`` : 'Każdy może dołączyć!'}`);
            const btn = new ButtonBuilder().setCustomId('giveawayJoin').setLabel('Dołącz').setEmoji('🎉').setStyle(ButtonStyle.Success);
            const msg = await interaction.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
            await interaction.reply({ content: '✅ Start!', ephemeral: true });
            const participants = new Set();
            const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: duration });
            collector.on('collect', async i => {
                if (onlyClient && !i.member.roles.cache.some(r => r.name === ROLE_CLIENT)) return i.reply({ content: '❌ Brak rangi!', ephemeral: true });
                if (participants.has(i.user.id)) return i.reply({ content: '❌ Już bierzesz udział!', ephemeral: true });
                participants.add(i.user.id);
                await i.reply({ content: '✅ Dołączyłeś!', ephemeral: true });
            });
            collector.on('end', async () => {
                const winnerId = [...participants][Math.floor(Math.random() * participants.size)];
                await msg.edit({ components: [] });
                await interaction.channel.send(winnerId ? `Gratulacje <@${winnerId}>! Wygrałeś **${prize}**!\n**Odbierz nagrode na ticket!**` : 'Nikt nie dołączył.');
            });
        }

        // ... RESZTA KOMEND (TICKET, RESTOCK, OPINIA, CLEAR, REGULAMIN, WERYFIKACJA, WIADOMOSC) ...
        if (interaction.commandName === 'ticket') {
            const modal = new ModalBuilder().setCustomId('ticketSetupModal').setTitle('Panel Ticketów');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticketDesc').setLabel("Treść").setStyle(TextInputStyle.Paragraph).setRequired(true)));
            await interaction.showModal(modal);
        }
        if (interaction.commandName === 'podanie') {
            const modal = new ModalBuilder().setCustomId('podanieSetupModal').setTitle('Panel Podań');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('podanieDesc').setLabel("Treść").setStyle(TextInputStyle.Paragraph).setRequired(true)));
            await interaction.showModal(modal);
        }
        if (interaction.commandName === 'restock') {
            const modal = new ModalBuilder().setCustomId('restockModal').setTitle('Panel Restocku');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('cs2_nfa').setLabel("CS2 NFA").setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('cs2_fa').setLabel("CS2 FA").setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rust_nfa').setLabel("Rust NFA").setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rust_fa').setLabel("Rust FA").setStyle(TextInputStyle.Short).setRequired(false))
            );
            await interaction.showModal(modal);
        }
        if (interaction.commandName === 'opinia') {
            const hasClientRole = interaction.member.roles.cache.some(role => role.name === ROLE_CLIENT);
            const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
            if (!hasClientRole && !isAdmin) return interaction.reply({ content: `❌ Brak rangi!`, ephemeral: true });
            await interaction.deferReply({ ephemeral: true });
            const reviewEmbed = new EmbedBuilder().setColor(MAIN_COLOR).setAuthor({ name: `Opinia od @${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) }).setTitle('⭐'.repeat(interaction.options.getInteger('gwiazdki'))).setDescription(interaction.options.getString('tresc')).addFields({ name: '👤 Klient', value: `<@${interaction.user.id}>`, inline: true }, { name: '📅 Data', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }).setFooter({ text: 'Dziękujemy!' }).setTimestamp();
            const ch = interaction.guild.channels.cache.find(c => c.name === CHANNEL_REVIEW);
            if (ch) await ch.send({ embeds: [reviewEmbed] });
            await interaction.editReply({ content: `✅ Wysłano!` });
        }
        if (interaction.commandName === 'clear') { await interaction.channel.bulkDelete(interaction.options.getInteger('ilosc'), true); await interaction.reply({ content: `✅ Usunięto!`, ephemeral: true }); }
        if (interaction.commandName === 'regulamin') {
            const modal = new ModalBuilder().setCustomId('regulaminModal').setTitle('Regulamin');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('regulaminTytul').setLabel("Tytuł").setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('regulaminTresc').setLabel("Treść").setStyle(TextInputStyle.Paragraph).setRequired(true)));
            await interaction.showModal(modal);
        }
        if (interaction.commandName === 'weryfikacja') {
            const modal = new ModalBuilder().setCustomId('weryfikacjaModal').setTitle('Weryfikacja');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('weryfikacjaTresc').setLabel("Instrukcja").setStyle(TextInputStyle.Paragraph).setRequired(true)));
            await interaction.showModal(modal);
        }
        if (interaction.commandName === 'wiadomosc') {
            const modal = new ModalBuilder().setCustomId('wiadomoscModal').setTitle('Wiadomość');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('wiadomoscTytul').setLabel("Tytuł").setStyle(TextInputStyle.Short).setRequired(false)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('wiadomoscTresc').setLabel("Treść").setStyle(TextInputStyle.Paragraph).setRequired(true)));
            await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('verifyMathModal_')) {
            const expectedAnswer = interaction.customId.split('_')[1];
            const userAnswer = interaction.fields.getTextInputValue('mathAnswer').trim();
            if (userAnswer === expectedAnswer) {
                const role = interaction.guild.roles.cache.find(r => r.name === ROLE_VERIFY);
                if (role) {
                    await interaction.member.roles.add(role);
                    await interaction.reply({ content: '✅ Zweryfikowano pomyślnie!', ephemeral: true });
                } else {
                    await interaction.reply({ content: '❌ Błąd: Brak roli na serwerze.', ephemeral: true });
                }
            } else {
                await interaction.reply({ content: '❌ Błędny wynik! Spróbuj ponownie.', ephemeral: true });
            }
        }

        if (interaction.customId === 'activateKeyModal') {
            const inputKey = interaction.fields.getTextInputValue('keyInput').trim();
            if (activeKeys.has(inputKey)) {
                const type = activeKeys.get(inputKey);
                const roleName = type === 'spambot' ? ROLE_SPAMBOT : ROLE_EXTERNAL;
                const role = interaction.guild.roles.cache.find(r => r.name === roleName);
                if (role) {
                    await interaction.member.roles.add(role);
                    activeKeys.delete(inputKey);
                    await interaction.reply({ content: `✅ Sukces! Przyznano rangę <@&${role.id}>.`, ephemeral: true });
                } else { await interaction.reply({ content: '❌ Brak roli na serwerze.', ephemeral: true }); }
            } else { await interaction.reply({ content: '❌ Błędny klucz.', ephemeral: true }); }
        }

        if (interaction.customId === 'ticketSetupModal') {
            const desc = interaction.fields.getTextInputValue('ticketDesc');
            const embed = new EmbedBuilder().setColor(MAIN_COLOR).setTitle('🎫 Wybierz kategorię zakupu').setDescription(`${desc}\n\n**HØPE $TØRE**`);
            const select = new StringSelectMenuBuilder().setCustomId('ticketCategorySelect').setPlaceholder('Kliknij tutaj...').addOptions(
                new StringSelectMenuOptionBuilder().setLabel('it3m-f1nd3r').setValue('item-finder').setEmoji('📜'),
                new StringSelectMenuOptionBuilder().setLabel('sp4m-bøt').setValue('spambot').setEmoji('🤖'),
                new StringSelectMenuOptionBuilder().setLabel('d3køracje').setValue('d3koracje').setEmoji('🖤'),
                new StringSelectMenuOptionBuilder().setLabel('che4ty-cs2').setValue('cheaty-cs2').setEmoji('🔫'),
                new StringSelectMenuOptionBuilder().setLabel('che4ty-røbløx').setValue('cheaty-roblox').setEmoji('🔫'),
                new StringSelectMenuOptionBuilder().setLabel('søcial-bøøsting').setValue('social-boosting').setEmoji('💜'),
                new StringSelectMenuOptionBuilder().setLabel('søcial-upgr4de').setValue('social-upgrade').setEmoji('💛'),
                new StringSelectMenuOptionBuilder().setLabel('kønta-førtnite').setValue('konta-fortnite').setEmoji('💙'),
                new StringSelectMenuOptionBuilder().setLabel('kønta-cs2').setValue('konta-cs2').setEmoji('🤍'),
                new StringSelectMenuOptionBuilder().setLabel('kønta-gta-v').setValue('konta-gta-v').setEmoji('💚'),
                new StringSelectMenuOptionBuilder().setLabel('kønta-rust').setValue('konta-rust').setEmoji('❤️'),
                new StringSelectMenuOptionBuilder().setLabel('wyświ3tleni4・guns-løl').setValue('wyswietlenia').setEmoji('💗'),
                new StringSelectMenuOptionBuilder().setLabel('p3rfumy').setValue('perfumy').setEmoji('🌸'),
                new StringSelectMenuOptionBuilder().setLabel('serwery-dc-na-zamøw1enie').setValue('serwery-dc').setEmoji('🛄'),
                new StringSelectMenuOptionBuilder().setLabel('sk1ny・wym1any・cs').setValue('skiny-cs').setEmoji('💳'),
                new StringSelectMenuOptionBuilder().setLabel('serw3ry・mc').setValue('serwery-mc').setEmoji('🌍'),
                new StringSelectMenuOptionBuilder().setLabel('mødy・mc').setValue('mody-mc').setEmoji('🏠'),
                new StringSelectMenuOptionBuilder().setLabel('røbløx-1ty').setValue('roblox-ity').setEmoji('🧾'),
                new StringSelectMenuOptionBuilder().setLabel('plug1ny・skrypty・mc').setValue('pluginy-skrypty-mc').setEmoji('🪶'),
                new StringSelectMenuOptionBuilder().setLabel('prem1um・m1necr4ft').setValue('premium-mc').setEmoji('👑'),
                new StringSelectMenuOptionBuilder().setLabel('🔰・mødd1ng-gta-v').setValue('modding-gta-v').setEmoji('🔰')
            );
            await interaction.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] });
            await interaction.reply({ content: '✅ Wysłano!', ephemeral: true });
        }
        if (interaction.customId === 'podanieSetupModal') {
            const desc = interaction.fields.getTextInputValue('podanieDesc');
            const embed = new EmbedBuilder().setColor(MAIN_COLOR).setTitle('📝 Wybierz rangę do podania').setDescription(`${desc}\n\n**HØPE $TØRE**`);
            const select = new StringSelectMenuBuilder().setCustomId('podanieCategorySelect').setPlaceholder('Kliknij tutaj...').addOptions(
                new StringSelectMenuOptionBuilder().setLabel('𝐓𝐞𝐬𝐭-𝐌𝐨𝐝🔹').setValue('test-mod').setEmoji('🔹'),
                new StringSelectMenuOptionBuilder().setLabel('𝐌𝐨𝐝𝐞𝐫𝐚𝐭𝐨𝐫 🚩').setValue('moderator').setEmoji('🚩'),
                new StringSelectMenuOptionBuilder().setLabel('𝐀𝐝𝐦𝐢𝐧𝐢𝐬𝐭𝐫𝐚𝐭𝐨𝐫❗').setValue('administrator').setEmoji('❗'),
                new StringSelectMenuOptionBuilder().setLabel('𝐉𝐮𝐧𝐢𝐨𝐫-𝐌𝐨𝐝💫').setValue('junior-mod').setEmoji('💫'),
                new StringSelectMenuOptionBuilder().setLabel('𝐂𝐨-𝐎𝐰𝐧𝐞𝐫🔸').setValue('co-owner').setEmoji('🔸'),
                new StringSelectMenuOptionBuilder().setLabel('𝐒𝐩𝐫𝐳𝐞𝐝𝐚𝐰𝐜𝐚💸').setValue('sprzedawca').setEmoji('💸'),
                new StringSelectMenuOptionBuilder().setLabel('𝐓𝐞𝐜𝐡𝐧𝐢𝐤🔧').setValue('technik').setEmoji('🔧')
            );
            await interaction.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] });
            await interaction.reply({ content: '✅ Wysłano!', ephemeral: true });
        }
        // ... (Reszta modal submit - bez zmian) ...
        if (interaction.customId === 'restockModal') {
            const cs2_nfa = interaction.fields.getTextInputValue('cs2_nfa');
            const cs2_fa = interaction.fields.getTextInputValue('cs2_fa');
            const rust_nfa = interaction.fields.getTextInputValue('rust_nfa');
            const rust_fa = interaction.fields.getTextInputValue('rust_fa');
            const ch = interaction.guild.channels.cache.find(c => c.name === CHANNEL_RESTOCK);
            if (ch) {
                let desc = '# r3støck\n\n';
                if (cs2_nfa || cs2_fa) { desc += '## 🎮 CS2 Account\n'; if (cs2_nfa) desc += `📦・ NFA Konto: x${cs2_nfa}\n`; if (cs2_fa) desc += `📦・ FA Konto: x${cs2_fa}\n`; }
                if (rust_nfa || rust_fa) { desc += '## 🌲 Rust Account\n'; if (rust_nfa) desc += `📦・ NFA Konto: x${rust_nfa}\n`; if (rust_fa) desc += `📦・ FA Konto: x${rust_fa}\n`; }
                await ch.send({ embeds: [new EmbedBuilder().setColor(MAIN_COLOR).setDescription(desc)] });
                await interaction.reply({ content: '✅ Wysłano!', ephemeral: true });
            }
        }
        if (interaction.customId === 'regulaminModal') {
            const now = new Date();
            const dateStr = now.toLocaleString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }).replace(',', '');
            const embed = new EmbedBuilder()
                .setColor(MAIN_COLOR)
                .setTitle(interaction.fields.getTextInputValue('regulaminTytul'))
                .setDescription(interaction.fields.getTextInputValue('regulaminTresc'))
                .setFooter({ text: `Zarządzanie | HØPE $TØRE • ${dateStr}` });
            await interaction.channel.send({ embeds: [embed] });
            await interaction.reply({ content: '✅ Wysłano!', ephemeral: true });
        }
        if (interaction.customId === 'weryfikacjaModal') {
            const btn = new ButtonBuilder().setCustomId('verifyButton').setLabel('Zweryfikuj się').setEmoji('👥').setStyle(ButtonStyle.Secondary);
            await interaction.channel.send({ embeds: [new EmbedBuilder().setColor(MAIN_COLOR).setTitle('Weryfikacja').setDescription(`${interaction.fields.getTextInputValue('weryfikacjaTresc')}\n\n**HØPE $TØRE**`)], components: [new ActionRowBuilder().addComponents(btn)] });
            await interaction.reply({ content: '✅ Wysłano!', ephemeral: true });
        }
        if (interaction.customId === 'wiadomoscModal') {
            const e = new EmbedBuilder().setColor(MAIN_COLOR).setDescription(interaction.fields.getTextInputValue('wiadomoscTresc'));
            if (interaction.fields.getTextInputValue('wiadomoscTytul')) e.setTitle(interaction.fields.getTextInputValue('wiadomoscTytul'));
            await interaction.channel.send({ embeds: [e] });
            await interaction.reply({ content: '✅ Wysłano!', ephemeral: true });
        }
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'openActivateModal') {
            const modal = new ModalBuilder().setCustomId('activateKeyModal').setTitle('Aktywacja Klucza');
            const keyInput = new TextInputBuilder().setCustomId('keyInput').setLabel("Wpisz swój klucz").setStyle(TextInputStyle.Short).setPlaceholder('KEY-XXXXX').setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(keyInput));
            await interaction.showModal(modal);
        }

        if (interaction.customId === 'verifyButton') {
            const num1 = Math.floor(Math.random() * 10) + 1;
            const num2 = Math.floor(Math.random() * 10) + 1;
            const isAddition = Math.random() > 0.5;
            
            let question = '';
            let answer = 0;

            if (isAddition) {
                question = `${num1} + ${num2}`;
                answer = num1 + num2;
            } else {
                const max = Math.max(num1, num2);
                const min = Math.min(num1, num2);
                question = `${max} - ${min}`;
                answer = max - min;
            }

            const modal = new ModalBuilder()
                .setCustomId(`verifyMathModal_${answer}`)
                .setTitle('Weryfikacja Anty-Bot');

            const answerInput = new TextInputBuilder()
                .setCustomId('mathAnswer')
                .setLabel(`Ile to jest: ${question}?`)
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(answerInput));
            await interaction.showModal(modal);
        }
        if (interaction.customId.startsWith('createPodanie_')) {
            const categoryValue = interaction.customId.split('_')[1];
            const categoryNames = {
                'test-mod': '𝐓𝐞𝐬𝐭-𝐌𝐨𝐝🔹',
                'junior-mod': '𝐉𝐮𝐧𝐢𝐨𝐫-𝐌𝐨𝐝💫',
                'moderator': '𝐌𝐨𝐝𝐞𝐫𝐚𝐭𝐨𝐫 🚩',
                'administrator': '𝐀𝐝𝐦𝐢𝐧𝐢𝐬𝐭𝐫𝐚𝐭𝐨𝐫❗',
                'co-owner': '𝐂𝐨-𝐎𝐰𝐧𝐞𝐫🔸',
                'sprzedawca': '𝐒𝐩𝐫𝐳𝐞𝐝𝐚𝐰𝐜𝐚💸',
                'technik': '𝐓𝐞𝐜𝐡𝐧𝐢𝐤🔧'
            };
            const categoryLabel = categoryNames[categoryValue] || categoryValue;

            const existing = interaction.guild.channels.cache.find(c => c.name.startsWith('podanie-') && c.name.includes(interaction.user.username.toLowerCase()));
            if (existing) return interaction.reply({ content: '❌ Masz już otwarte podanie!', ephemeral: true });
            try {
                const ch = await interaction.guild.channels.create({
                    name: `podanie-${categoryValue}-${interaction.user.username}`,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                    ]
                });
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('closeTicket').setLabel('Zamknij').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('deleteTicket').setLabel('Usuń').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
                );
                await ch.send({
                    content: `<@${interaction.user.id}>`,
                    embeds: [
                        new EmbedBuilder()
                            .setColor(MAIN_COLOR)
                            .setTitle(`Podanie #${podanieCounter++} - ${categoryLabel}`)
                            .setDescription(`👤 Ranga: **${categoryLabel}**\nZaraz ktoś z administracji rozpatrzy Twoje podanie.\n\n**HØPE $TØRE**`)
                    ],
                    components: [row]
                });
                await interaction.reply({ content: `✅ Otwarto: <#${ch.id}>`, ephemeral: true });
            } catch (e) { console.error(e); }
        }
        if (interaction.customId.startsWith('createTicket_')) {
            const categoryValue = interaction.customId.split('_')[1];
            const categoryNames = {
                'item-finder': 'it3m-f1nd3r',
                'spambot': 'sp4m-bøt',
                'd3koracje': 'd3køracje',
                'cheaty-cs2': 'che4ty-cs2',
                'cheaty-roblox': 'che4ty-røbløx',
                'social-boosting': 'søcial-bøøsting',
                'social-upgrade': 'søcial-upgr4de',
                'konta-fortnite': 'kønta-førtnite',
                'konta-cs2': 'kønta-cs2',
                'konta-gta-v': 'kønta-gta-v',
                'konta-rust': 'kønta-rust',
                'wyswietlenia': 'wyświ3tleni4・guns-løl',
                'perfumy': 'p3rfumy',
                'serwery-dc': 'serwery-dc-na-zamøw1enie',
                'skiny-cs': 'sk1ny・wym1any・cs',
                'serwery-mc': 'serw3ry・mc',
                'mody-mc': 'mødy・mc',
                'roblox-ity': 'røbløx-1ty',
                'pluginy-skrypty-mc': 'plug1ny・skrypty・mc',
                'premium-mc': 'prem1um・m1necr4ft',
                'modding-gta-v': '🔰・mødd1ng-gta-v'
            };
            const categoryLabel = categoryNames[categoryValue] || categoryValue;

            const existing = interaction.guild.channels.cache.find(c => c.name.startsWith('ticket-') && c.name.includes(interaction.user.username.toLowerCase()));
            if (existing) return interaction.reply({ content: '❌ Masz już ticket!', ephemeral: true });
            try {
                const ch = await interaction.guild.channels.create({
                    name: `ticket-${categoryValue}-${interaction.user.username}`,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                    ]
                });
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('closeTicket').setLabel('Zamknij').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('deleteTicket').setLabel('Usuń').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
                );
                await ch.send({
                    content: `<@${interaction.user.id}>`,
                    embeds: [
                        new EmbedBuilder()
                            .setColor(MAIN_COLOR)
                            .setTitle(`Ticket #${ticketCounter++} - ${categoryLabel}`)
                            .setDescription(`👤 Kategoria: **${categoryLabel}**\nZaraz ktoś z administracji się z Tobą skontaktuje.\n\n**HØPE $TØRE**`)
                    ],
                    components: [row]
                });
                await interaction.reply({ content: `✅ Otwarto: <#${ch.id}>`, ephemeral: true });
            } catch (e) { console.error(e); }
        }
        if (interaction.customId === 'closeTicket') { await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: false }); await interaction.reply('🔒 Zamknięto.'); }
        if (interaction.customId === 'deleteTicket') { await interaction.reply('🗑️ Usuwanie...'); setTimeout(() => interaction.channel.delete().catch(() => { }), 5000); }
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'ticketCategorySelect') {
        const btn = new ButtonBuilder().setCustomId(`createTicket_${interaction.values[0]}`).setLabel('Stwórz Ticket').setEmoji('🎫').setStyle(ButtonStyle.Success);
        await interaction.reply({ components: [new ActionRowBuilder().addComponents(btn)], ephemeral: true });
    }
    if (interaction.isStringSelectMenu() && interaction.customId === 'podanieCategorySelect') {
        const btn = new ButtonBuilder().setCustomId(`createPodanie_${interaction.values[0]}`).setLabel('Napisz Podanie').setEmoji('📝').setStyle(ButtonStyle.Success);
        await interaction.reply({ components: [new ActionRowBuilder().addComponents(btn)], ephemeral: true });
    }
});

client.on('guildMemberAdd', async member => {
    const channel = member.guild.channels.cache.find(c => c.name === CHANNEL_LOBBY);
    if (!channel) return;

    const memberCount = member.guild.memberCount;
    const welcomeEmbed = new EmbedBuilder()
        .setAuthor({ name: `Witamy na ${member.guild.name}!`, iconURL: member.guild.iconURL({ dynamic: true }) })
        .setTitle('🏡 Nowy użytkownik!')
        .setDescription(`➤ Witaj <@${member.id}> na **HØPE $TØRE**\n➤ Jesteś **${memberCount}** osobą na naszym serwerze\n➤ mamy nadzieje ze zostaniesz z nami na dluzej`)
        .setColor(MAIN_COLOR)
        .setTimestamp();

    if (WELCOME_BANNER && WELCOME_BANNER.startsWith('http')) {
        welcomeEmbed.setImage(WELCOME_BANNER);
    }

    await channel.send({ embeds: [welcomeEmbed] });
});

client.login(TOKEN);
