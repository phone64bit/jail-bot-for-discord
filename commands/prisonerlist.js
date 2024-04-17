const Discord = require('discord.js');
const phFunction = require('../function/main.js');
const jailuserlist = require('../models/jailuserlist-profile-schema');

module.exports = {
    data: new Discord.SlashCommandBuilder()
    .setName('prisonerlist')
    .setDescription('Show all of prisoners in the server'),
    async execute(interaction) {
        if(!interaction.guild.members.me.permissions.has(Discord.PermissionFlagsBits.EmbedLinks)) {
            interaction.editReply({content: '❌ Sorry, I Don\'t have Permission! `Embed Links`', ephemeral: true}).catch(err => {console.error(err)})
            return;
        };
        Promise.all([phFunction.getPoliceRoles(interaction)]).then(async promiseResult => {
            if(!await phFunction.checkPermission(interaction)) {
                const embed = new Discord.EmbedBuilder()
                 .setDescription('⛔ You don\'t have Permission to do this! `Need Police role or administrator!`')
                 .setColor(0xFF0000)
                interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                return;
            }; 
            const allPrisonerArray = [];
            let prisonercount = 0;
            jailuserlist.find({GuildID: interaction.guild.id}).then(async allprisoner => {
                allprisoner.forEach(async prisoner => {
                    prisonercount = prisonercount + 1;
                    if(!interaction.guild.members.cache.get(prisoner.UserID)) return;
                    if(interaction.guild.members.cache.get(prisoner.UserID)) allPrisonerArray.push(`**${prisonercount}**. ${interaction.guild.members.cache.get(prisoner.UserID).user.tag} **(${interaction.guild.members.cache.get(prisoner.UserID).id})**`);
                });
                let allprisonerlist;
                if(allPrisonerArray.length == 0) allprisonerlist = `**No** \`prisoner\` in this server!`;
                if(allPrisonerArray.length > 0) allprisonerlist = allPrisonerArray.join(`\n`);
                Promise.all(allPrisonerArray);
                const prisonerlistembed = new Discord.EmbedBuilder()
                .setAuthor({name: `${interaction.guild.name} : Prisoners list`, iconURL: interaction.guild.iconURL({size: 1024})})
                .setDescription(`${allprisonerlist}`)
                .setColor(0x00FFFF)
                interaction.editReply({embeds: [prisonerlistembed]}).catch(err => {console.error(err)});
            });
        });
    }
};