const Discord = require('discord.js');
const phFunction = require('../function/main.js');

module.exports = {
    data: new Discord.SlashCommandBuilder()
    .setName('visit')
    .setDescription('Visit prisoner in the prison cell')
    .addSubcommand(s => s.setName('addperm').setDescription('Add permission to the specify prison cell').addUserOption(o => o.setName('user').setDescription('mention user or specify user id').setRequired(true)).addChannelOption(o=>o.setName('prison').setDescription('mention prison cell or specify prison cell id').setRequired(true)))
    .addSubcommand(s => s.setName('removeperm').setDescription('Remove permission to the specify prison cell').addUserOption(o => o.setName('user').setDescription('mention user or specify user id').setRequired(true)).addChannelOption(o=>o.setName('prison').setDescription('mention prison cell or specify prison cell id').setRequired(true))),
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
            if(!interaction.options.getUser('user')) {
                const embed = new Discord.EmbedBuilder()
                 .setDescription('💬 You need to specify `@user` or `user id` after commands.')
                 .setColor(0x00FFFF)
                 interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                return;
            };
            if(!interaction.options.getChannel('prison')) {
                const embed = new Discord.EmbedBuilder()
                 .setDescription('💬 You need to specify `#channel` or `channel id` after commands.')
                 .setColor(0x00FFFF)
                 interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                return;
            };
            let target = interaction.guild.members.cache.get(interaction.options.getUser('user').id);
            let chtarget = interaction.guild.channels.cache.get(interaction.options.getChannel('prison').id);
            if(!target) {
                const embed = new Discord.EmbedBuilder()
                 .setDescription('⚠️ You can\'t do that user! `Can\'t find in this server` ')
                 .setColor(0xFFCC00)
                 interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                return;
            };
            if(!chtarget) {
                const embed = new Discord.EmbedBuilder()
                 .setDescription('💬 You need to mentions channel! `in prison category`')
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
            if(target.id === interaction.user.id) {
                const embed = new Discord.EmbedBuilder()
                 .setDescription('⚠️ You can\'t do it for yourself!')
                 .setColor(0xFFCC00)
                 interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                return;
            };
            if(chtarget.parent.id !== getCategoryID || !chtarget.parent) {
                const embed = new Discord.EmbedBuilder()
                 .setDescription('⚠️ You can\'t do any action in another category! `Not in prison catetory`')
                 .setColor(0xFFCC00)
                 interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                return;
            };
            if(chtarget.type !== Discord.ChannelType.GuildText) {
                const embed = new Discord.EmbedBuilder()
                 .setDescription('⚠️ Can\'t do any action to ' + chtarget.toString() + '`Not text channel`')
                 .setColor(0xFFCC00)
                 interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                return;
            };
            if(interaction.options.getSubcommand() === 'addperm') {
                chtarget.permissionOverwrites.edit(target, {ViewChannel: true,  SendMessages: true});
                const addpermfinish = new Discord.EmbedBuilder()
                 .setDescription(':white_check_mark: Add permission for ' + target.toString() + '! in channel ' + chtarget.toString() + '!')
                 .setFooter({text: interaction.user.tag + ' | REQUESTED!', iconURL: interaction.user.avatarURL({size: 1024})})
                 .setColor(0x00FFFF)
                 interaction.editReply({embeds: [addpermfinish]}).catch(err => {console.error(err)});
                console.log(`visit add ${target.user.tag}(${target.user.id}) at ${interaction.guild.name}(${interaction.guild.id})`);
                return;
            };
            if(interaction.options.getSubcommand() === 'removeperm') {
                if(chtarget.permissionsFor(target.id).has(Discord.PermissionFlagsBits.SendMessages && Discord.PermissionFlagsBits.ViewChannel) == false) {
                    const embed = new Discord.EmbedBuilder()
                     .setDescription('⚠️ You need to add permission to ' + target.toString() + ' first!')
                     .setColor(0xFFCC00)
                     interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                    return;
                };
                chtarget.permissionOverwrites.delete(target);
                const removepermfinish = new Discord.EmbedBuilder()
                .setDescription(':white_check_mark: Remove permission ' + target.toString() + '! in channel ' + chtarget.toString() + '!')
                .setFooter({text: interaction.user.tag + ' | REQUESTED!', iconURL: interaction.user.avatarURL({size: 1024})})
                .setColor(0x00FFFF)
                interaction.editReply({embeds: [removepermfinish]}).catch(err => {console.error(err)});
                console.log(`visit remove ${target.user.tag}(${target.user.id}) at ${interaction.guild.name}(${interaction.guild.id})`);
                return;
            };
        });
    }
};