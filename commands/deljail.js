const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const phFunction = require('../function/main.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('deljail')
    .setDescription('Delete a specify jail')
    .addChannelOption(o => o.setName('channel').setDescription('mention channel or specify channel id').setRequired(true)),
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
            let chtarget = interaction.guild.channels.cache.get(interaction.options.getChannel('channel').id);
            if(!chtarget) {
                const embed = new Discord.EmbedBuilder()
                 .setDescription('💬 You need to #channel! after command! `in prison category`')
                 .setColor(0x00FFFF)
                 interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                return;
            };
            if(!chtarget.permissionsFor(interaction.guild.members.me.user.id).has(Discord.PermissionFlagsBits.ViewChannel)) {
                const embed = new Discord.EmbedBuilder()
                .setDescription('⚠️ I Don\'t have Permission to do that! `No Permission in Target Channel!`')
                .setColor(0xFFCC00)
                interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                return;
            };
            if(chtarget.parentId !== getCategoryID || !chtarget.parent) {
                const embed = new Discord.EmbedBuilder()
                .setDescription('⚠️ You can\'t delete channel in another category! `Not in prison catetory`')
                .setColor(0xFFCC00)
                interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                return;
            };
            if(chtarget.type !== Discord.ChannelType.GuildText) {
                const embed = new Discord.EmbedBuilder()
                .setDescription('⚠️ Can\'t delete ' + chtarget.toString() + '`Not text channel`')
                .setColor(0xFFCC00)
                interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                return;
            };
            if(!chtarget.deletable) {
                const embed = new Discord.EmbedBuilder()
                .setDescription('⚠️ Can\'t delete ' + chtarget.toString() + '`undeletable`')
                .setColor(0xFFCC00)
                interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                return;
            };
            chtarget.delete(`Deleted by ${interaction.user.tag}`);
            const deletejailfinish = new Discord.EmbedBuilder()
            .setDescription(`✅ Successful delete \`${chtarget.name}\`!`)
            .setFooter({text: `${interaction.user.tag} | REQUESTED`, iconURL: interaction.user.avatarURL({size: 1024})})
            .setColor(0x00FF00)
            interaction.editReply({embeds: [deletejailfinish]}).catch(err => {console.log(`Error while sending deletejailfinish ${err}! Code --> 0300-A`)})
            console.log(`Successful deleted ${chtarget.name}!`);
        });
    }  
};