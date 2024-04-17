const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const mcbcooldowncommand = new Map();
const client = new Discord.Client({intents: [Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.GuildIntegrations, Discord.GatewayIntentBits.GuildMembers, Discord.GatewayIntentBits.GuildMessages]});
const DBL = require('dblapi.js');
const config = require("../config.json");
const dbl = new DBL(config.dbltoken, client);

module.exports = {
    data: new SlashCommandBuilder()
    .setName('mcb')
    .setDescription('Send messages that you type in multiline code block')
    .addStringOption(o => o.setName('message').setDescription('Specify messages').setRequired(true))
    .addChannelOption(o => o.setName('channel').setDescription('Send to target channel')),
    async execute(interaction) {
        if(!interaction.guild.members.me.permissions.has(Discord.PermissionFlagsBits.EmbedLinks)) {
            interaction.editReply({content: '❌ Sorry, I Don\'t have Permission! `Embed Links`', ephemeral: true}).catch(err => {console.error(err)})
            return;
        };
        if(!interaction.member.permissions.has(Discord.PermissionFlagsBits.ManageGuild)) {
            const embed = new Discord.EmbedBuilder()
            .setDescription('⛔ You don\'t have permission to do this! `Manage Server`')
            .setColor(0xFF0000)
            interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
            return;
        };
        if(mcbcooldowncommand.has(interaction.user.id)) {
            const embed = new Discord.EmbedBuilder()
            .setDescription('💬 You need to wait 60 seconds before execute this command again!')
            .setColor(0x00FFFF)
            interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
           return;
        };
        if(interaction.options.getString('message').length > 1024) {
            const embed = new Discord.EmbedBuilder()
             .setDescription('💬 Your messages must be between 1 and 1024 character length')
             .setColor(0x00FFFF)
             interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
            return;
        };
        let chtarget = interaction.options.getChannel('channel');
        if(chtarget) {
            if(!chtarget.permissionsFor(interaction.guild.members.me).has(Discord.PermissionFlagsBits.ViewChannel)) {
                const embed = new Discord.EmbedBuilder()
                 .setDescription('⚠️ I Don\'t have Permission to do that! `No Permission in Target Channel!`')
                 .setColor(0xFFCC00)
                 interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                return;
            };
            if(!chtarget.permissionsFor(interaction.guild.members.me).has(Discord.PermissionFlagsBits.SendMessages)) {
                const embed = new Discord.EmbedBuilder()
                 .setDescription('⚠️ I Don\'t have Permission to do that! `No Permission send messages in Target Channel!`')
                 .setColor(0xFFCC00)
                 interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                return;
            };
            if(!chtarget.permissionsFor(interaction.guild.members.me).has(Discord.PermissionFlagsBits.EmbedLinks)) {
                const embed = new Discord.EmbedBuilder()
                 .setDescription('⚠️ I Don\'t have Permission to do that! `No Permission embed links in Target Channel!`')
                 .setColor(0xFFCC00)
                 interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                return;
            };
            if(!chtarget.type === Discord.ChannelType.GuildText) {
                const embed = new Discord.EmbedBuilder()
                 .setDescription('⚠️ Can\'t send to ' + chtarget.toString() + '`Not text channel`')
                 .setColor(0xFFCC00)
                 interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                return;
            };
        };

        if(!chtarget) {
        dbl.hasVoted(interaction.user.id).then(voted => {
                if(voted) {
                    interaction.channel.send(`\`\`\`${interaction.options.getString('message')}\`\`\``).catch(err => {console.log(`send error 1 0-> ${err}`)});
                    console.log(`Successful send ${interaction.options.getString('message')} at ${interaction.guild.name}`)
                    mcbcooldowncommand.set(interaction.user.id);
                    console.log(`[MCBCOOLDOWN] ADD ${interaction.user.tag}(${interaction.user.id})`);
                    setTimeout(() => {
                        mcbcooldowncommand.delete(interaction.user.id)
                        console.log(`[MCBCOOLDOWN] REMOVE ${interaction.user.tag}(${interaction.user.id})`)
                    },60000);
                };
                if(!voted) {
                    const embed = new Discord.EmbedBuilder()
                    .setDescription(`⚠️ You need to upvote me before using this command!`)
                    .setColor(0xFFCC00)
                    interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                console.log(`${interaction.user.tag} DIDN'T VOTE`)
                };
            });
            return;
        };
        if(chtarget) {
            dbl.hasVoted(interaction.user.id).then(voted => {
                if(voted) {
                    chtarget.send(`\`\`\`${interaction.options.getString('message')}\`\`\``).catch(err => {console.log(`send error 1 0-> ${err}`)});
                    console.log(`Successful send embed ${interaction.options.getString('message')} at ${interaction.guild.name}`)
                    mcbcooldowncommand.set(interaction.user.id);
                    console.log(`[MCBCOOLDOWN] ADD ${interaction.user.tag}(${interaction.user.id})`);
                    setTimeout(() => {
                        mcbcooldowncommand.delete(interaction.user.id)
                        console.log(`[MCBCOOLDOWN] REMOVE ${interaction.user.tag}(${interaction.user.id})`)
                    },60000);
                };
                if(!voted) {
                    const embed = new Discord.EmbedBuilder()
                    .setDescription(`⚠️ You need to upvote me before using this command!`)
                    .setColor(0xFFCC00)
                    interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                console.log(`${interaction.user.tag} DIDN'T VOTE`)
                };
            });
            return;
        };
    }
};