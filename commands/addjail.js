const Discord = require('discord.js');
const phFunction = require('../function/main.js');

module.exports = {
    data: new Discord.SlashCommandBuilder()
    .setName('addjail')
    .setDescription('Add a new Jail')
    .addStringOption(o => o.setName('name').setDescription('Set a jail name').setRequired(true)),
    async execute(interaction) {
        if(!interaction.guild.members.me.permissions.has(Discord.PermissionFlagsBits.EmbedLinks)) {
            interaction.editReply({content: '❌ Sorry, I Don\'t have Permission! `Embed Links`', ephemeral: true}).catch(err => {console.error(err)});
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
        if(!interaction.options.getString('name')) {
            const embed = new Discord.EmbedBuilder()
            .setDescription('💬 You need to put jail name after command!')
            .setColor(0x00FFFF)
            interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
            return;
        };
        if(interaction.options.getString('name').length > 100) {
            const embed = new Discord.EmbedBuilder()
             .setDescription('💬 Your channel name must be between 1 and 100 character length')
             .setColor(0x00FFFF)
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
            interaction.guild.channels.create({type: Discord.ChannelType.GuildText, name: `${interaction.options.getString('name')}`}).then(async channel => {
                await channel.permissionOverwrites.edit(interaction.guild.members.me.user.id, {ViewChannel: true,  SendMessages: true});
                await channel.setParent(interaction.guild.channels.cache.find(ch => ch.id === getCategoryID && ch.type === Discord.ChannelType.GuildCategory) ? interaction.guild.channels.cache.find(ch => ch.id === getCategoryID && ch.type === Discord.ChannelType.GuildCategory) : interaction.guild.channels.cache.find(ch => ch.name.toLowerCase().includes('prison') && ch.type === Discord.ChannelType.GuildCategory));
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {ViewChannel: false});
                await channel.permissionOverwrites.edit(interaction.user.id, {ViewChannel: true,  SendMessages: true});
                if(getPoliceRolesID == undefined) getPoliceRolesID = (interaction.guild.roles.cache.find(r => r.name.toLowerCase().includes('police'))) ? [interaction.guild.roles.cache.find(r => r.name.toLowerCase().includes('police'))] : [];
                getPoliceRolesID.forEach(async (role) => { await channel.permissionOverwrites.edit(role, {ViewChannel: true}); });
            console.log(`successful created ${channel.name} at ${interaction.guild.name}(${interaction.guild.id})!`)
            const addjailfinish = new Discord.EmbedBuilder()
             .setDescription(`✅ Successful create ${channel.toString()}!`)
             .setFooter({text: `${interaction.user.tag} | REQUESTED`, iconURL: interaction.user.avatarURL({dynamic: true, size: 1024})})
             .setColor(0x00FF00)
            interaction.editReply({embeds: [addjailfinish]}).catch(err => {console.error(err)});
            }).catch(err => {console.log(`Error while sending addjailfinish ${err}! Code --> 0300-C`)});
        });
    }
};