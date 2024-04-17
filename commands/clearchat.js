const Discord = require('discord.js');
const phFunction = require('../function/main.js');
const clearchatcooldowncommand = new Map();

module.exports = {
    data: new Discord.SlashCommandBuilder()
    .setName('clearchat')
    .setDescription('Clearchat in the channel')
    .addIntegerOption(o => o.setName('amount').setDescription('specify amount').setRequired(true).setMinValue(2).setMaxValue(100)),
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
        if(!interaction.guild.members.me.permissions.has(Discord.PermissionFlagsBits.ManageMessages)) {
            const embed = new Discord.EmbedBuilder()
            .setDescription('❌ Sorry, I Don\'t have Permission! `Manage Messages`')
            .setColor(0xFF0000)
            interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
            return;
        };
        Promise.all([phFunction.getCategoryID(interaction), phFunction.getPoliceRoles(interaction)]).then(async(promiseResult) => {
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
            if(clearchatcooldowncommand.has(interaction.user.id)) {
                const embed = new Discord.EmbedBuilder()
                 .setDescription('💬 You need to wait 15 seconds before execute this command again!')
                 .setColor(0x00FFFF)
                interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                return
            };
            var getClearchatValues = interaction.options.getInteger('amount');
            if(!getClearchatValues || getClearchatValues < 2 || getClearchatValues > 100) {
                const embed = new Discord.EmbedBuilder()
                .setDescription('⚠️ You need to specify amount in number! `2-100`')
                .setColor(0xFFCC00)
                interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
               return;
            };
            if(isNaN(getClearchatValues)) {
                const embed = new Discord.EmbedBuilder()
                 .setDescription('⚠️ You can put only number! `2-100`')
                 .setColor(0xFFCC00)
                 interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                return;
            };
            interaction.channel.bulkDelete(getClearchatValues, true)
            .then(deleted => {
                const embed = new Discord.EmbedBuilder()
                 .setDescription(`✅ Successful! Deleted \`${deleted.size}\` messages!`)
                 .setFooter({text: interaction.user.tag + ' | REQUESTED', iconURL: interaction.user.avatarURL({size: 1024})})
                 .setColor(0x00FF00)
               interaction.channel.send({embeds: [embed]})
           .catch(deleted => {console.log(interaction.user.tag + 'Failed ' + deleted), interaction.editReply(`Error! --> ${deleted} Contact Developer!`).catch(err => {console.error(err)})})});
            clearchatcooldowncommand.set(interaction.user.id);
            console.log(`[CLEARCHATCOOLDOWN] ADD ${interaction.user.tag}(${interaction.user.id})`);
            setTimeout(() => {
                clearchatcooldowncommand.delete(interaction.user.id);
                console.log(`[CLEARCHATCOOLDOWN] REMOVED ${interaction.user.tag}(${interaction.user.id})`);
            },15000);
        });
    }
};