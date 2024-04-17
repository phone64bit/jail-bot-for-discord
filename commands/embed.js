const Discord = require('discord.js');
const embedcooldowncommand = new Map();
const client = new Discord.Client({intents: [Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.GuildIntegrations, Discord.GatewayIntentBits.GuildMembers, Discord.GatewayIntentBits.GuildMessages]});
const DBL = require('dblapi.js');
const config = require("../config.json");
const dbl = new DBL(config.dbltoken, client);

module.exports = {
    data: new Discord.SlashCommandBuilder()
    .setName('embed')
    .setDescription('Send messages that you type in embed')
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
        if(embedcooldowncommand.has(interaction.user.id)) {
            const embed = new Discord.EmbedBuilder()
            .setDescription('💬 You need to wait 60 seconds before execute this command again!')
            .setColor(0x00FFFF)
            interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
           return;
        };
        if(interaction.options.getString('message').length > 2048) {
            const embed = new Discord.EmbedBuilder()
             .setDescription('💬 Your messages must be between 1 and 2048 character length')
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
                 .setDescription('⚠️ I Don\'t have Permission to do that! `No Permission Send messages in Target Channel!`')
                 .setColor(0xFFCC00)
                 interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                return;
            };
            if(!chtarget.permissionsFor(interaction.guild.members.me).has(Discord.PermissionFlagsBits.EmbedLinks)) {
                const embed = new Discord.EmbedBuilder()
                 .setDescription('⚠️ I Don\'t have Permission to do that! `No Permission Embed links in Target Channel!`')
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
                    const embed = new Discord.EmbedBuilder()
                    .setDescription(interaction.options.getString('message'))
                    .setColor(0x00FFFF)
                    .setFooter({text: `Send by ${interaction.user.tag}`, iconURL: interaction.user.avatarURL({size: 1024})})
                    interaction.channel.send({embeds: [embed]}).catch(err => {console.log(`embed error 1 0-> ${err}`)});
                    console.log(`Successful send embed ${interaction.options.getString('message')} at ${interaction.guild.name}`)
                    embedcooldowncommand.set(interaction.user.id);
                    console.log(`[EMBEDCOOLDOWN] ADD ${interaction.user.tag}(${interaction.user.id})`);
                    setTimeout(() => {
                        embedcooldowncommand.delete(interaction.user.id)
                        console.log(`[EMBEDCOOLDOWN] REMOVE ${interaction.user.tag}(${interaction.user.id})`)
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
                    const embed = new Discord.EmbedBuilder()
                    .setDescription(interaction.options.getString('message').split(`<#${chtarget.id}>`).join(''))
                    .setColor(0x00FFFF)
                    .setFooter({text: `Send by ${interaction.user.tag}`, iconURL: interaction.user.avatarURL({size: 1024})})
                    chtarget.send({embeds:[embed]}).catch(err => {console.log(`embed error 1 0-> ${err}`)});
                    console.log(`Successful send embed ${interaction.options.getString('message')} at ${interaction.guild.name}`)
                    embedcooldowncommand.set(interaction.user.id);
                    console.log(`[EMBEDCOOLDOWN] ADD ${interaction.user.tag}(${interaction.user.id})`);
                    setTimeout(() => {
                        embedcooldowncommand.delete(interaction.user.id)
                        console.log(`[EMBEDCOOLDOWN] REMOVE ${interaction.user.tag}(${interaction.user.id})`)
                    },60000);
                };
                if(!voted) {
                    const embed = new Discord.EmbedBuilder()
                    .setDescription(`⚠️ You need to upvote me before using this command!`)
                    .setColor(0xFFCC00)
                    interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                    console.log(`${interaction.user.tag} DIDN'T VOTE`);
                };
            });
            return;
        };
    }
};