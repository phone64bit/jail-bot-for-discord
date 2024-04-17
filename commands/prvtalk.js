const Discord = require('discord.js');
const phFunction = require('../function/main.js');

module.exports = {
    data: new Discord.SlashCommandBuilder()
    .setName('prvtalk')
    .setDescription('Create a private voice channel')
    .addUserOption(o => o.setName('user').setDescription('mention user or specify user id').setRequired(true)),
    async execute(interaction) {
        if(!interaction.guild.members.me.permissions.has(Discord.PermissionFlagsBits.EmbedLinks)) {
            interaction.editReply({content: '❌ Sorry, I Don\'t have Permission! `Embed Links`', ephemeral: true}).catch(err => {console.error(err)})
            return;
        };
        if(!interaction.guild.members.me.permissions.has(Discord.PermissionFlagsBits.ManageRoles)) {
            const embed = new Discord.EmbedBuilder()
            .setDescription('❌ Sorry, I Don\'t have Permission! `Manage Roles`')
            .setColor(0xFF0000)
            interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
            return;
        };
        if(!interaction.guild.members.me.permissions.has(Discord.PermissionFlagsBits.ManageChannels)) {
            const embed = new Discord.EmbedBuilder()
            .setDescription('❌ Sorry, I Don\'t have Permission! `Manage Channels`')
            .setColor(0xFF0000)
            interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
            return;
        };
        Promise.all([phFunction.getCategoryID(interaction), phFunction.getPoliceRoles(interaction)]).then(async promiseResult => {
            var getCategoryID = promiseResult[0];
            var getPoliceRolesID = promiseResult[1];
            if(!await phFunction.checkPermission(interaction)) {
                const embed = new Discord.EmbedBuilder()
                 .setDescription('⛔ You don\'t have Permission to do this! `Need Police role or administrator!`')
                 .setColor(0xFF0000)
                interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                return;
            }; 
            phFunction.checkCategory(interaction, getCategoryID, getPoliceRolesID);
            let target = interaction.options.getUser('user');
            if(!target) {
                const embed = new Discord.EmbedBuilder()
                .setDescription('💬 You need to specify `@user` or `user id` after command!')
                .setColor(0x00FFFF)
               interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
               return;
            };
            if(!interaction.guild.members.cache.get(target.id)) {
                const embed = new Discord.EmbedBuilder()
                .setDescription('⚠️ You can\'t private talk with that user! `Can\'t find in this server` ')
                .setColor(0xFFCC00)
                interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
               return;
            };
            if(target.id === interaction.user.id) {
                const embed = new Discord.EmbedBuilder()
                .setDescription('⚠️ You can\'t private talk with yourself ')
                .setColor(0xFFCC00)
                interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
               return;
            };
            interaction.guild.channels.create({name: `${target.tag}`, type: Discord.ChannelType.GuildVoice}).then(async channel => {
                await channel.permissionOverwrites.edit(interaction.guild.members.me.user.id, {ViewChannel: true, Connect: true});
                await channel.setParent(interaction.guild.channels.cache.find(ch => ch.id === getCategoryID && ch.type === Discord.ChannelType.GuildCategory) ? interaction.guild.channels.cache.find(ch => ch.id === getCategoryID && ch.type === Discord.ChannelType.GuildCategory) : interaction.guild.channels.cache.find(ch => ch.name.toLowerCase().includes('prison') && ch.type === Discord.ChannelType.GuildCategory));
                await channel.permissionOverwrites.edit(target.id, {ViewChannel: true, Speak: true, Connect: true});
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {ViewChannel: false, Connect: false});
                await channel.permissionOverwrites.edit(interaction.user.id, {ViewChannel: true, Speak: true, Connect: true});
                if(getPoliceRolesID == undefined) {
                    getPoliceRolesID = (interaction.guild.roles.cache.find(r => r.name.toLowerCase().includes('police'))) ? [interaction.guild.roles.cache.find(r => r.name.toLowerCase().includes('police'))] : [];
                };
                getPoliceRolesID.forEach(async (role) => {
                    await channel.permissionOverwrites.edit(role, {ViewChannel: true, Speak: true});
                });
            console.log(`Create voice channel that called ${channel.name} successful!`)
            const addprvvoicefinish = new Discord.EmbedBuilder()
             .setDescription(`✅ Successful create <#${channel.id}>!`)
             .setFooter({text:`${interaction.user.tag} | REQUESTED`, iconURL: interaction.user.avatarURL({size: 1024})})
             .setColor(0x00FF00)
            interaction.editReply({embeds: [addprvvoicefinish]}).catch(err => {console.error(err)})
            }).catch(err => {console.log(`Getting prvtalk error ${err}! Code --> 0301-C`)})
        });
    }
};